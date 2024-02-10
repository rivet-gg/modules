- Standardize errors (see below)
- Configure script triggers
  - Call
  - HTTP API
- Enable calling endpoints
- Rivet auth
- Find a cool demo that can be ran quickly in the browser
- Logging

## Expandables

- Add expandable to friends API

## Templating

- create module
- create script

## Users

- Register (idenitty)

## Configs

- Add config.ts file in modules
- Will be passed from the root config.yaml

## Standardize errors

- Create error registry
- Throw errors for token validation

## Database querying

- Investigate Prisma or TypeORM or Knex again
- Standardize camel case & snake case for rows/queries
  - Create snake -> camel converter helper?
  - Store as camel in database?
- Add simple KV storage?
- Add shorthand for querying
- Validating schemas

## Middleware

- Core middlewares
  - Token auth
  - Rate limits
- How does data get passed to modules from middleware?

## Analytics plugin

- Publish event for analytics
- Analytics service will write to either Rivet or PostHog or GA

## Realtime

- Use Redis pub/sub (with clustering)

## Caching

- Add cluster-compatible caching & cache invalidation

## Monitoring

- Add Prometheus monitoring

## Realtime apis

- Should realtime events be triggered on database updates or something else?
- Publish events to topics
- Allow streaming events in respose

## Big long term

- Automatic type definition generation for `ctx.call`
- Allow for multi-file scripts, or have a recommended way of managing libraries
- One-click deploys
- Docs on ORMs
- Create isolated database for each test

## Small long term

- Add `last_online_at` to users by listening for online events that can be
  joined, optionally by this
