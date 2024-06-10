#!/bin/sh

curl -X POST "http://localhost:8080/modules/auth/scripts/auth_email_passwordless/call" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rivet.gg"
  }'

