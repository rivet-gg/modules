#!/bin/bash

# Get the current Git reference (commit hash or tag)
GIT_REF=$(git rev-parse HEAD)

# Build and push the Docker image
docker buildx build \
  --builder rivet_cli \
  --platform linux/arm64,linux/amd64 \
  -t rivetgg/opengb:${GIT_REF} \
  --push \
  --file cli.Dockerfile \
  .
