// Package handlers contains the Redis event handlers — thin adapters that
// decode a channel message and forward it to the appropriate processor method.
package handlers

import (
	"context"

	"github.com/recomdash/go-realtime/internal/events"
	"github.com/recomdash/go-realtime/internal/processors"
)

// OrderHandler routes order events to the MetricsProcessor.
type OrderHandler struct {
	proc *processors.MetricsProcessor
}

// NewOrderHandler creates an OrderHandler backed by the given processor.
func NewOrderHandler(proc *processors.MetricsProcessor) *OrderHandler {
	return &OrderHandler{proc: proc}
}

// HandleCreated is registered for the "orders.created" channel.
func (h *OrderHandler) HandleCreated(ctx context.Context, evt events.OrderEvent) error {
	return h.proc.HandleOrderCreated(ctx, evt)
}

// HandleUpdated is registered for the "orders.updated" channel.
func (h *OrderHandler) HandleUpdated(ctx context.Context, evt events.OrderEvent) error {
	return h.proc.HandleOrderUpdated(ctx, evt)
}

// HandleDeleted is registered for the "orders.deleted" channel.
func (h *OrderHandler) HandleDeleted(ctx context.Context, evt events.OrderEvent) error {
	return h.proc.HandleOrderDeleted(ctx, evt)
}
