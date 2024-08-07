#!/bin/sh

curl -X POST "https://test-1-backe-1hv--staging.backend.nathan16.gameinc.io/modules/auth/scripts/send_email_verification/call" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rivet.gg"
  }'

