# Middleware brainstorm

## Goals

- type safe middlewares
- not import module directly
- future proofing
- integrate in module.json
- allow running middleware on remote functions without them knowing?

## Option A: integrate with request response

pros:

- simple, works with existing type systems

cons:

- error prone for user spoofing

## Option B: middleware context as any

## Option C: call module directly

pros:

- simple

cons:

- does not allow for verifying a rate limit is enabled on everything
