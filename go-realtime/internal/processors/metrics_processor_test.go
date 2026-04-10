package processors

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/recomdash/go-realtime/internal/events"
	"github.com/recomdash/go-realtime/internal/repository"
	"github.com/recomdash/go-realtime/internal/websocket"
)

// ---------------------------------------------------------------------------
// Stub repo (in-memory, no Redis required)
// ---------------------------------------------------------------------------

type stubRepo struct {
	mu    sync.Mutex
	proj  *repository.InternalProjection
	index map[string]events.OrderRecord
}

func newStubRepo() *stubRepo { return &stubRepo{index: make(map[string]events.OrderRecord)} }

func (s *stubRepo) LoadProjection(_ context.Context) (*repository.InternalProjection, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.proj, nil
}
func (s *stubRepo) LoadOrderIndex(_ context.Context) (map[string]events.OrderRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make(map[string]events.OrderRecord, len(s.index))
	for k, v := range s.index {
		out[k] = v
	}
	return out, nil
}
func (s *stubRepo) SaveProjection(_ context.Context, p *repository.InternalProjection) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *p
	s.proj = &cp
	return nil
}
func (s *stubRepo) SaveOrderRecord(_ context.Context, rec events.OrderRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.index[rec.ID] = rec
	return nil
}
func (s *stubRepo) DeleteOrderRecord(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.index, id)
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func newProc(t *testing.T) (*MetricsProcessor, *stubRepo) {
	t.Helper()
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo()
	proc := NewMetricsProcessor(repo, hub)
	return proc, repo
}

