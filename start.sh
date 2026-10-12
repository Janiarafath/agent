#!/bin/sh
# One box, two processes. Koyeb sends $PORT; default 8000.
PORT=${PORT:-8000}
export WA_PORT=3001
# Ephemeral disk on free tiers: sessions live until redeploy (vault resurrects).
export WA_AUTH_DIR=/tmp/wa-auth
mkdir -p "$WA_AUTH_DIR"
# Watchdog: the WA engine must NEVER stay dead (freeze/thaw kills background
# procs while uvicorn survives). Restart it if it exits, forever.
# (PID-based, no extra packages needed.)
(
WA_PID=""
while true; do
  if [ -z "$WA_PID" ] || ! kill -0 "$WA_PID" 2>/dev/null; then
    echo "[watchdog] wa-service down — restarting"
    node wa-service/server.js >> /tmp/wa.log 2>&1 &
    WA_PID=$!
  fi
  sleep 20
done
) &
node wa-service/server.js >> /tmp/wa.log 2>&1 &
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
