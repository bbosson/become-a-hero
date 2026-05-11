# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && node node_modules/prisma/build/index.js generate

FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN for i in 1 2 3; do apt-get update && break || sleep 5; done \
 && apt-get install -y --no-install-recommends --fix-missing \
      bash openssl nginx ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ARG PIPER_VERSION=2023.11.14-2
RUN ARCH=$(uname -m) \
 && case "$ARCH" in \
      x86_64)  PIPER_ARCH=linux_x86_64 ;; \
      aarch64) PIPER_ARCH=linux_aarch64 ;; \
      armv7l)  PIPER_ARCH=linux_armv7l ;; \
      *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_${PIPER_ARCH}.tar.gz" \
    | tar -xz -C /opt \
 && mkdir -p /opt/piper-voices/fr_FR \
 && curl -fsSL -o /opt/piper-voices/fr_FR/fr_FR-siwis-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx" \
 && curl -fsSL -o /opt/piper-voices/fr_FR/fr_FR-siwis-medium.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json"

ENV PIPER_BIN=/opt/piper/piper
ENV PIPER_VOICE=/opt/piper-voices/fr_FR/fr_FR-siwis-medium.onnx
ENV LD_LIBRARY_PATH=/opt/piper

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types
COPY tsconfig.server.json ./

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000
CMD ["/run.sh"]
