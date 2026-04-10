// Package processors contains the business logic that runs when an order event
// is received from Redis Pub/Sub.
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

// dashboardRepo is the persistence surface required by MetricsProcessor.
// *repository.DashboardRepo satisfies this interface; tests can supply stubs.
type dashboardRepo interface {
	LoadProjection(ctx context.Context) (*repository.InternalProjection, error)
	LoadOrderIndex(ctx context.Context) (map[string]events.OrderRecord, error)
	SaveProjection(ctx context.Context, proj *repository.InternalProjection) error
	SaveOrderRecord(ctx context.Context, rec events.OrderRecord) error
	DeleteOrderRecord(ctx context.Context, id string) error
}

// FetchBaselineFn fetches the full set of non-deleted orders from the source
// of truth (Redwood API) so the Go service can bootstrap its projection when
// Redis holds no prior state.
type FetchBaselineFn func(ctx context.Context) ([]events.OrderRecord, error)

// ---------------------------------------------------------------------------
// Status metadata — must match the GraphQL dashboard service ordering/colors.
// ---------------------------------------------------------------------------

type statusMeta struct {
	key   string
	label string
	color string
}

// statusDefs defines the fixed display order and colors for status charts,
// matching api/src/services/dashboard/dashboard.ts getOrderStatus().
var statusDefs = []statusMeta{
	{"FULFILLED", "Fulfilled", "#22c55e"},
	{"PAID", "Paid", "#3b82f6"},
	{"NEW", "New", "#a855f7"},
	{"CANCELLED", "Cancelled", "#ef4444"},
}

// ---------------------------------------------------------------------------
// MetricsProcessor
// ---------------------------------------------------------------------------

// MetricsProcessor maintains an in-memory dashboard projection and recomputes
// it on every order event.  After each update it:
//  1. Persists the full projection to Redis (restart recovery).
//  2. Broadcasts dashboard.updated to all connected WebSocket clients.
//  3. Caches the serialised snapshot for instant delivery to new clients.
//
// # Readiness contract
//
// ready=false is emitted in the dashboard.snapshot message until the
// projection has been hydrated from a reliable source (Redis on restart, or
// the DB bootstrap endpoint on first start / Redis expiry).  Clients MUST
// treat ready=false as "data unavailable" and fall back to their own baseline.
// ready=true is only set after a confirmed successful hydration.
//
// The order contribution index (orderIndex) stores, per order ID, the fields
// that were used in the last contribution so that updates and deletes can
// correctly reverse the previous contribution before applying the new one.
type MetricsProcessor struct {
	mu         sync.Mutex
	proj       *repository.InternalProjection
	orderIndex map[string]events.OrderRecord
	repo       dashboardRepo
	hub        *websocket.Hub
	// cachedJSON holds the pre-serialised dashboard.snapshot message for
	// immediate delivery to new clients via CurrentSnapshotJSON().
	cachedJSON []byte

	// ready is true once the projection has been hydrated from a reliable source.
	ready bool
	// bootstrapSource records which source completed the hydration.
	bootstrapSource string
}

