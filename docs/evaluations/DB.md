# Database

## Requirements

- Transactions
- Handle high amount of writes
- Indexes

## Postgres

The future is Postgres. Everyone is building for Postgres. Always bet on
Postgres. Don't reinvent the wheel, as tempting as it is. Don't mess with poorly
licensed or closed source databases. Postgres provides the tooling you need.
Postgres data will always be correct, handling corruption in NoSQL is not great.
Neon has proven to scale. Postgres is great for prototyping and scaling. If
you're at scale, there are many commercial services that can help you scale in
in different methods (Citus, CockroachDB, etc). Prisma makes it easy to switch
databases, so you can always switch to MySQL + PlanetScale or MongoDB for data
that requires those use cases. Extensions make "can I do X" almost always a
"yes." Postgres is more correct that MySQL.

https://akorotkov.github.io/blog/2016/05/09/scalability-towards-millions-tps/

## If scalability was a concern

### MongoDB

### DynamoDB & Cassandra

### PlanetScale/Vitess

## SQL vs KV

## SQL vs NoSQL (Cassandra/DynamoDB)

## SQL vs MongoDB

## New players

### SurrealDB

### FaunaDB

## More

https://leerob.io/blog/backend
