# Open Game Services (OGS)

## Install

**From GitHub (recommended)**

```
deno install --allow-net --allow-read --allow-env --allow-run --allow-write --name ogs --force https://raw.githubusercontent.com/rivet-gg/open-game-services-engine/main/src/cli/main.ts
```

**From source**

After cloning the repo, run:

```
deno install --allow-net --allow-read --allow-env --allow-run --allow-write --name ogs --force src/cli/main.ts
```

## Usage

**Setup Dev Environment**

```
ogs dev setup
```

**Start OGS server**

```
ogs dev start
```

**Run tests**

```
ogs test
```

**Creating modules & scripts**

Create module:

```
ogs create module foo
```

Create script:

```
ogs create script foo bar
```

**Generate SDKs**

```
ogs sdk generate
```

SDKs are generated to `dist/sdks/`.

**OpenAPI & Postman/Insomnia/Paw**

Explore the APIs by opening `dist/openapi.json` in Postman/Insomnia/Paw.

## Goals

- **Modular** Add, remove, and modify modules from the backend to fit the use
  case for your game
- **Easy to use for game devs** The Engine takes care of the hard stuff so
  adding functionality is dead simple
- **Secure & load tested** Security, laod testing & anti-botting is not an
  afterthought
- **Strict schemas & documentation** Strict typings & documentation are
  _required_ to make this easy to approach
- **Portable & lightweight** Built on boring, reliable technology that runs
  however you want to run OGS
- **Package manager for game services** Adding backend functionality to your
  game should be as easy as one command
- **Permissively licensed** Apache 2.0 license allows developers to adapt,
  modify, & redistribute

## Technologies Used

- Language: TypeScript
- Runtime: Deno
- Database: Postgres
- ORM: Prisma

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
