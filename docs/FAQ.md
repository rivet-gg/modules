# FAQ

## Who is this intended for?

## Who maintains OGS and why are they giving this away for free?

## Why not write it in...

### ...Rust?

### ...Go?

## Why not use the database...

### MongoDB

### MySQL/Vitess

### CockroachDB

Cockroach does not benefit from the same extension ecosystem that Postgres has. While Cockroach has many scaling & performance benefits, it comes at the cost of consistency trade offs and lacking from benefiting from the existing Postgres documentation.

## How does OGS scale?

## Why use raw SQL queries instead of an ORM?

We'll look at Prisma specifically as an example for demonstrating why we don't want to use an ORM.

**Learning curve**

OGS is intended to be as approachable as possible. Prisma requires you to define a schema file in their domain specific language. For a developer already trying to learn how to use TypeScript, this adds extra bloat to 

There is plenty of documentation online about how to use Postgres, using an ORM makes all of that documentation hard to parse & convert to the Prisma way of doing things.

**Complex migrations**

Often times, there needs to be migrations that do more than just update the schema. This is why OGS ops to use incremental migration steps.

**Accidental performance pitfalls**

Prisma makes it easy to accidentally create `O(n)` responses since joining tables are not intuitive for new users. Writing raw SQL queries helps prevent this mishap.

**Bloat**

Prisma is a heavy library and often times buggy. OGS is intended to be as lightweight as possible.

**Extensions**

A large part of why OGS is built on top of Postgres is the heavy extensibility of Postgres as a backend. Prisma adds extra friction to use Postgres extensions.

**More**

LogRocket has a great article on why to avoid JS ORMs [here](https://blog.logrocket.com/node-js-orms-why-shouldnt-use/).

## Why not use an existing migration library?

- **Simple** OGS should encourage raw SQL and vanilla TypeScript without any extra bloat (e.g. Prisma models, domain-specific languages)
- **Multiple migration types** Support both vanilla SQL migrations & custom TypeScript
- **Deno-native** The less we rely on Node modules, the better

## How does OGS compare to...

### Unity Game Services

### Nakama

### Playfab

### Pragma/AccelByte

### Beamable

## Why not keep each module in a separate GitHub repo?

## Why use UUIDs for everything?

TODO

## WHy not allow down migrations?

TODO

