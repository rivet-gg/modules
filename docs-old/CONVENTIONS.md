# TypeScript Conventions

## Use interfaces & functions, not classes

Use exclusively interfaces & standalone functions internally. This keeps code
clean, legible, and easy to refactor at the cost of slightly more verbosity.

Examples: `Project`, `Registry`, `Module`, `Script`

## Only use classes for developer-facing APIs

We don't expect the user to use pure interfaces & functions; consuming well
designed OOP interfaces can be cleaner.

Examples of using classes: `Context` and `Runtime` are classes designed to have
a clean interface for the user.

Examples of using interfaces: `Trace` is a simple data container that can be
easily serialized & deserialized. There are standalone functions that can
operate on a trace.

## Camel case + acryonyms

Follow camel case strictly & treat acronyms as single words.

Examples:

- Prefer `OpenApi` insetad of `OpenAPI`
- Prefer `Uuid` instead of `UUID`

## Uses of `id` included with type

When referring to the ID of the current type, use `id`. When referring to a
foreign type, use `{type name}Id`.

Example:

```prisma
model User {
    id    String @id @default(uuid()) @db.Uuid
    posts Post[]
}

model Post {
    id     String @id @default(uuid()) @db.Uuid
    userId String @db.Uuid
    user   User   @relation(fields: [userId], references: [id])
}
```

## Externally tagged enums

When representing an enum with associated data (often called "sum types" which are a kind of algebreic data type, ADT), represent using a nested object (often called "externally tagged enums").

This comes at the expense of not having exhaustive switch statements.

Externally tagged enums are easy to represent in languages that don't support advanced type constraints, such as C# and most OpenAPI SDK generators (i.e. don't support `oneOf`).

This example:

```typescript
type MyEnum = { foo: MyEnumFoo } | { bar: MyEnumBar } | { baz: MyEnumBaz };

interface MyEnumFoo {

}

interface MyEnumBar {

}

interface MyEnumBaz {

}
```

Can be represented in C# like this:

```cs
class MyEnum {
    MyEnumFoo? Foo;
    MyEnumBar? Bar;
    MyEnumBaz? Baz;
}

class MyEnumFoo {
}

class MyEnumBar {
}

class MyEnumBaz {
}
```
