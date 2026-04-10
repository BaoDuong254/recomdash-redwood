// Package repository provides persistence for the dashboard projection.
// The Go service treats PostgreSQL (via the RedwoodJS API) as the source of
// truth and maintains a derived projection in Redis for fast reads and
// restart recovery.
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
	projectionKey = "dashboard:projection:v1"
	orderIndexKey = "dashboard:projection:order_index"
	projectionTTL = 48 * time.Hour
)

// ---------------------------------------------------------------------------
// InternalProjection — persisted projection state
// ---------------------------------------------------------------------------

// InternalProjection is the full in-memory (and Redis-persisted) state of the
// dashboard projection. It is the canonical persistence format; the
// events.DashboardSnapshot is derived from it on broadcast.
//
// Revenue buckets use string keys:
//   - DailyRevenue:   "YYYY-MM-DD" (last ~60 d kept, last 7 shown)
//   - MonthlyRevenue: "YYYY-MM"    (last ~36 m kept, last 12 shown)
//   - YearlyRevenue:  "YYYY"       (last 6 years shown)
//
// Status counts exclude soft-deleted orders (deletedAt is set before the
// event is published, so deleted orders never appear in the index).
type InternalProjection struct {
	// All-time running totals (not scoped to a time range).
	TotalRevenue float64 `json:"totalRevenue"`
	TotalOrders  int64   `json:"totalOrders"`
	NewOrders    int64   `json:"newOrders"` // orders currently in NEW status

	// Sliding-window revenue buckets (non-CANCELLED only, matching GraphQL).
	DailyRevenue   map[string]float64 `json:"dailyRevenue"`
	MonthlyRevenue map[string]float64 `json:"monthlyRevenue"`
	YearlyRevenue  map[string]float64 `json:"yearlyRevenue"`

	// Status distribution per time range (all statuses including CANCELLED).
	StatusToday map[string]int64 `json:"statusToday"`
	Status7d    map[string]int64 `json:"status7d"`
	Status30d   map[string]int64 `json:"status30d"`
	Status12m   map[string]int64 `json:"status12m"`

	UpdatedAt time.Time `json:"updatedAt"`
	Version   int64     `json:"version"`
}

// NewInternalProjection returns an empty projection with all maps initialised.
func NewInternalProjection() *InternalProjection {
	return &InternalProjection{
		DailyRevenue:   make(map[string]float64),
		MonthlyRevenue: make(map[string]float64),
		YearlyRevenue:  make(map[string]float64),
		StatusToday:    make(map[string]int64),
		Status7d:       make(map[string]int64),
		Status30d:      make(map[string]int64),
		Status12m:      make(map[string]int64),
	}
}

// ensureMaps guarantees all map fields are non-nil after JSON decode.
func (p *InternalProjection) ensureMaps() {
	if p.DailyRevenue == nil {
		p.DailyRevenue = make(map[string]float64)
	}
	if p.MonthlyRevenue == nil {
		p.MonthlyRevenue = make(map[string]float64)
	}
	if p.YearlyRevenue == nil {
		p.YearlyRevenue = make(map[string]float64)
	}
	if p.StatusToday == nil {
		p.StatusToday = make(map[string]int64)
	}
	if p.Status7d == nil {
		p.Status7d = make(map[string]int64)
	}
	if p.Status30d == nil {
		p.Status30d = make(map[string]int64)
	}
	if p.Status12m == nil {
		p.Status12m = make(map[string]int64)
	}
}

// ---------------------------------------------------------------------------
// DashboardRepo
// ---------------------------------------------------------------------------

// DashboardRepo persists the full dashboard projection and the per-order
// contribution index to Redis so the service can recover cleanly on restart.
type DashboardRepo struct {
	client *redis.Client
}

// NewDashboardRepo creates a DashboardRepo backed by the given Redis client.
func NewDashboardRepo(client *redis.Client) *DashboardRepo {
	return &DashboardRepo{client: client}
}

// SaveProjection persists the full InternalProjection, replacing the previous one.
func (r *DashboardRepo) SaveProjection(ctx context.Context, proj *InternalProjection) error {
	data, err := json.Marshal(proj)
	if err != nil {
		return fmt.Errorf("marshal projection: %w", err)
	}
	if err := r.client.Set(ctx, projectionKey, data, projectionTTL).Err(); err != nil {
		return fmt.Errorf("redis SET projection: %w", err)
	}
	return nil
}

// LoadProjection retrieves the stored projection.
// Returns nil, nil when no projection exists yet.
func (r *DashboardRepo) LoadProjection(ctx context.Context) (*InternalProjection, error) {
	data, err := r.client.Get(ctx, projectionKey).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("redis GET projection: %w", err)
	}
	var proj InternalProjection
	if err := json.Unmarshal(data, &proj); err != nil {
		// Incompatible schema after a deploy — discard and rebuild.
		slog.Warn("discarding incompatible projection snapshot, will rebuild", "error", err)
		return nil, nil
	}
	proj.ensureMaps()
	return &proj, nil
}

// SaveOrderRecord upserts a single order's contribution record in the Redis Hash.
// Using HSET per-field makes updates atomic and avoids full-index rewrites.
func (r *DashboardRepo) SaveOrderRecord(ctx context.Context, rec events.OrderRecord) error {
	data, err := json.Marshal(rec)
	if err != nil {
		return fmt.Errorf("marshal order record: %w", err)
	}
	pipe := r.client.Pipeline()
	pipe.HSet(ctx, orderIndexKey, rec.ID, data)
	pipe.Expire(ctx, orderIndexKey, projectionTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("redis HSET order record: %w", err)
	}
	return nil
}

// DeleteOrderRecord removes an order from the contribution index.
func (r *DashboardRepo) DeleteOrderRecord(ctx context.Context, id string) error {
	if err := r.client.HDel(ctx, orderIndexKey, id).Err(); err != nil {
		return fmt.Errorf("redis HDEL order record: %w", err)
	}
	return nil
}

// LoadOrderIndex retrieves all persisted order records.
// Returns an empty (non-nil) map when none are stored.
func (r *DashboardRepo) LoadOrderIndex(ctx context.Context) (map[string]events.OrderRecord, error) {
	raw, err := r.client.HGetAll(ctx, orderIndexKey).Result()
	if err != nil {
		return nil, fmt.Errorf("redis HGETALL order index: %w", err)
	}
	index := make(map[string]events.OrderRecord, len(raw))
	for id, data := range raw {
		var rec events.OrderRecord
		if err := json.Unmarshal([]byte(data), &rec); err != nil {
			slog.Warn("skipping malformed order record in index", "id", id, "error", err)
			continue
		}
		index[id] = rec
	}
	return index, nil
}
