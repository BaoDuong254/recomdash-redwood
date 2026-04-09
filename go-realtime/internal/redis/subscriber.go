package redis

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/recomdash/go-realtime/internal/events"
)

// HandlerFunc is the signature expected by the Subscriber for each channel.
type HandlerFunc func(ctx context.Context, event events.OrderEvent) error

// Subscriber wraps a Redis PubSub connection and routes messages to registered handlers.
type Subscriber struct {
	client   *redis.Client
	handlers map[string]HandlerFunc
}

// NewSubscriber constructs a Subscriber backed by the provided Redis client.
func NewSubscriber(client *redis.Client) *Subscriber {
	return &Subscriber{
		client:   client,
		handlers: make(map[string]HandlerFunc),
	}
}

// Register binds a handler to a channel name.
func (s *Subscriber) Register(channel string, fn HandlerFunc) {
	s.handlers[channel] = fn
}

// Subscribe starts listening on all registered channels and blocks until ctx is
// cancelled.  Reconnects automatically on transient errors.
func (s *Subscriber) Subscribe(ctx context.Context) error {
	channels := make([]string, 0, len(s.handlers))
	for ch := range s.handlers {
		channels = append(channels, ch)
	}

	slog.Info("subscribing to redis channels", "channels", channels)

	for {
		if err := s.listen(ctx, channels); err != nil {
			if ctx.Err() != nil {
				// Context cancelled — clean shutdown.
				return nil
			}
			slog.Warn("redis subscriber error, reconnecting", "error", err, "backoff", "3s")
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(3 * time.Second):
			}
		}
	}
}

func (s *Subscriber) listen(ctx context.Context, channels []string) error {
	pubsub := s.client.Subscribe(ctx, channels...)
	defer func() {
		if err := pubsub.Close(); err != nil {
			slog.Warn("pubsub close error", "error", err)
		}
	}()

	// Confirm subscription.
	if _, err := pubsub.Receive(ctx); err != nil {
		return err
	}

	msgCh := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return nil

		case msg, ok := <-msgCh:
			if !ok {
				return nil
			}
			s.dispatch(ctx, msg)
		}
	}
}

func (s *Subscriber) dispatch(ctx context.Context, msg *redis.Message) {
	handler, ok := s.handlers[msg.Channel]
	if !ok {
		slog.Warn("no handler registered for channel", "channel", msg.Channel)
		return
	}

	var evt events.OrderEvent
	if err := json.Unmarshal([]byte(msg.Payload), &evt); err != nil {
		slog.Error("failed to unmarshal event", "channel", msg.Channel, "error", err, "payload", msg.Payload)
		return
	}

	slog.Debug("dispatching event", "type", evt.Type, "orderId", evt.Payload.ID)

	if err := handler(ctx, evt); err != nil {
		slog.Error("handler error", "channel", msg.Channel, "error", err)
	}
}