// NewMetricsProcessor creates a MetricsProcessor, restoring the last full
// projection and order index from Redis when available.
//
// Readiness is set to true when Redis provides a non-empty projection or a
// non-empty order index (reliable restart recovery).  When both are absent
// the processor starts with ready=false; call StartBootstrap to hydrate from
// the DB and flip ready=true once the fetch succeeds.
//
// If the stored projection is missing or has an incompatible schema it starts
// fresh and rebuilds status counts from the order index (which is more
// durable than the projection because it uses per-field HSET writes).
func NewMetricsProcessor(repo dashboardRepo, hub *websocket.Hub) *MetricsProcessor {
	p := &MetricsProcessor{
		repo:       repo,
		hub:        hub,
		orderIndex: make(map[string]events.OrderRecord),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Load order index first — it is always the more reliable source.
	idx, err := repo.LoadOrderIndex(ctx)
	if err != nil {
		slog.Warn("could not load order index from redis, starting empty", "error", err)
	} else {
		p.orderIndex = idx
	}

	// Load projection.
	proj, err := repo.LoadProjection(ctx)
	if err != nil || proj == nil {
		if err != nil {
			slog.Warn("could not load projection from redis, rebuilding", "error", err)
		} else {
			slog.Info("no projection snapshot found in redis, starting fresh")
		}
		proj = repository.NewInternalProjection()
		p.proj = proj

		if len(p.orderIndex) > 0 {
			// Index has data — we can rebuild a reliable projection from it.
			p.rebuildFromIndex(time.Now().UTC())
			p.ready = true
			p.bootstrapSource = "redis"
			slog.Info("rebuilt projection from redis order index",
				"indexSize", len(p.orderIndex))
		} else {
			// Both projection and index are absent — projection is uninitialised.
			// Do NOT mark ready; caller must invoke StartBootstrap so the DB
			// provides the real baseline before we trust the data.
			p.ready = false
			p.bootstrapSource = "empty"
			slog.Info("redis empty, projection not ready — awaiting DB bootstrap")
		}
	} else {
		p.proj = proj
		// Always rebuild status counts from the index on startup so time-range
		// boundaries are recalculated with the current clock (handles overnight
		// downtime where "today" orders aged into "7d" etc.).
		p.rebuildStatusCounts(time.Now().UTC())
		p.ready = true
		p.bootstrapSource = "redis"
		slog.Info("restored projection from redis",
			"totalOrders", proj.TotalOrders,
			"totalRevenue", proj.TotalRevenue,
			"indexSize", len(p.orderIndex),
		)
	}

	// Build the initial cached JSON.
	p.rebuildCachedJSON()

	return p
}

// StartBootstrap triggers asynchronous startup reconciliation against the DB.
// It always runs regardless of whether Redis provided a projection:
//
//   - Not ready (empty Redis): performs a full bootstrap to hydrate the
//     projection and flip ready=true.
//   - Already ready (Redis loaded): fetches the DB baseline and compares it
//     against the in-memory projection.  If drift is detected (count or
//     revenue mismatch), the projection is rebuilt from DB and the corrected
//     snapshot is broadcast.  If the projection is in sync, the fast Redis
//     path is preserved with no rebuild.
//
// On fetch failure the loop retries with exponential backoff (2s→4s→…→60s)
// until ctx is cancelled or the reconciliation succeeds.
func (p *MetricsProcessor) StartBootstrap(ctx context.Context, fetchFn FetchBaselineFn) {
	go p.reconcileWithDB(ctx, fetchFn)
}

// reconcileWithDB is the single reconciliation loop used by StartBootstrap.
// It fetches the DB baseline on every startup and either bootstraps the
// projection (not ready) or detects and corrects drift (already ready from Redis).
func (p *MetricsProcessor) reconcileWithDB(ctx context.Context, fetchFn FetchBaselineFn) {
	delay := 2 * time.Second
	const maxDelay = 60 * time.Second

	for {
		select {
		case <-ctx.Done():
			slog.Info("DB reconciliation cancelled by shutdown signal")
			return
		default:
		}

		fetchCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
		orders, err := fetchFn(fetchCtx)
		cancel()

		if err != nil {
			slog.Warn("DB reconciliation fetch failed, will retry",
				"error", err, "retryIn", delay)
			select {
			case <-ctx.Done():
				return
			case <-time.After(delay):
			}
			if delay < maxDelay {
				delay *= 2
			}
			continue
		}

		// Compute DB ground-truth totals for drift detection.
		// TotalRevenue sums all order amounts (same semantics as the projection).
		dbCount := int64(len(orders))
		var dbRevenue float64
		for _, o := range orders {
			dbRevenue = round2(dbRevenue + o.TotalAmount)
		}

		p.mu.Lock()
		wasReady := p.ready
		redisCount := p.proj.TotalOrders
		redisRevenue := p.proj.TotalRevenue
		p.mu.Unlock()

		if wasReady {
			// Projection was restored from Redis — check for staleness.
			// Criteria: any count mismatch OR revenue deviation > $0.01.
			driftCount := dbCount != redisCount
			driftRevenue := math.Abs(dbRevenue-redisRevenue) > 0.01
			if !driftCount && !driftRevenue {
				slog.Info("projection in sync with DB, fast path preserved",
					"orders", dbCount, "revenue", dbRevenue)
				return
			}
			slog.Warn("stale Redis projection detected, rebuilding from DB",
				"redis.orders", redisCount, "db.orders", dbCount,
				"redis.revenue", redisRevenue, "db.revenue", dbRevenue)
		}

		p.applyBootstrap(orders)
		return
	}
}

// applyBootstrap replaces the current projection with DB-fetched data and
// flips ready=true.  Must only be called from bootstrapWithRetry after a
// successful fetch.
func (p *MetricsProcessor) applyBootstrap(orders []events.OrderRecord) {
	now := time.Now().UTC()

	p.mu.Lock()
	p.proj = repository.NewInternalProjection()
	p.orderIndex = make(map[string]events.OrderRecord)
	for _, rec := range orders {
		p.orderIndex[rec.ID] = rec
	}
	p.rebuildFromIndex(now)
	p.ready = true
	p.bootstrapSource = "db-bootstrap"
	p.rebuildCachedJSON()
	snap := p.buildDashboardSnapshot()

	// Snapshot copies for async persistence (must be taken under the lock).
	projCopy := *p.proj
	ordersToSave := make([]events.OrderRecord, 0, len(p.orderIndex))
	for _, rec := range p.orderIndex {
		ordersToSave = append(ordersToSave, rec)
	}
	p.mu.Unlock()

	// Broadcast the now-ready snapshot to all connected clients.
	p.broadcast(events.WSMessage{
		Type:    events.WSTypeDashboardUpdated,
		Payload: snap,
	})

	// Persist projection to Redis so the next restart skips bootstrap.
	go func() {
		pCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := p.repo.SaveProjection(pCtx, &projCopy); err != nil {
			slog.Warn("persist bootstrapped projection failed", "error", err)
		}
	}()

	// Persist order contribution index (one goroutine per record is fine for
	// typical dashboard sizes; large deployments could batch via a pipeline).
	for _, rec := range ordersToSave {
		r := rec
		go func() {
			pCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := p.repo.SaveOrderRecord(pCtx, r); err != nil {
				slog.Warn("persist bootstrapped order record failed",
					"id", r.ID, "error", err)
			}
		}()
	}

	slog.Info("DB bootstrap applied",
		"orders", len(orders),
		"totalRevenue", projCopy.TotalRevenue,
		"totalOrders", projCopy.TotalOrders,
	)
}

// CurrentSnapshotJSON returns the pre-serialised dashboard.snapshot message
// for immediate delivery to newly connected WebSocket clients.
// This satisfies the websocket.SnapshotProvider interface.
func (p *MetricsProcessor) CurrentSnapshotJSON() []byte {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.cachedJSON
}

// Snapshot returns a copy of the current MetricsSnapshot (backward-compat accessor).
func (p *MetricsProcessor) Snapshot() events.MetricsSnapshot {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.buildMetricsSnapshot()
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

// HandleOrderCreated updates the projection for a newly created order.
func (p *MetricsProcessor) HandleOrderCreated(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	order := evt.Payload
	now := time.Now().UTC()

	rec := events.OrderRecord{
		ID:          order.ID,
		Status:      order.Status,
		TotalAmount: order.TotalAmount,
		CreatedAt:   order.CreatedAt,
	}

	// Update running totals.
	p.proj.TotalOrders++
	p.proj.TotalRevenue = round2(p.proj.TotalRevenue + order.TotalAmount)
	if order.Status == "NEW" {
		p.proj.NewOrders++
	}

	// Update chart buckets (non-CANCELLED only, matching GraphQL).
	p.addRevenueBuckets(rec)

	// Update status counts per time range.
	p.addStatusCounts(rec, now)

	// Record contribution for future update/delete delta correctness.
	p.orderIndex[order.ID] = rec
	p.proj.UpdatedAt = now
	p.proj.Version++

	slog.Info("order created", "id", order.ID, "status", order.Status,
		"amount", order.TotalAmount, "totalOrders", p.proj.TotalOrders)

	return p.persistAndBroadcast(ctx, events.WSTypeOrderCreated, order)
}

// HandleOrderUpdated adjusts the projection when an existing order changes.
// Uses the contribution index to correctly reverse the previous contribution
// before applying the new one, handling both status and amount changes.
func (p *MetricsProcessor) HandleOrderUpdated(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	order := evt.Payload
	now := time.Now().UTC()

	old, known := p.orderIndex[order.ID]
	if !known {
		// Order not in index (pre-index data or missed create event).
		// Best-effort: just update status counts for the event status.
		slog.Warn("update for unknown order, contribution index miss", "id", order.ID)
	} else {
		// Reverse old revenue contribution (non-CANCELLED only).
		p.removeRevenueBuckets(old)

		// Reverse old status counts.
		p.removeStatusCounts(old, now)

		// Adjust all-time revenue delta (TotalRevenue includes all statuses).
		p.proj.TotalRevenue = round2(p.proj.TotalRevenue - old.TotalAmount + order.TotalAmount)
		if p.proj.TotalRevenue < 0 {
			p.proj.TotalRevenue = 0
		}

		// Adjust NewOrders count if status changed to/from NEW.
		if old.Status == "NEW" && order.Status != "NEW" {
			if p.proj.NewOrders > 0 {
				p.proj.NewOrders--
			}
		} else if old.Status != "NEW" && order.Status == "NEW" {
			p.proj.NewOrders++
		}
	}

	newRec := events.OrderRecord{
		ID:          order.ID,
		Status:      order.Status,
		TotalAmount: order.TotalAmount,
		// CreatedAt never changes on update; use indexed value if available.
		CreatedAt: func() time.Time {
			if known {
				return old.CreatedAt
			}
			return order.CreatedAt
		}(),
	}

	// Apply new revenue contribution.
	p.addRevenueBuckets(newRec)

	// Apply new status counts.
	p.addStatusCounts(newRec, now)

	// Update index and metadata.
	p.orderIndex[order.ID] = newRec
	p.proj.UpdatedAt = now
	p.proj.Version++

	slog.Info("order updated", "id", order.ID, "oldStatus", func() string {
		if known {
			return old.Status
		}
		return "unknown"
	}(), "newStatus", order.Status, "amount", order.TotalAmount)

	return p.persistAndBroadcast(ctx, events.WSTypeOrderUpdated, order)
}

// HandleOrderDeleted rolls back an order's contribution from the projection.
func (p *MetricsProcessor) HandleOrderDeleted(ctx context.Context, evt events.OrderEvent) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	order := evt.Payload
	now := time.Now().UTC()

	old, known := p.orderIndex[order.ID]
	if !known {
		slog.Warn("delete for unknown order, contribution index miss", "id", order.ID)
		// Fall back to event payload for a best-effort rollback.
		old = events.OrderRecord{
			ID:          order.ID,
			Status:      order.Status,
			TotalAmount: order.TotalAmount,
			CreatedAt:   order.CreatedAt,
		}
	}

	// Reverse revenue contribution (chart buckets).
	p.removeRevenueBuckets(old)

	// Reverse status counts.
	p.removeStatusCounts(old, now)

	// Adjust all-time totals.
	if p.proj.TotalOrders > 0 {
		p.proj.TotalOrders--
	}
	p.proj.TotalRevenue = round2(p.proj.TotalRevenue - old.TotalAmount)
	if p.proj.TotalRevenue < 0 {
		p.proj.TotalRevenue = 0
	}
	if old.Status == "NEW" && p.proj.NewOrders > 0 {
		p.proj.NewOrders--
	}

	delete(p.orderIndex, order.ID)
	p.proj.UpdatedAt = now
	p.proj.Version++

	slog.Info("order deleted", "id", order.ID, "amount", old.TotalAmount,
		"totalOrders", p.proj.TotalOrders)

	// Async: remove from the Redis index.
	go func(id string) {
		dCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := p.repo.DeleteOrderRecord(dCtx, id); err != nil {
			slog.Warn("failed to delete order record from redis", "id", id, "error", err)
		}
	}(order.ID)

	return p.persistAndBroadcast(ctx, events.WSTypeOrderDeleted, order)
}

// ---------------------------------------------------------------------------
// Revenue bucket helpers
// ---------------------------------------------------------------------------

// addRevenueBuckets adds an order's revenue to the daily/monthly/yearly buckets.
// CANCELLED orders are excluded to match the GraphQL dashboard service.
func (p *MetricsProcessor) addRevenueBuckets(rec events.OrderRecord) {
	if rec.Status == "CANCELLED" {
		return
	}
	dayKey := rec.CreatedAt.UTC().Format("2006-01-02")
	monthKey := rec.CreatedAt.UTC().Format("2006-01")
	yearKey := rec.CreatedAt.UTC().Format("2006")

	p.proj.DailyRevenue[dayKey] = round2(p.proj.DailyRevenue[dayKey] + rec.TotalAmount)
	p.proj.MonthlyRevenue[monthKey] = round2(p.proj.MonthlyRevenue[monthKey] + rec.TotalAmount)
	p.proj.YearlyRevenue[yearKey] = round2(p.proj.YearlyRevenue[yearKey] + rec.TotalAmount)
}

// removeRevenueBuckets subtracts an order's revenue from the bucket maps.
// Guards against going negative (data integrity hedge).
func (p *MetricsProcessor) removeRevenueBuckets(rec events.OrderRecord) {
	if rec.Status == "CANCELLED" {
		return
	}
	dayKey := rec.CreatedAt.UTC().Format("2006-01-02")
	monthKey := rec.CreatedAt.UTC().Format("2006-01")
	yearKey := rec.CreatedAt.UTC().Format("2006")

	p.proj.DailyRevenue[dayKey] = math.Max(0, round2(p.proj.DailyRevenue[dayKey]-rec.TotalAmount))
	p.proj.MonthlyRevenue[monthKey] = math.Max(0, round2(p.proj.MonthlyRevenue[monthKey]-rec.TotalAmount))
	p.proj.YearlyRevenue[yearKey] = math.Max(0, round2(p.proj.YearlyRevenue[yearKey]-rec.TotalAmount))
}

// ---------------------------------------------------------------------------
// Status count helpers
// ---------------------------------------------------------------------------

// addStatusCounts increments the status counter in each applicable time range.
func (p *MetricsProcessor) addStatusCounts(rec events.OrderRecord, now time.Time) {
	for _, r := range timeRangesForOrder(rec.CreatedAt, now) {
		statusMapFor(p.proj, r)[rec.Status]++
	}
}

// removeStatusCounts decrements the status counter, guarding against negatives.
func (p *MetricsProcessor) removeStatusCounts(rec events.OrderRecord, now time.Time) {
	for _, r := range timeRangesForOrder(rec.CreatedAt, now) {
		m := statusMapFor(p.proj, r)
		if m[rec.Status] > 0 {
			m[rec.Status]--
		}
	}
}

// timeRangesForOrder returns the time range keys that include the given order.
// Uses UTC calendar boundaries to match the GraphQL service behaviour.
func timeRangesForOrder(createdAt, now time.Time) []string {
	createdAt = createdAt.UTC()
	now = now.UTC()

	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	var ranges []string
	if !createdAt.Before(todayStart) {
		ranges = append(ranges, "today")
	}
	if createdAt.After(now.Add(-7 * 24 * time.Hour)) {
		ranges = append(ranges, "7d")
	}
	if createdAt.After(now.Add(-30 * 24 * time.Hour)) {
		ranges = append(ranges, "30d")
	}
	if createdAt.After(now.Add(-365 * 24 * time.Hour)) {
		ranges = append(ranges, "12m")
	}
	return ranges
}

// statusMapFor returns the status count map for a given range key.
func statusMapFor(proj *repository.InternalProjection, rangeKey string) map[string]int64 {
	switch rangeKey {
	case "today":
		return proj.StatusToday
	case "7d":
		return proj.Status7d
	case "30d":
		return proj.Status30d
	case "12m":
		return proj.Status12m
	default:
		return nil
	}
}

// ---------------------------------------------------------------------------
// Rebuild helpers
// ---------------------------------------------------------------------------

// rebuildStatusCounts recalculates all status count maps from the order index.
// Called on startup so time-range boundaries reflect the current clock.
func (p *MetricsProcessor) rebuildStatusCounts(now time.Time) {
	p.proj.StatusToday = make(map[string]int64)
	p.proj.Status7d = make(map[string]int64)
	p.proj.Status30d = make(map[string]int64)
	p.proj.Status12m = make(map[string]int64)

	for _, rec := range p.orderIndex {
		p.addStatusCounts(rec, now)
	}
}

// rebuildFromIndex rebuilds the full projection from the order index.
// Used when the projection snapshot is missing or incompatible.
func (p *MetricsProcessor) rebuildFromIndex(now time.Time) {
	for _, rec := range p.orderIndex {
		p.proj.TotalOrders++
		p.proj.TotalRevenue = round2(p.proj.TotalRevenue + rec.TotalAmount)
		if rec.Status == "NEW" {
			p.proj.NewOrders++
		}
		p.addRevenueBuckets(rec)
		p.addStatusCounts(rec, now)
	}
	p.proj.UpdatedAt = now
	slog.Info("rebuilt projection from order index", "orders", len(p.orderIndex))
}

// ---------------------------------------------------------------------------
// Snapshot building
// ---------------------------------------------------------------------------

// buildDashboardSnapshot derives the wire-format DashboardSnapshot from the
// current InternalProjection.  Must be called with p.mu held.
func (p *MetricsProcessor) buildDashboardSnapshot() events.DashboardSnapshot {
	now := time.Now().UTC()
	return events.DashboardSnapshot{
		Metrics:      p.buildMetricsSnapshot(),
		WeeklySales:  buildWeeklySales(p.proj.DailyRevenue, now),
		MonthlySales: buildMonthlySales(p.proj.MonthlyRevenue, now),
		YearlySales:  buildYearlySales(p.proj.YearlyRevenue, now),
		OrderStatus: events.OrderStatusByRange{
			Today:   statusToSlice(p.proj.StatusToday),
			SevenD:  statusToSlice(p.proj.Status7d),
			ThirtyD: statusToSlice(p.proj.Status30d),
			TwelveM: statusToSlice(p.proj.Status12m),
		},
		GeneratedAt:     now,
		Version:         p.proj.Version,
		Ready:           p.ready,
		BootstrapSource: p.bootstrapSource,
	}
}

func (p *MetricsProcessor) buildMetricsSnapshot() events.MetricsSnapshot {
	avg := 0.0
	if p.proj.TotalOrders > 0 {
		avg = round2(p.proj.TotalRevenue / float64(p.proj.TotalOrders))
	}
	return events.MetricsSnapshot{
		TotalRevenue:  p.proj.TotalRevenue,
		TotalOrders:   p.proj.TotalOrders,
		AvgOrderValue: avg,
		NewOrders:     p.proj.NewOrders,
		UpdatedAt:     p.proj.UpdatedAt,
	}
}

// rebuildCachedJSON serialises the current snapshot into a WebSocket message
// and stores it in p.cachedJSON for instant delivery to new clients.
// Must be called with p.mu held (or before sharing the processor).
func (p *MetricsProcessor) rebuildCachedJSON() {
	snap := p.buildDashboardSnapshot()
	msg := events.WSMessage{Type: events.WSTypeDashboardSnapshot, Payload: snap}
	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("failed to marshal dashboard snapshot", "error", err)
		return
	}
	p.cachedJSON = data
}

