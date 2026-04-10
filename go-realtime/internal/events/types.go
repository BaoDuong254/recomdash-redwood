// Package events defines the canonical event structures shared across the service.
// Events are published by the RedwoodJS API layer to Redis Pub/Sub channels and
// consumed here by the Go service.
package events

import "time"

// Channel names that the Go service subscribes to.
const (
	ChannelOrderCreated = "orders.created"
	ChannelOrderUpdated = "orders.updated"
	ChannelOrderDeleted = "orders.deleted"
)

// All channels the service subscribes to.
var OrderChannels = []string{
	ChannelOrderCreated,
	ChannelOrderUpdated,
	ChannelOrderDeleted,
}

// ---------------------------------------------------------------------------
// Inbound event envelope (published by RedwoodJS)
// ---------------------------------------------------------------------------

// Event is the top-level envelope for every Redis message.
type Event struct {
	// Type mirrors the channel name (e.g. "orders.created").
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

// OrderPayload is the payload carried in every order-related event.
type OrderPayload struct {
	ID                string    `json:"id"`
	OrderNumber       string    `json:"orderNumber"`
	Status            string    `json:"status"`
	PaymentStatus     string    `json:"paymentStatus"`
	FulfillmentStatus string    `json:"fulfillmentStatus"`
	TotalAmount       float64   `json:"totalAmount"`
	CustomerName      string    `json:"customerName"`
	CustomerEmail     string    `json:"customerEmail"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// OrderEvent is a typed Event with an OrderPayload.
type OrderEvent struct {
	Type      string       `json:"type"`
	Payload   OrderPayload `json:"payload"`
	Timestamp time.Time    `json:"timestamp"`
}

// ---------------------------------------------------------------------------
// Outbound WebSocket message envelope (pushed to the frontend)
// ---------------------------------------------------------------------------

// WSMessageType enumerates the types of messages the Go service sends to
// connected WebSocket clients.
type WSMessageType string

const (
	// Legacy per-entity messages — kept for potential future consumers.
	WSTypeMetricsUpdated WSMessageType = "metrics.updated"
	WSTypeOrderCreated   WSMessageType = "order.created"
	WSTypeOrderUpdated   WSMessageType = "order.updated"
	WSTypeOrderDeleted   WSMessageType = "order.deleted"

	// Dashboard projection messages — primary contract with the frontend.
	// dashboard.snapshot: full state sent once on client connect.
	// dashboard.updated:  full state sent after every processed order event.
	WSTypeDashboardSnapshot WSMessageType = "dashboard.snapshot"
	WSTypeDashboardUpdated  WSMessageType = "dashboard.updated"
)

// WSMessage is the envelope for every outbound WebSocket message.
type WSMessage struct {
	Type    WSMessageType `json:"type"`
	Payload interface{}   `json:"payload"`
}

// MetricsSnapshot is the payload for WSTypeMetricsUpdated messages.
// It contains all-time running totals (not scoped to a time range).
type MetricsSnapshot struct {
	TotalRevenue  float64     `json:"totalRevenue"`
	TotalOrders   int64       `json:"totalOrders"`
	AvgOrderValue float64     `json:"avgOrderValue"`
	NewOrders     int64       `json:"newOrders"`
	RecentOrder   *OrderBrief `json:"recentOrder,omitempty"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

// OrderBrief is a lightweight order summary sent as part of realtime updates.
type OrderBrief struct {
	ID           string    `json:"id"`
	OrderNumber  string    `json:"orderNumber"`
	Status       string    `json:"status"`
	TotalAmount  float64   `json:"totalAmount"`
	CustomerName string    `json:"customerName"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ---------------------------------------------------------------------------
// Full dashboard projection — chart-aware wire format
// ---------------------------------------------------------------------------

// SalesBucket is a single labeled revenue point for chart rendering.
// Label matches the GraphQL convention: "Mon"/"Tue" for weekly, "Jan" for
// monthly, "2025" for yearly.
type SalesBucket struct {
	Label   string  `json:"label"`
	Revenue float64 `json:"revenue"`
}

// StatusCount is a single slice of an order-status donut/pie chart.
// Colors are fixed to match the GraphQL dashboard service.
type StatusCount struct {
	Label string `json:"label"`
	Value int64  `json:"value"`
	Color string `json:"color"`
}

// OrderStatusByRange holds pre-computed status distributions for all four
// time ranges so the frontend can switch ranges without a GraphQL round-trip.
type OrderStatusByRange struct {
	Today   []StatusCount `json:"today"`
	SevenD  []StatusCount `json:"7d"`
	ThirtyD []StatusCount `json:"30d"`
	TwelveM []StatusCount `json:"12m"`
}

// DashboardSnapshot is the canonical realtime projection sent to clients on
// connect (dashboard.snapshot) and after each processed event (dashboard.updated).
// It is a superset of MetricsSnapshot that also includes all chart datasets.
//
// Readiness contract:
//   - Ready=false means the projection has NOT been hydrated from a reliable
//     source yet (Redis empty on startup, bootstrap in progress). Clients MUST
//     ignore the data payload when Ready=false and fall back to their own
//     source of truth (e.g. GraphQL baseline).
//   - Ready=true means the projection was hydrated from a reliable source
//     (Redis on restart, or DB bootstrap) and can be trusted for rendering.
//   - BootstrapSource records which source completed the hydration:
//     "redis", "db-bootstrap", or "empty" (never emitted with Ready=true).
type DashboardSnapshot struct {
	Metrics         MetricsSnapshot    `json:"metrics"`
	WeeklySales     []SalesBucket      `json:"weeklySales"`
	MonthlySales    []SalesBucket      `json:"monthlySales"`
	YearlySales     []SalesBucket      `json:"yearlySales"`
	OrderStatus     OrderStatusByRange `json:"orderStatus"`
	GeneratedAt     time.Time          `json:"generatedAt"`
	Version         int64              `json:"version"`
	Ready           bool               `json:"ready"`
	BootstrapSource string             `json:"bootstrapSource"`
}

// ---------------------------------------------------------------------------
// Order contribution index
// ---------------------------------------------------------------------------

// OrderRecord captures the fields needed to reverse an order's previous
// contribution when an update or delete event arrives.
// Stored in Redis as a Hash field (key = order ID).
type OrderRecord struct {
	ID          string    `json:"id"`
	Status      string    `json:"status"`
	TotalAmount float64   `json:"totalAmount"`
	CreatedAt   time.Time `json:"createdAt"`
}
