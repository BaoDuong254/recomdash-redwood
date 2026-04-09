package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/recomdash/go-realtime/internal/config"
	"github.com/recomdash/go-realtime/internal/events"
	"github.com/recomdash/go-realtime/internal/handlers"
	"github.com/recomdash/go-realtime/internal/processors"
	redispkg "github.com/recomdash/go-realtime/internal/redis"
	"github.com/recomdash/go-realtime/internal/repository"
	"github.com/recomdash/go-realtime/internal/websocket"
)

func main() {
	// Structured JSON logging — works well with Docker / log aggregators.
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	// -------------------------------------------------------------------------
	// Configuration
	// -------------------------------------------------------------------------
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}
	slog.Info("config loaded", "port", cfg.Port, "env", cfg.Env)

	// -------------------------------------------------------------------------
	// Redis client
	// -------------------------------------------------------------------------
	rdb, err := redispkg.NewClient(cfg.Redis)
	if err != nil {
		slog.Error("failed to connect to Redis", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := rdb.Close(); err != nil {
			slog.Warn("redis client close error", "error", err)
		}
	}()

	// -------------------------------------------------------------------------
	// WebSocket hub
	// -------------------------------------------------------------------------
	hub := websocket.NewHub()
	go hub.Run()

	// -------------------------------------------------------------------------
	// Repository, processor, handler wiring
	// -------------------------------------------------------------------------
	metricsRepo := repository.NewMetricsRepo(rdb)
	metricsProc := processors.NewMetricsProcessor(metricsRepo, hub)

	orderHandler := handlers.NewOrderHandler(metricsProc)

	sub := redispkg.NewSubscriber(rdb)
	sub.Register(events.ChannelOrderCreated, orderHandler.HandleCreated)
	sub.Register(events.ChannelOrderUpdated, orderHandler.HandleUpdated)
	sub.Register(events.ChannelOrderDeleted, orderHandler.HandleDeleted)

	// -------------------------------------------------------------------------
	// Context for graceful shutdown
	// -------------------------------------------------------------------------
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		sig := <-sigCh
		slog.Info("received shutdown signal", "signal", sig.String())
		cancel()
	}()

	// Start Redis subscriber in background.
	go func() {
		if err := sub.Subscribe(ctx); err != nil {
			slog.Error("subscriber exited with error", "error", err)
		}
	}()

	// -------------------------------------------------------------------------
	// HTTP server — WebSocket endpoint + health check
	// -------------------------------------------------------------------------
	mux := http.NewServeMux()

	// WebSocket endpoint: ws://host:PORT/ws
	mux.HandleFunc("/ws", websocket.ServeWS(hub))

	// Health check: GET /health
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "ok",
			"clients":   hub.ClientCount(),
			"timestamp": time.Now().UTC(),
		}); err != nil {
			slog.Warn("health handler encode error", "error", err)
		}
	})

	// Metrics snapshot endpoint: GET /metrics/snapshot
	mux.HandleFunc("/metrics/snapshot", func(w http.ResponseWriter, r *http.Request) {
		snapshot := metricsProc.Snapshot()
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(snapshot); err != nil {
			slog.Warn("snapshot handler encode error", "error", err)
		}
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Shut down the HTTP server when the context is cancelled.
	go func() {
		<-ctx.Done()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		slog.Info("shutting down HTTP server")
		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("HTTP server shutdown error", "error", err)
		}
	}()

	slog.Info("go-realtime service started", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("HTTP server error", "error", err)
		os.Exit(1)
	}

	slog.Info("service stopped")
}
