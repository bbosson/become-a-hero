#!/bin/bash
set -e

# HA add-on: read config via bashio if available, else use env vars already set
if command -v bashio &>/dev/null; then
  export DATABASE_URL=$(bashio::config 'database_url')
  export ANTHROPIC_API_KEY=$(bashio::config 'anthropic_api_key')
  export GEMINI_API_KEY=$(bashio::config 'gemini_api_key')
  export OPENAI_API_KEY=$(bashio::config 'openai_api_key')
  export ELEVENLABS_API_KEY=$(bashio::config 'elevenlabs_api_key')
fi

export PORT=${PORT:-3000}
export HOSTNAME="0.0.0.0"

echo "Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
