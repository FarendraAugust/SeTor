#!/bin/bash
# Tail log worker 1, worker 2, dan dashboard sekaligus dengan label.
LOG_DIR=/tmp/opencode
tail -n 50 -f "$LOG_DIR/setor-w1.log" -f "$LOG_DIR/setor-w2.log" -f "$LOG_DIR/dashboard-dev.log" \
  -F 2>/dev/null || tail -n 50 -f \
  "$LOG_DIR/setor-w1.log" "$LOG_DIR/setor-w2.log" "$LOG_DIR/dashboard-dev.log"