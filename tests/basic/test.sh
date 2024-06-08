#!/bin/sh

curl -X POST "https://f9c627f2-bdc-yaw--staging.opengb.rivet.gg/modules/auth/scripts/auth_email_passwordless/call" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rivet.gg"
  }'

