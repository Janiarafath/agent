#!/bin/sh
# One box, two processes. Koyeb sends $PORT; default 8000.
PORT=${PORT:-8000}
export WA_PORT=3001
# Ephemeral disk on free tiers: sessions live until redeploy (rescan then).
export WA_AUTH_DIR=/tmp/wa-auth
mkdir -p "$WA_AUTH_DIR"
node wa-service/server.js >> /tmp/wa.log 2>&1 &
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
