#!/bin/sh

curl -X POST "https://sandbox--staging.backend.rivet.gg/modules/auth/scripts/send_email_verification/call" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rivet.gg"
  }'

