# Open Game Services (OGS)

## Development

**Setup Dev Environment**

```
deno task dev:setup
```

**Start OGS server**

```
deno task start:watch
```

Under the hood, this runs:

- `deno task build`
- `deno task migrate`
- `deno task entrypoint:watch`

You can also run each one individually.

**Run tests**

_OGS testing is very WIP at the moment._

This does not require restarting the server

```
deno task build
deno task test modules/tokens/tests/e2e.ts
```

**Generate SDKs**
To generate SDKs to :

```
deno task sdk:gen
```

SDKs are generated at `dist/sdks/`.

**OpenAPI & Postman/Insomnia/Paw**

Explore the APIs by opening `dist/openapi.json` in Postman/Insomnia/Paw.

## Goals

- **Package manager for game services** Adding backend functionality to your game should be as easy as one command
- **Easy to use for game devs** Designed from the ground up to be approachable by game developers to add backend functionality to their game
- **Easy to modify for everyone** Modules are built to be as simple as possible and rigorously reviewed before merging
- **Modular** Add, remove, and modify modules from the backend to fit the use case for your game
- **Portable & lightweight** Built on boring, reliable technology that runs however you want to run OGS
- **Community-driven** Modularity make it easy for devs to customize for their own use cases & contribute modules
- **Secure by default** Security & anti-botting should not be an afterthought for gaming backends
- **Load test everything** Everything is load tested to prevent surprises on launch day
- **Strict schemas for everything**
- **Documented** Strict typings & documentation are _required_ to make this easy to approach
- **Permissively licensed** Apache 2.0 license allows developers to adapt & modify & redistribute
- **Language agnostic** Performance critical parts of the project will likely be optimized to use a high performance language, such as Rust

## Technologies Used

- TypeScript
- Deno
- Postgres
- Redis

## Who uses OGS?

TODO

## FAQ

See [here](./docs/FAQ.md).

## Support

**Community**

Create a GitHub issue.

**Enterprise**

The following companies provide enterprise support & custom modules for OGS:

- [Rivet](https://rivet.gg/support)
- _Create a PR to list your services for OGS_

## Modules

TODO

