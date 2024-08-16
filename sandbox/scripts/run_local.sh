#!/usr/bin/env bash
set -euo pipefail

export BACKEND_ENDPOINT="http://127.0.0.1:6420"

# Function to clean up background processes
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Run backend
./scripts/run_local_backend.sh 2>&1 | sed 's/^/[BACKEND] /' &

# Wait until port 6420 is reachable
echo "Waiting for backend to start..."
while ! nc -z localhost 6420; do   
  sleep 0.1
done
echo "Backend started"

# Run other components
./scripts/run_local_game_server.sh 2>&1 | sed 's/^/[GAME_SERVER] /' &
./scripts/run_local_client.sh 2>&1 | sed 's/^/[CLIENT] /' &

# Wait for all background processes to finish
wait