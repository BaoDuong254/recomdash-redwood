#!/bin/sh
set -e

SCHEMA="api/db/schema.prisma"
PRISMA="node node_modules/prisma/build/index.js"

echo "Running database migrations..."

if OUTPUT=$($PRISMA migrate deploy --schema "$SCHEMA" 2>&1); then
  echo "$OUTPUT"
else
  echo "$OUTPUT"
  # P3005: schema already exists but has no migration history (e.g. bootstrapped
  # with `db push`). Baseline every migration so Prisma treats them as applied,
  # then run migrate deploy to pick up anything truly new.
  if echo "$OUTPUT" | grep -q "P3005"; then
    echo "Detected existing schema without migration history. Baselining..."
    for migration_dir in api/db/migrations/*/; do
      [ -d "$migration_dir" ] || continue
      migration_name=$(basename "$migration_dir")
      echo "  Marking as applied: $migration_name"
      $PRISMA migrate resolve --applied "$migration_name" --schema "$SCHEMA"
    done
    echo "Baselining complete. Running migrate deploy..."
    $PRISMA migrate deploy --schema "$SCHEMA"
  else
    exit 1
  fi
fi

echo "Starting API server..."
exec node_modules/.bin/rw-server api
