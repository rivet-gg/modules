# Drizzle

**Querying**
https://github.com/rivet-gg/opengb-engine/blob/823becd385ee3a1c6bd05172577a19441716eaa4/modules/users/scripts/get.ts#L18

The `inArray` function either needs to be imported or used in this weird
function interface. Intellisense isn't helpful here, you have to read the docs
to understand this.

Ideally this looks like sort of like:

```
await ctx.db.users.select().where({ id: { inArray: xxx } })
```

**Inserting**
https://github.com/rivet-gg/opengb-engine/blob/823becd385ee3a1c6bd05172577a19441716eaa4/modules/users/scripts/register.ts#L27

You have to pass the schema in to the `.insert(` command, which is confusing
compared to the `db.query`. I would not be able to figure this out without an
example.

Ideally this looks sort of like:

```
await ctx.db.users.insert({ username: "abc123" })
```

**Migrations**

The Drizzle way of auto-generating migrations incrementally is pretty slick,
I'll give them that.

But writing the migrations is nails on a chalkboard:
https://github.com/rivet-gg/opengb-engine/blob/823becd385ee3a1c6bd05172577a19441716eaa4/modules/users/db/schema.ts#L4

Need to read docs to know what to insert, default is not immediately obvious,
references functions are wonky. To be clear, all of this is clean if you're a
TypeScript native, but not if you're not well versed with backends.

---

If I were writing something in TypeScript that didn't need external
contributors, I'd probably go with Drizzle. It's really neat. But I don't think
it's right for this project.
