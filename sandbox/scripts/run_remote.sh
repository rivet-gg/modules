#!/usr/bin/env bash

set -euo pipefail

export BACKEND_ENDPOINT="https://sandbox-back-vlk--staging.backend.nathan16.gameinc.io"

# Function to clean up background processes
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Run components
# ./scripts/run_local_backend.sh 2>&1 | sed 's/^/[BACKEND] /' &
# ./scripts/run_local_game_server.sh 2>&1 | sed 's/^/[GAME_SERVER] /' &
./scripts/run_local_client.sh 2>&1 | sed 's/^/[CLIENT] /' &

# Wait for all background processes to finish
wait
