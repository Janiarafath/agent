# GrowthPilot production image: FastAPI brain + Baileys WA engine in ONE box.
# Fits Koyeb free (512MB): backend ~150MB + wa ~80MB. Secrets via env, NEVER baked in.
FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first (best layer cache)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r backend/requirements.txt

# Node deps for BOTH wa-service (code) and whatsapp_service (node_modules it reuses)
COPY whatsapp_service/package.json ./whatsapp_service/package.json
RUN cd whatsapp_service && (npm ci --omit=dev 2>/dev/null || npm install --omit=dev) && npm cache clean --force

# App code
COPY backend ./backend
COPY wa-service ./wa-service
COPY start.sh ./start.sh
RUN chmod +x start.sh

# Koyeb injects $PORT; default 8000 local
EXPOSE 8000
CMD ["./start.sh"]
