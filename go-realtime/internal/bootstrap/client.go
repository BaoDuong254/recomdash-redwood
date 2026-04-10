// Package bootstrap provides a client for fetching the initial dashboard
// projection baseline from the Redwood API's dashboardBootstrap function.
// It is called once on Go service startup when Redis holds no projection,
// ensuring the dashboard never shows all-zero data from an uninitialised state.
package bootstrap

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/recomdash/go-realtime/internal/events"
)

// Response is the JSON body returned by the dashboardBootstrap function.
type Response struct {
	// Orders contains every non-deleted order's contribution fields.
	// The Go service rebuilds its full projection from this list.
	Orders []events.OrderRecord `json:"orders"`
}

// Client fetches baseline dashboard data from the Redwood API.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient returns a Client targeting the given Redwood API base URL
// (e.g. "http://localhost:8911").
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// FetchBaseline calls GET <baseURL>/dashboardBootstrap and returns the list of
// all non-deleted orders needed to rebuild the projection from scratch.
func (c *Client) FetchBaseline(ctx context.Context) ([]events.OrderRecord, error) {
	url := c.baseURL + "/dashboardBootstrap"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build bootstrap request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bootstrap GET %s: %w", url, err)
	}

	defer func() {
		if err := resp.Body.Close(); err != nil {
			fmt.Printf("bootstrap response body close error: %v\n", err)
		}
	}()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bootstrap endpoint returned %d (expected 200)", resp.StatusCode)
	}

	var body Response
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode bootstrap response: %w", err)
	}
	return body.Orders, nil
}
