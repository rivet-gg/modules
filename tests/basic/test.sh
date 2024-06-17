#!/bin/sh

curl -X POST "http://localhost:6420/modules/auth/scripts/send_email_verification/call" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rivet.gg"
  }'

