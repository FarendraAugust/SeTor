#!/bin/bash
# Start cluster monitoring: 2 worker node (worker/, worker-1/) + dashboard.
# Log disimpan di /tmp/opencode untuk akses cepat.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR=/tmp/opencode
mkdir -p "$LOG_DIR"

pkill -f 'main[.]ts' || true
pkill -f 'next[ ]dev' || true
pkill -f 'next-server' || true
sleep 1

cd "$ROOT/worker"     && setsid nohup bun dev > "$LOG_DIR/setor-w1.log"     2>&1 < /dev/null &
cd "$ROOT/worker-1"   && setsid nohup bun dev > "$LOG_DIR/setor-w2.log"     2>&1 < /dev/null &
cd "$ROOT/dashboard"  && setsid nohup bun run dev > "$LOG_DIR/dashboard-dev.log" 2>&1 < /dev/null &
sleep 1
echo "started (workers: pod 3101/3102, dashboard: 3000)"