// Package repository provides persistence for computed metrics using Redis as a
// fast cache.  The Go service treats the source-of-truth data as owned by
// PostgreSQL (via the RedwoodJS API) and only maintains a derived snapshot here.
package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/recomdash/go-realtime/internal/events"
)

const (
	metricsKey = "dashboard:metrics:snapshot"
	metricsTTL = 24 * time.Hour
)

// MetricsRepo stores and retrieves the dashboard metrics snapshot in Redis.
type MetricsRepo struct {
	client *redis.Client
}

// NewMetricsRepo creates a MetricsRepo backed by the given Redis client.
func NewMetricsRepo(client *redis.Client) *MetricsRepo {
	return &MetricsRepo{client: client}
}

// Save persists a metrics snapshot, replacing the previous one.
func (r *MetricsRepo) Save(ctx context.Context, snapshot events.MetricsSnapshot) error {
	data, err := json.Marshal(snapshot)
	if err != nil {
		return fmt.Errorf("marshal snapshot: %w", err)
	}
	if err := r.client.Set(ctx, metricsKey, data, metricsTTL).Err(); err != nil {
		return fmt.Errorf("redis SET: %w", err)
	}
	return nil
}

// Load retrieves the stored snapshot.  Returns nil, nil when no snapshot exists yet.
func (r *MetricsRepo) Load(ctx context.Context) (*events.MetricsSnapshot, error) {
	data, err := r.client.Get(ctx, metricsKey).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis GET: %w", err)
	}
	var snapshot events.MetricsSnapshot
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return nil, fmt.Errorf("unmarshal snapshot: %w", err)
	}
	return &snapshot, nil
}

// Delete removes the cached snapshot (e.g., to force a full recompute).
func (r *MetricsRepo) Delete(ctx context.Context) error {
	if err := r.client.Del(ctx, metricsKey).Err(); err != nil {
		slog.Warn("failed to delete metrics snapshot", "error", err)
	}
	return nil
}
