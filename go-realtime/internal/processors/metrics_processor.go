// Package processors contains the business logic that runs when an event is received.
package processors

import (
	"context"
	"encoding/json"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/recomdash/go-realtime/internal/events"
	"github.com/recomdash/go-realtime/internal/repository"
	"github.com/recomdash/go-realtime/internal/websocket"
)

// MetricsProcessor maintains an in-memory metrics snapshot and recomputes it
// whenever an order event is received.  The updated snapshot is:
//  1. Persisted to Redis via MetricsRepo (survives service restarts).
//  2. Broadcast to all connected WebSocket clients.
type MetricsProcessor struct {
	mu          sync.Mutex
	snapshot    events.MetricsSnapshot
	repo        *repository.MetricsRepo
	hub         *websocket.Hub
	initialized bool
}

// NewMetricsProcessor creates a MetricsProcessor, restoring the last snapshot
// from Redis if one exists.
func NewMetricsProcessor(repo *repository.MetricsRepo, hub *websocket.Hub) *MetricsProcessor {
	p := &MetricsProcessor{
		repo: repo,
		hub:  hub,
	}
	// Attempt to restore persisted snapshot at startup.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if stored, err := repo.Load(ctx); err == nil && stored != nil {
		p.snapshot = *stored
		p.initialized = true
		slog.Info("restored metrics snapshot from redis",
			"totalOrders", stored.TotalOrders,
			"totalRevenue", stored.TotalRevenue,
		)
	}
	return p
}

// HandleOrderCreated updates the snapshot for a newly created order.
func (p *MetricsProcessor) HandleOrderCreated(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	order := evt.Payload

	// Accumulate totals.
	p.snapshot.TotalOrders++
	p.snapshot.TotalRevenue = round2(p.snapshot.TotalRevenue + order.TotalAmount)

	if p.snapshot.TotalOrders > 0 {
		p.snapshot.AvgOrderValue = round2(p.snapshot.TotalRevenue / float64(p.snapshot.TotalOrders))
	}

	if order.Status == "NEW" {
		p.snapshot.NewOrders++
	}

	p.snapshot.RecentOrder = &events.OrderBrief{
		ID:           order.ID,
		OrderNumber:  order.OrderNumber,
		Status:       order.Status,
		TotalAmount:  order.TotalAmount,
		CustomerName: order.CustomerName,
		CreatedAt:    order.CreatedAt,
	}
	p.snapshot.UpdatedAt = time.Now()

	return p.persistAndBroadcast(ctx, events.WSTypeOrderCreated, order)
}

// HandleOrderUpdated adjusts the snapshot when an existing order changes.
func (p *MetricsProcessor) HandleOrderUpdated(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.snapshot.UpdatedAt = time.Now()
	p.snapshot.RecentOrder = &events.OrderBrief{
		ID:           evt.Payload.ID,
		OrderNumber:  evt.Payload.OrderNumber,
		Status:       evt.Payload.Status,
		TotalAmount:  evt.Payload.TotalAmount,
		CustomerName: evt.Payload.CustomerName,
		CreatedAt:    evt.Payload.CreatedAt,
	}

	return p.persistAndBroadcast(ctx, events.WSTypeOrderUpdated, evt.Payload)
}

// HandleOrderDeleted rolls back an order's contribution from the snapshot.
func (p *MetricsProcessor) HandleOrderDeleted(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	order := evt.Payload

	if p.snapshot.TotalOrders > 0 {
		p.snapshot.TotalOrders--
	}
	p.snapshot.TotalRevenue = round2(p.snapshot.TotalRevenue - order.TotalAmount)
	if p.snapshot.TotalRevenue < 0 {
		p.snapshot.TotalRevenue = 0
	}
	if p.snapshot.TotalOrders > 0 {
		p.snapshot.AvgOrderValue = round2(p.snapshot.TotalRevenue / float64(p.snapshot.TotalOrders))
	} else {
		p.snapshot.AvgOrderValue = 0
	}

	p.snapshot.UpdatedAt = time.Now()

	return p.persistAndBroadcast(ctx, events.WSTypeOrderDeleted, order)
}

// Snapshot returns a copy of the current metrics snapshot (safe for concurrent reads).
func (p *MetricsProcessor) Snapshot() events.MetricsSnapshot {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.snapshot
}

// persistAndBroadcast saves the snapshot and sends two WebSocket messages:
//  1. The full metrics snapshot (for KPI cards).
//  2. A targeted order event (for order-list updates).
func (p *MetricsProcessor) persistAndBroadcast(ctx context.Context, wsType events.WSMessageType, orderPayload events.OrderPayload) error {
	// Persist to Redis (non-blocking to avoid holding the lock too long).
	go func() {
		pCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := p.repo.Save(pCtx, p.snapshot); err != nil {
			slog.Warn("failed to persist metrics snapshot", "error", err)
		}
	}()

	// Broadcast metrics update.
	p.broadcast(events.WSMessage{
		Type:    events.WSTypeMetricsUpdated,
		Payload: p.snapshot,
	})

	// Broadcast the specific order event.
	p.broadcast(events.WSMessage{
		Type:    wsType,
		Payload: orderPayload,
	})

	slog.Info("metrics updated",
		"event", wsType,
		"totalOrders", p.snapshot.TotalOrders,
		"totalRevenue", p.snapshot.TotalRevenue,
	)
	return nil
}

func (p *MetricsProcessor) broadcast(msg events.WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("failed to marshal ws message", "error", err)
		return
	}
	p.hub.Broadcast(data)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
