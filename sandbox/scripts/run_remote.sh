#!/usr/bin/env bash

set -euo pipefail

export BACKEND_ENDPOINT="https://modules-sand-m4z.backend.staging2.gameinc.io"

# Function to clean up background processes
cleanup() {
    echo "Stopping all processes..."
    kill $(jobs -p) 2>/dev/null
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# Run client
./scripts/run_local_client.sh 2>&1 | sed 's/^/[CLIENT] /'
