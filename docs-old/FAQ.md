# FAQ

## Who is this intended for?

## Who maintains Open Game Backend and why are they giving this away for free?

## Why not write it in...

### ...Rust?

### ...Go?

## Why not use the database...

### MongoDB

### MySQL/Vitess

### CockroachDB

Cockroach does not benefit from the same extension ecosystem that Postgres has.
While Cockroach has many scaling & performance benefits, it comes at the cost of
consistency trade offs and lacking from benefiting from the existing Postgres
documentation.

Cockroach is licensed under BSL. BSL is not a truely open source license. While
Open Game Backend could be built on top of Cockroach, it leaves the future of the project in
the hands of whatever Cockroach decides to do with their licensing. For example,
if they relicensed to SSPL, the entire Open Game Backend project would not be able to deliver
on its promise of flexible licensing and would also have to be relicensed as
SSPL.

Postgres can scale when needed.

## How does Open Game Backend scale?

## Why use raw SQL queries instead of an ORM?

We'll look at Prisma specifically as an example for demonstrating why we don't
want to use an ORM.

**Learning curve**

Open Game Backend is intended to be as approachable as possible. Prisma requires you to define
a schema file in their domain specific language. For a developer already trying
to learn how to use TypeScript, this adds extra bloat to

There is plenty of documentation online about how to use Postgres, using an ORM
makes all of that documentation hard to parse & convert to the Prisma way of
doing things.

**Complex migrations**

Often times, there needs to be migrations that do more than just update the
schema. This is why Open Game Backend ops to use incremental migration steps.

**Accidental performance pitfalls**

Prisma makes it easy to accidentally create `O(n)` responses since joining
tables are not intuitive for new users. Writing raw SQL queries helps prevent
this mishap.

**Bloat**

Prisma is a heavy library and often times buggy. Open Game Backend is intended to be as
lightweight as possible.

**Extensions**

A large part of why Open Game Backend is built on top of Postgres is the heavy extensibility
of Postgres as a backend. Prisma adds extra friction to use Postgres extensions.

**More**

LogRocket has a great article on why to avoid JS ORMs
[here](https://blog.logrocket.com/node-js-orms-why-shouldnt-use/).

## Why not use an existing migration library?

- **Simple** Open Game Backend should encourage raw SQL and vanilla TypeScript without any
  extra bloat (e.g. Prisma models, domain-specific languages)
- **Multiple migration types** Support both vanilla SQL migrations & custom
  TypeScript
- **Deno-native** The less we rely on Node modules, the better

## Why Deno?

Open Game Backend was initiated by a bunch of Rust nerds who value the quality of life tooling
provided around the language.

Deno aims to provide the same tooling (tests, documentation, formatting,
linting, package managers, etc) but for TypeScript, which provides faster
iteration speeds and is accessible to a wider audience than Rust.

## How does Open Game Backend compare to...

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

## Why generate JSON schema instead of using native TS decorators?

There are
[many other options](https://stackoverflow.com/questions/33800497/check-if-an-object-implements-an-interface-at-runtime-with-typescript)
that use JS decorators for validating & parsing input JSON.

We opt to generate [JSON schemas](https://json-schema.org/) from TypeScript
interfaces and use [ajv](https://www.npmjs.com/package/ajv) to validate input
types at runtime against the schemas.

Using JSON schemas allows us to:

- Generate OpenAPI specifications & client libraries automatically from
  TypeScript types
- Better standardize how data is validated
- Provide more validation types
- Allow for future flexibility in how we handle JSON schemas

## Why do modules have their own databsaes instead of schemas?

- Security
- Isolation
- Performance

TODO