// ---------------------------------------------------------------------------
// Persist and broadcast
// ---------------------------------------------------------------------------

// persistAndBroadcast saves the projection and broadcasts dashboard.updated to
// all connected clients. It also updates the cached snapshot for new clients.
// Must be called with p.mu held.
func (p *MetricsProcessor) persistAndBroadcast(ctx context.Context, wsType events.WSMessageType, order events.OrderPayload) error {
	snap := p.buildDashboardSnapshot()

	// Rebuild cached snapshot for new-client delivery.
	msg := events.WSMessage{Type: events.WSTypeDashboardSnapshot, Payload: snap}
	if data, err := json.Marshal(msg); err == nil {
		p.cachedJSON = data
	}

	// Persist projection snapshot (non-blocking).
	projCopy := *p.proj
	go func() {
		pCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := p.repo.SaveProjection(pCtx, &projCopy); err != nil {
			slog.Warn("failed to persist projection", "error", err)
		}
	}()

	// Persist order contribution record (non-blocking).
	if rec, ok := p.orderIndex[order.ID]; ok {
		go func(r events.OrderRecord) {
			pCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			if err := p.repo.SaveOrderRecord(pCtx, r); err != nil {
				slog.Warn("failed to persist order record", "id", r.ID, "error", err)
			}
		}(rec)
	}

	// Broadcast dashboard.updated to all connected clients.
	p.broadcast(events.WSMessage{
		Type:    events.WSTypeDashboardUpdated,
		Payload: snap,
	})

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

// ---------------------------------------------------------------------------
// Chart slice builders
// ---------------------------------------------------------------------------

// buildWeeklySales returns the last 7 days of revenue, oldest-first.
// Labels use the day name ("Mon", "Tue", …) matching the GraphQL service.
func buildWeeklySales(daily map[string]float64, now time.Time) []events.SalesBucket {
	buckets := make([]events.SalesBucket, 7)
	for i := 0; i < 7; i++ {
		day := now.AddDate(0, 0, -(6 - i))
		key := day.Format("2006-01-02")
		buckets[i] = events.SalesBucket{
			Label:   day.Weekday().String()[:3], // "Mon", "Tue", …
			Revenue: round2(daily[key]),
		}
	}
	return buckets
}

// buildMonthlySales returns the last 12 months of revenue, oldest-first.
func buildMonthlySales(monthly map[string]float64, now time.Time) []events.SalesBucket {
	buckets := make([]events.SalesBucket, 12)
	for i := 0; i < 12; i++ {
		month := now.AddDate(0, -(11 - i), 0)
		key := month.Format("2006-01")
		buckets[i] = events.SalesBucket{
			Label:   month.Month().String()[:3], // "Jan", "Feb", …
			Revenue: round2(monthly[key]),
		}
	}
	return buckets
}

// buildYearlySales returns 6 years of revenue (current year − 5 → current year).
func buildYearlySales(yearly map[string]float64, now time.Time) []events.SalesBucket {
	buckets := make([]events.SalesBucket, 6)
	for i := 0; i < 6; i++ {
		year := now.AddDate(-(5 - i), 0, 0)
		key := year.Format("2006")
		buckets[i] = events.SalesBucket{
			Label:   key,
			Revenue: round2(yearly[key]),
		}
	}
	return buckets
}

// statusToSlice converts a status count map to an ordered slice using the
// fixed display order defined in statusDefs (matches GraphQL return order).
func statusToSlice(counts map[string]int64) []events.StatusCount {
	slice := make([]events.StatusCount, len(statusDefs))
	for i, def := range statusDefs {
		slice[i] = events.StatusCount{
			Label: def.label,
			Value: counts[def.key],
			Color: def.color,
		}
	}
	return slice
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
