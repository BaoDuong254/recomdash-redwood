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
	WSTypeMetricsUpdated WSMessageType = "metrics.updated"
	WSTypeOrderCreated   WSMessageType = "order.created"
	WSTypeOrderUpdated   WSMessageType = "order.updated"
	WSTypeOrderDeleted   WSMessageType = "order.deleted"
)

// WSMessage is the envelope for every outbound WebSocket message.
type WSMessage struct {
	Type    WSMessageType `json:"type"`
	Payload interface{}   `json:"payload"`
}

// MetricsSnapshot is the payload for WSTypeMetricsUpdated messages.
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
