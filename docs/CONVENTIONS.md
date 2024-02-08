# TypeScript Conventions

## Camel case + acryonyms

OpenApi vs OpenAPI
Uuid vs UUID

TODO

## Uses of `id` included with type

`id` vs `userId`

TODO

## Externally tagged enums

Easy to represent in OpenAPI & external languages compared to internally tagged enums

Comes at the down side of not having exhaustive switch statements

## Avoid OOP at all costs

## Prefer interfaces for rich data, prefer classes for functional objects

`Trace` simply stores data. Helper functions can be published to manage traces.

`Context` and `Runtime` are functional classes that have associated methods & constructors.


