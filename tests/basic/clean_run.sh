#!/bin/sh

(cd ../.. && docker build -f cli.Dockerfile -t opengb .) && docker run --privileged -it --add-host=host.docker.internal:host-gateway -e VERBOSE=1 -v ./:/backend -w /backend opengb dev
# (cd ../.. && deno task cli:install) && opengb clean && opengb dev