func makeEvent(eventType string, id string, status string, amount float64, createdAt time.Time) events.OrderEvent {
	return events.OrderEvent{
		Type: eventType,
		Payload: events.OrderPayload{
			ID:          id,
			OrderNumber: "ORD-" + id,
			Status:      status,
			TotalAmount: amount,
			CreatedAt:   createdAt,
			UpdatedAt:   time.Now().UTC(),
		},
		Timestamp: time.Now().UTC(),
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestHandleOrderCreated_updatesRunningTotals(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	evt := makeEvent(events.ChannelOrderCreated, "ord-1", "NEW", 99.99, now)
	if err := proc.HandleOrderCreated(ctx, evt); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.proj.TotalOrders != 1 {
		t.Errorf("TotalOrders = %d, want 1", proc.proj.TotalOrders)
	}
	if proc.proj.TotalRevenue != 99.99 {
		t.Errorf("TotalRevenue = %.2f, want 99.99", proc.proj.TotalRevenue)
	}
	if proc.proj.NewOrders != 1 {
		t.Errorf("NewOrders = %d, want 1", proc.proj.NewOrders)
	}
	// Revenue bucket for today.
	dayKey := now.Format("2006-01-02")
	if proc.proj.DailyRevenue[dayKey] != 99.99 {
		t.Errorf("DailyRevenue[today] = %.2f, want 99.99", proc.proj.DailyRevenue[dayKey])
	}
	// Status count for today range.
	if proc.proj.StatusToday["NEW"] != 1 {
		t.Errorf("StatusToday[NEW] = %d, want 1", proc.proj.StatusToday["NEW"])
	}
}

func TestHandleOrderCreated_cancelledExcludedFromRevenue(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	evt := makeEvent(events.ChannelOrderCreated, "ord-2", "CANCELLED", 200.00, now)
	if err := proc.HandleOrderCreated(ctx, evt); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	// All-time total includes CANCELLED (matches GraphQL TotalRevenue behaviour).
	if proc.proj.TotalRevenue != 200.00 {
		t.Errorf("TotalRevenue = %.2f, want 200.00", proc.proj.TotalRevenue)
	}
	// Chart buckets must exclude CANCELLED.
	dayKey := now.Format("2006-01-02")
	if rev := proc.proj.DailyRevenue[dayKey]; rev != 0 {
		t.Errorf("DailyRevenue[today] = %.2f, want 0 (CANCELLED excluded)", rev)
	}
}

func TestHandleOrderUpdated_statusChange(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	// Create NEW order.
	create := makeEvent(events.ChannelOrderCreated, "ord-3", "NEW", 150.00, now)
	if err := proc.HandleOrderCreated(ctx, create); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	// Update to FULFILLED.
	update := makeEvent(events.ChannelOrderUpdated, "ord-3", "FULFILLED", 150.00, now)
	if err := proc.HandleOrderUpdated(ctx, update); err != nil {
		t.Fatalf("HandleOrderUpdated: %v", err)
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	// NewOrders counter must drop to zero.
	if proc.proj.NewOrders != 0 {
		t.Errorf("NewOrders = %d, want 0 after status change", proc.proj.NewOrders)
	}
	// TotalRevenue unchanged (same amount, just different status).
	if proc.proj.TotalRevenue != 150.00 {
		t.Errorf("TotalRevenue = %.2f, want 150.00", proc.proj.TotalRevenue)
	}
	// Status counts: FULFILLED+1, NEW−1.
	if proc.proj.StatusToday["FULFILLED"] != 1 {
		t.Errorf("StatusToday[FULFILLED] = %d, want 1", proc.proj.StatusToday["FULFILLED"])
	}
	if proc.proj.StatusToday["NEW"] != 0 {
		t.Errorf("StatusToday[NEW] = %d, want 0", proc.proj.StatusToday["NEW"])
	}
}

func TestHandleOrderUpdated_amountChange(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	create := makeEvent(events.ChannelOrderCreated, "ord-4", "PAID", 100.00, now)
	if err := proc.HandleOrderCreated(ctx, create); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	update := makeEvent(events.ChannelOrderUpdated, "ord-4", "PAID", 250.00, now)
	if err := proc.HandleOrderUpdated(ctx, update); err != nil {
		t.Fatalf("HandleOrderUpdated: %v", err)
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.proj.TotalRevenue != 250.00 {
		t.Errorf("TotalRevenue = %.2f, want 250.00", proc.proj.TotalRevenue)
	}
	dayKey := now.Format("2006-01-02")
	if proc.proj.DailyRevenue[dayKey] != 250.00 {
		t.Errorf("DailyRevenue[today] = %.2f, want 250.00", proc.proj.DailyRevenue[dayKey])
	}
}

func TestHandleOrderDeleted_rollsBackContribution(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	create := makeEvent(events.ChannelOrderCreated, "ord-5", "NEW", 75.00, now)
	if err := proc.HandleOrderCreated(ctx, create); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	del := makeEvent(events.ChannelOrderDeleted, "ord-5", "NEW", 75.00, now)
	if err := proc.HandleOrderDeleted(ctx, del); err != nil {
		t.Fatalf("HandleOrderDeleted: %v", err)
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.proj.TotalOrders != 0 {
		t.Errorf("TotalOrders = %d, want 0", proc.proj.TotalOrders)
	}
	if proc.proj.TotalRevenue != 0 {
		t.Errorf("TotalRevenue = %.2f, want 0", proc.proj.TotalRevenue)
	}
	if proc.proj.NewOrders != 0 {
		t.Errorf("NewOrders = %d, want 0", proc.proj.NewOrders)
	}
	dayKey := now.Format("2006-01-02")
	if proc.proj.DailyRevenue[dayKey] != 0 {
		t.Errorf("DailyRevenue[today] = %.2f, want 0 after delete", proc.proj.DailyRevenue[dayKey])
	}
	if _, exists := proc.orderIndex["ord-5"]; exists {
		t.Error("order should be removed from orderIndex after delete")
	}
}

func TestReconnectBootstrap_rebuildsFromIndex(t *testing.T) {
	// Seed the stub repo with a pre-existing order in the index to simulate a
	// service restart where the projection snapshot is absent.
	repo := newStubRepo()
	yesterday := time.Now().UTC().AddDate(0, 0, -1)
	repo.index["ord-6"] = events.OrderRecord{
		ID:          "ord-6",
		Status:      "FULFILLED",
		TotalAmount: 300.00,
		CreatedAt:   yesterday,
	}

	hub := websocket.NewHub()
	go hub.Run()
	proc := NewMetricsProcessor(repo, hub)

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.proj.TotalOrders != 1 {
		t.Errorf("TotalOrders = %d, want 1 after rebuild", proc.proj.TotalOrders)
	}
	if proc.proj.TotalRevenue != 300.00 {
		t.Errorf("TotalRevenue = %.2f, want 300.00 after rebuild", proc.proj.TotalRevenue)
	}
	// Yesterday is within 7d but not today.
	if proc.proj.StatusToday["FULFILLED"] != 0 {
		t.Errorf("StatusToday[FULFILLED] = %d, want 0 for yesterday order", proc.proj.StatusToday["FULFILLED"])
	}
	if proc.proj.Status7d["FULFILLED"] != 1 {
		t.Errorf("Status7d[FULFILLED] = %d, want 1 for yesterday order", proc.proj.Status7d["FULFILLED"])
	}
}

func TestCurrentSnapshotJSON_isValidDashboardSnapshot(t *testing.T) {
	proc, _ := newProc(t)
	ctx := context.Background()
	now := time.Now().UTC()

	evt := makeEvent(events.ChannelOrderCreated, "ord-7", "PAID", 50.00, now)
	if err := proc.HandleOrderCreated(ctx, evt); err != nil {
		t.Fatalf("HandleOrderCreated: %v", err)
	}

	data := proc.CurrentSnapshotJSON()
	if len(data) == 0 {
		t.Fatal("CurrentSnapshotJSON returned empty")
	}

	var msg events.WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("CurrentSnapshotJSON is not valid JSON: %v", err)
	}
	if msg.Type != events.WSTypeDashboardSnapshot {
		t.Errorf("message type = %q, want %q", msg.Type, events.WSTypeDashboardSnapshot)
	}
}

// ---------------------------------------------------------------------------
// Readiness tests
// ---------------------------------------------------------------------------

// TestNewMetricsProcessor_emptyRedis_notReady verifies that when Redis holds
// neither projection nor order index the processor starts with ready=false so
// the frontend knows to render GraphQL baseline instead of all-zero Go data.
func TestNewMetricsProcessor_emptyRedis_notReady(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo() // empty — no projection, no index

	proc := NewMetricsProcessor(repo, hub)

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.ready {
		t.Error("ready = true, want false when Redis is empty")
	}
	if proc.bootstrapSource != "empty" {
		t.Errorf("bootstrapSource = %q, want %q", proc.bootstrapSource, "empty")
	}

	// Snapshot JSON must carry ready=false so the frontend can guard on it.
	data := proc.cachedJSON
	snap := extractSnapshot(t, data)
	if snap.Ready {
		t.Error("snapshot.ready = true in cached JSON, want false")
	}
	if snap.BootstrapSource != "empty" {
		t.Errorf("snapshot.bootstrapSource = %q, want %q", snap.BootstrapSource, "empty")
	}
}

// TestNewMetricsProcessor_withProjection_ready verifies that a non-nil
// projection loaded from Redis immediately sets ready=true.
func TestNewMetricsProcessor_withProjection_ready(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo()

	// Pre-seed a non-nil projection (simulates Redis hit on restart).
	proj := repository.NewInternalProjection()
	proj.TotalOrders = 5
	proj.TotalRevenue = 500.00
	repo.proj = proj

	proc := NewMetricsProcessor(repo, hub)

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if !proc.ready {
		t.Error("ready = false, want true when projection loaded from Redis")
	}
	if proc.bootstrapSource != "redis" {
		t.Errorf("bootstrapSource = %q, want %q", proc.bootstrapSource, "redis")
	}

	snap := extractSnapshot(t, proc.cachedJSON)
	if !snap.Ready {
		t.Error("snapshot.ready = false in cached JSON, want true")
	}
}

// TestNewMetricsProcessor_withIndexOnly_ready verifies that when the
// projection is missing but the order index has entries, Go rebuilds from the
// index and sets ready=true (index is a reliable in-Redis source).
func TestNewMetricsProcessor_withIndexOnly_ready(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo()
	repo.index["ord-idx-1"] = events.OrderRecord{
		ID:          "ord-idx-1",
		Status:      "PAID",
		TotalAmount: 200.00,
		CreatedAt:   time.Now().UTC().AddDate(0, 0, -1),
	}

	proc := NewMetricsProcessor(repo, hub)

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if !proc.ready {
		t.Error("ready = false, want true when rebuilt from order index")
	}
	if proc.bootstrapSource != "redis" {
		t.Errorf("bootstrapSource = %q, want %q", proc.bootstrapSource, "redis")
	}
	if proc.proj.TotalOrders != 1 {
		t.Errorf("TotalOrders = %d, want 1 after index rebuild", proc.proj.TotalOrders)
	}
}

// TestStartBootstrap_setsReadyOnSuccess verifies the DB bootstrap path:
// a processor that starts not-ready flips to ready=true and source="db-bootstrap"
// after a successful FetchBaselineFn call, and the cached snapshot reflects that.
func TestStartBootstrap_setsReadyOnSuccess(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo() // empty Redis

	proc := NewMetricsProcessor(repo, hub)
	if proc.ready {
		t.Fatal("precondition: proc should start not-ready")
	}

	// Provide a synchronous-style fake fetchFn that returns two orders.
	now := time.Now().UTC()
	fakeOrders := []events.OrderRecord{
		{ID: "b-1", Status: "PAID", TotalAmount: 100.00, CreatedAt: now.AddDate(0, 0, -2)},
		{ID: "b-2", Status: "FULFILLED", TotalAmount: 250.00, CreatedAt: now.AddDate(0, 0, -1)},
	}
	doneCh := make(chan struct{})
	fetchFn := func(_ context.Context) ([]events.OrderRecord, error) {
		defer close(doneCh)
		return fakeOrders, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	proc.StartBootstrap(ctx, fetchFn)

	// Wait for the bootstrap goroutine to finish.
	select {
	case <-doneCh:
		// Give applyBootstrap a moment to update state after fetchFn returns.
		time.Sleep(50 * time.Millisecond)
	case <-ctx.Done():
		t.Fatal("bootstrap did not complete within timeout")
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if !proc.ready {
		t.Error("ready = false after successful bootstrap, want true")
	}
	if proc.bootstrapSource != "db-bootstrap" {
		t.Errorf("bootstrapSource = %q, want %q", proc.bootstrapSource, "db-bootstrap")
	}
	if proc.proj.TotalOrders != 2 {
		t.Errorf("TotalOrders = %d, want 2 after bootstrap", proc.proj.TotalOrders)
	}
	if proc.proj.TotalRevenue != 350.00 {
		t.Errorf("TotalRevenue = %.2f, want 350.00 after bootstrap", proc.proj.TotalRevenue)
	}

	snap := extractSnapshot(t, proc.cachedJSON)
	if !snap.Ready {
		t.Error("snapshot.ready = false in cached JSON after bootstrap, want true")
	}
	if snap.BootstrapSource != "db-bootstrap" {
		t.Errorf("snapshot.bootstrapSource = %q after bootstrap", snap.BootstrapSource)
	}
}

// TestReconcileWithDB_staleRedis_rebuildsFromDB is the primary regression test.
// It simulates the bug: Redis held a stale projection (9 orders) while the DB
// source of truth has 445.  After reconciliation the projection must converge
// to the DB count and the source must be recorded as "db-bootstrap".
func TestReconcileWithDB_staleRedis_rebuildsFromDB(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo()

	// Seed Redis with a stale projection: 9 orders, $900 revenue.
	staleProj := repository.NewInternalProjection()
	staleProj.TotalOrders = 9
	staleProj.TotalRevenue = 900.00
	staleProj.Version = 9
	repo.proj = staleProj

	proc := NewMetricsProcessor(repo, hub)
	if !proc.ready {
		t.Fatal("precondition: proc should be ready after loading stale projection from Redis")
	}
	if proc.proj.TotalOrders != 9 {
		t.Fatalf("precondition: TotalOrders = %d, want 9", proc.proj.TotalOrders)
	}

	// DB source of truth has 445 orders.
	const dbOrderCount = 445
	dbOrders := make([]events.OrderRecord, dbOrderCount)
	now := time.Now().UTC()
	for i := range dbOrders {
		dbOrders[i] = events.OrderRecord{
			ID:          fmt.Sprintf("ord-%d", i+1),
			Status:      "PAID",
			TotalAmount: 100.00,
			CreatedAt:   now.AddDate(0, 0, -(i % 30)), // spread across last 30 days
		}
	}

	doneCh := make(chan struct{})
	fetchFn := func(_ context.Context) ([]events.OrderRecord, error) {
		defer close(doneCh)
		return dbOrders, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	proc.StartBootstrap(ctx, fetchFn)

	select {
	case <-doneCh:
		time.Sleep(50 * time.Millisecond) // let applyBootstrap finish under the lock
	case <-ctx.Done():
		t.Fatal("reconciliation did not complete within timeout")
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	if proc.proj.TotalOrders != dbOrderCount {
		t.Errorf("TotalOrders = %d after reconciliation, want %d", proc.proj.TotalOrders, dbOrderCount)
	}
	if proc.bootstrapSource != "db-bootstrap" {
		t.Errorf("bootstrapSource = %q, want %q", proc.bootstrapSource, "db-bootstrap")
	}
	if !proc.ready {
		t.Error("ready = false after reconciliation, want true")
	}

	// Cached snapshot must reflect the corrected count.
	snap := extractSnapshot(t, proc.cachedJSON)
	if snap.Metrics.TotalOrders != dbOrderCount {
		t.Errorf("snapshot.metrics.totalOrders = %d, want %d",
			snap.Metrics.TotalOrders, dbOrderCount)
	}
	if !snap.Ready {
		t.Error("snapshot.ready = false after reconciliation, want true")
	}
}

// TestReconcileWithDB_redisAligned_noRebuild verifies the fast path:
// when Redis projection matches DB exactly, reconciliation must NOT rebuild
// (bootstrapSource stays "redis", projection unchanged).
func TestReconcileWithDB_redisAligned_noRebuild(t *testing.T) {
	hub := websocket.NewHub()
	go hub.Run()
	repo := newStubRepo()

	// Redis projection has 3 orders, $300 total.
	alignedProj := repository.NewInternalProjection()
	alignedProj.TotalOrders = 3
	alignedProj.TotalRevenue = 300.00
	alignedProj.Version = 3
	repo.proj = alignedProj

	proc := NewMetricsProcessor(repo, hub)
	if !proc.ready {
		t.Fatal("precondition: proc should be ready after loading from Redis")
	}

	// DB also has exactly 3 orders × $100 = $300 — no drift.
	now := time.Now().UTC()
	dbOrders := []events.OrderRecord{
		{ID: "a-1", Status: "PAID", TotalAmount: 100.00, CreatedAt: now},
		{ID: "a-2", Status: "PAID", TotalAmount: 100.00, CreatedAt: now},
		{ID: "a-3", Status: "PAID", TotalAmount: 100.00, CreatedAt: now},
	}

	doneCh := make(chan struct{})
	fetchFn := func(_ context.Context) ([]events.OrderRecord, error) {
		defer close(doneCh)
		return dbOrders, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	proc.StartBootstrap(ctx, fetchFn)

	select {
	case <-doneCh:
		time.Sleep(50 * time.Millisecond)
	case <-ctx.Done():
		t.Fatal("reconciliation fetch was never called within timeout")
	}

	proc.mu.Lock()
	defer proc.mu.Unlock()

	// Projection must NOT have been replaced.
	if proc.bootstrapSource != "redis" {
		t.Errorf("bootstrapSource = %q, want %q (no rebuild expected)", proc.bootstrapSource, "redis")
	}
	if proc.proj.TotalOrders != 3 {
		t.Errorf("TotalOrders = %d after aligned reconciliation, want 3", proc.proj.TotalOrders)
	}
}

// TestSnapshotJSON_readyFieldPresent confirms that the ready field is always
// present in the serialised snapshot, satisfying the frontend's type contract.
func TestSnapshotJSON_readyFieldPresent(t *testing.T) {
	proc, _ := newProc(t)

	data := proc.CurrentSnapshotJSON()
	snap := extractSnapshot(t, data)

	// ready must be a concrete bool (false when fresh empty processor, not missing).
	// If the field were absent, json.Unmarshal would leave it as false which is
	// still the correct default — but we verify it is explicitly serialised.
	raw := make(map[string]interface{})
	var msg map[string]interface{}
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	payload, ok := msg["payload"].(map[string]interface{})
	if !ok {
		t.Fatal("payload is not a map")
	}
	if _, exists := payload["ready"]; !exists {
		t.Error("\"ready\" field missing from serialised snapshot payload")
	}
	if _, exists := payload["bootstrapSource"]; !exists {
		t.Error("\"bootstrapSource\" field missing from serialised snapshot payload")
	}
	_ = snap
	_ = raw
}

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

// extractSnapshot unmarshals a cached JSON byte slice into a DashboardSnapshot.
func extractSnapshot(t *testing.T, data []byte) events.DashboardSnapshot {
	t.Helper()
	if len(data) == 0 {
		t.Fatal("snapshot JSON is empty")
	}
	var msg struct {
		Type    events.WSMessageType     `json:"type"`
		Payload events.DashboardSnapshot `json:"payload"`
	}
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("unmarshal snapshot: %v", err)
	}
	return msg.Payload
}
