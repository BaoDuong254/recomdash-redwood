package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the Go service.
type Config struct {
	Port  string
	Redis RedisConfig
	Env   string
}

// RedisConfig holds Redis connection parameters.
type RedisConfig struct {
	Addr     string
	Username string
	Password string
	DB       int
}

// Load reads configuration from environment variables.
// In development it also attempts to load a .env file from the working directory.
func Load() (*Config, error) {
	// Best-effort: ignore error when .env is absent (production / Docker)
	_ = godotenv.Load()

	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil {
		return nil, fmt.Errorf("invalid REDIS_DB value: %w", err)
	}

	// REDIS_ADDR takes precedence; fall back to HOST:PORT construction.
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		host := getEnv("REDIS_HOST", "localhost")
		port := getEnv("REDIS_PORT", "6379")
		redisAddr = host + ":" + port
	}

	return &Config{
		Port: getEnv("PORT", "8080"),
		Env:  getEnv("APP_ENV", "development"),
		Redis: RedisConfig{
			Addr:     redisAddr,
			Username: getEnv("REDIS_USERNAME", "default"),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       redisDB,
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
