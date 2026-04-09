// Package websocket implements a fan-out WebSocket hub.
//
// Architecture:
//
//	Hub.broadcast ← processors send JSON messages
//	Hub.Run()     → fans out to every registered Client
//	Client        → goroutine pair (readPump / writePump)
package websocket

import (
	"log/slog"
	"sync"
)

// Hub maintains the set of active clients and fans out broadcast messages.
type Hub struct {
	// mu protects the clients map.
	mu sync.RWMutex

	// clients is the set of currently connected WebSocket clients.
	clients map[*Client]struct{}

	// broadcast receives encoded messages destined for all clients.
	broadcast chan []byte

	// register / unregister are used by Client goroutines to update the map.
	register   chan *Client
	unregister chan *Client
}

// NewHub allocates and returns a ready-to-use Hub (call Run in a goroutine).
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
	}
}

// Run processes registrations and broadcasts.  It must be called in its own
// goroutine and will block until the process exits.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = struct{}{}
			h.mu.Unlock()
			slog.Debug("websocket client connected", "addr", client.remoteAddr, "total", h.clientCount())

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			slog.Debug("websocket client disconnected", "addr", client.remoteAddr, "total", h.clientCount())

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Slow client: drop the message rather than blocking.
					slog.Warn("dropping message for slow client", "addr", client.remoteAddr)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast enqueues a raw JSON message for delivery to all connected clients.
// Non-blocking: if the internal buffer is full, the message is dropped.
func (h *Hub) Broadcast(data []byte) {
	select {
	case h.broadcast <- data:
	default:
		slog.Warn("broadcast channel full, dropping message")
	}
}

// ClientCount returns the number of currently connected clients (thread-safe).
func (h *Hub) clientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ClientCount is the exported version for use in health/metrics endpoints.
func (h *Hub) ClientCount() int {
	return h.clientCount()
}
