#!/bin/sh

rivet backend build

(cd sdk && yarn)

# Copy to client
mkdir -p client/sdk/
cp sdk/dist/index.d.mts sdk/dist/index.mjs sdk/dist/index.mjs.map client/sdk/

