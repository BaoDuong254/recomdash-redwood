// Package redis wraps go-redis to provide a configured client and Pub/Sub subscriber.
package redis

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/recomdash/go-realtime/internal/config"
)

// NewClient creates and validates a go-redis client using the provided config.
func NewClient(cfg config.RedisConfig) (*redis.Client, error) {
	opts := &redis.Options{
		Addr:         cfg.Addr,
		Username:     cfg.Username,
		Password:     cfg.Password,
		DB:           cfg.DB,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 10 * time.Second,
		PoolSize:     10,
		MinIdleConns: 2,
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	slog.Info("redis connected", "addr", cfg.Addr, "db", cfg.DB)
	return client, nil
}
