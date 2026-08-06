#!/bin/sh
# Migrasi otomatis: sekali utk shared DB (DATABASE_URL), sekali utk local DB (LOCAL_DATABASE_URL).
# Journal migrasi berisi SEMUA tabel (shared + local) — dijalankan 2x dengan env di-swap.
set -e

echo "[entrypoint] migrating shared DB..."
DATABASE_URL="${DATABASE_URL}" bunx drizzle-kit migrate

echo "[entrypoint] migrating local DB..."
LOCAL_URL="${LOCAL_DATABASE_URL}"
DATABASE_URL="${LOCAL_URL}" bunx drizzle-kit migrate

echo "[entrypoint] starting worker..."
exec bun dist/main.js
