#!/bin/bash
set -e

# HA add-on: /data/options.json is injected by HA regardless of base image
if [ -f /data/options.json ]; then
  echo "Using /data/options.json..."
  export DATABASE_URL=$(node -e "process.stdout.write(require('/data/options.json').database_url||'')")
  export ANTHROPIC_API_KEY=$(node -e "process.stdout.write(require('/data/options.json').anthropic_api_key||'')")
  export GEMINI_API_KEY=$(node -e "process.stdout.write(require('/data/options.json').gemini_api_key||'')")
  export OPENAI_API_KEY=$(node -e "process.stdout.write(require('/data/options.json').openai_api_key||'')")
  export ELEVENLABS_API_KEY=$(node -e "process.stdout.write(require('/data/options.json').elevenlabs_api_key||'')")
elif command -v bashio &>/dev/null; then
  echo "Using bashio..."
  export DATABASE_URL=$(bashio::config 'database_url')
  export ANTHROPIC_API_KEY=$(bashio::config 'anthropic_api_key')
  export GEMINI_API_KEY=$(bashio::config 'gemini_api_key')
  export OPENAI_API_KEY=$(bashio::config 'openai_api_key')
  export ELEVENLABS_API_KEY=$(bashio::config 'elevenlabs_api_key')
fi

export PORT=3001
export HOSTNAME="0.0.0.0"

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js on port 3001..."
node server.js &

echo "Starting nginx on port 3000..."
exec nginx -g "daemon off;"
