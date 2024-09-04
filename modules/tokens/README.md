# Tokens

The token module allows you to create, validate, fetch, and revoke tokens. These tokens are typically used for authentication and authorization purposes in your game backend.

## Common Use Cases

1. **User Authentication**: Create tokens when users log in and validate them on subsequent requests.
2. **Session Management**: Use tokens to maintain user sessions across multiple requests.
3. **API Access**: Generate tokens for third-party applications to access your game's API.
4. **Password Reset**: Create short-lived tokens for password reset functionality.
5. **Email Verification**: Generate tokens to verify user email addresses.

## Token Parameters

When creating or working with tokens, you'll encounter the following parameters:

1. `type` (string): Identifies the purpose of the token (e.g., "user", "api", "reset_password").
2. `meta` (object): Additional metadata associated with the token.
3. `expireAt` (string, optional): ISO 8601 timestamp for when the token should expire.
4. `token` (string): The actual token string used for authentication.
5. `id` (string): A unique identifier for the token.
6. `createdAt` (string): ISO 8601 timestamp of when the token was created.
7. `revokedAt` (string, optional): ISO 8601 timestamp of when the token was revoked, if applicable.

## Functionality

The token module provides the following core functions:

### 1. Create Token

Creates a new token with the specified parameters.

<CodeGroup>
```typescript scripts/create.ts
export interface Request {
	type: string;
	meta: Record<string, string>;
	expireAt?: string;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const tokenStr = generateToken(req.type);

	const rows = await ctx.db.insert(Database.tokens)
    .values({
      token: tokenStr,
      type: req.type,
      meta: req.meta,
      trace: ctx.trace,
      expireAt: req.expireAt ? new Date(req.expireAt) : undefined,
    })
    .returning();

	return {
		token: tokenFromRow(rows[0]!),
	};
}
```
</CodeGroup>

### 2. Validate Token

Validates a given token, checking if it exists and hasn't expired or been revoked.

<CodeGroup>
```typescript scripts/validate.ts
export interface Request {
	token: string;
}

export interface Response {
	token: Token;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { tokens } = await ctx.modules.tokens.fetchByToken({
		tokens: [req.token],
	});
	const token = tokens[0];

	if (!token) throw new RuntimeError("token_not_found");

	if (token.revokedAt) throw new RuntimeError("token_revoked");

	if (token.expireAt) {
		const expireAt = new Date(token.expireAt);
		const now = new Date();
		if (expireAt < now) {
			throw new RuntimeError("token_expired");
		}
	}

	return { token };
}
```
</CodeGroup>

### 3. Fetch Tokens

Retrieves token information based on token IDs.

<CodeGroup>
```typescript scripts/fetch.ts
export interface Request {
	tokenIds: string[];
}

export interface Response {
	tokens: Token[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
  const rows = await ctx.db.query.tokens.findMany({
    where: Query.inArray(Database.tokens.id, req.tokenIds),
    orderBy: [Query.desc(Database.tokens.createdAt)]
  });

	const tokens = rows.map(tokenFromRow);

	return { tokens };
}
```
</CodeGroup>

### 4. Fetch by Token

Retrieves token information based on the token strings.

<CodeGroup>
```typescript scripts/fetch_by_token.ts
export interface Request {
	tokens: string[];
}

export interface Response {
	tokens: Token[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
  const rows = await ctx.db.query.tokens.findMany({
    where: Query.inArray(Database.tokens.token, req.tokens),
    orderBy: [Query.desc(Database.tokens.createdAt)]
  });

	const tokens = rows.map(tokenFromRow);

	return { tokens };
}
```
</CodeGroup>

### 5. Revoke Tokens

Revokes one or more tokens, preventing their further use.

<CodeGroup>
```typescript scripts/revoke.ts
export interface Request {
	tokenIds: string[];
}

export interface Response {
	updates: { [key: string]: TokenUpdate };
}

export enum TokenUpdate {
	Revoked = "revoked",
	AlreadyRevoked = "already_revoked",
	NotFound = "not_found",
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	interface TokenRow {
		id: string;
		already_revoked: boolean;
	}

	// Sets revokedAt on all tokens that have not already been revoked. Returns
	// whether or not each token was revoked.
	const { rows }: { rows: TokenRow[] } = await ctx.db.execute(Query.sql`
		WITH pre_update AS (
			SELECT
				${Database.tokens.id} AS id,
				${Database.tokens.revokedAt} AS revoked_at
			FROM ${Database.tokens}
			WHERE ${Database.tokens.id} IN ${req.tokenIds}
		)
		UPDATE ${Database.tokens}
		SET revoked_at = COALESCE(${Database.tokens.revokedAt}, current_timestamp)
		FROM pre_update
		WHERE ${Database.tokens.id} = pre_update.id
		RETURNING
			${Database.tokens.id} AS id,
			pre_update.revoked_at IS NOT NULL AS already_revoked
	`);

	const updates: Record<string, TokenUpdate> = {};
	for (const tokenId of req.tokenIds) {
		const tokenRow = rows.find((row) => row.id === tokenId);
		if (tokenRow) {
			updates[tokenId] = tokenRow.already_revoked
				? TokenUpdate.AlreadyRevoked
				: TokenUpdate.Revoked;
		} else {
			updates[tokenId] = TokenUpdate.NotFound;
		}
	}

	return { updates };
}
```
</CodeGroup>

### 6. Extend Token

Extends the expiration date of a token.

<CodeGroup>
```typescript scripts/extend.ts
export interface Request {
	token: string;
	newExpiration: string | null;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Ensure the token hasn't expired or been revoked yet
	const { token } = await ctx.modules.tokens.validate({
		token: req.token,
	});

	// Update the token's expiration date
  const rows = await ctx.db.update(Database.tokens)
    .set({ expireAt: req.newExpiration ? new Date(req.newExpiration) : null })
    .where(Query.eq(Database.tokens.id, token.id))
    .returning();

	// Return the updated token
	return {
		token: tokenFromRow(rows[0]!),
	};
}
```
</CodeGroup>

## Errors

The token module can throw the following errors:

1. `token_not_found`: The specified token does not exist.
2. `token_revoked`: The token has been revoked and is no longer valid.
3. `token_expired`: The token has expired and is no longer valid.

## Common Patterns

### 1. Creating and Using User Tokens

When a user logs in, create a token and return it to the client:

```typescript
const { token } = await ctx.modules.tokens.create({
  type: "user",
  meta: { userId: user.id },
  expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
});

// Return token to client
return { userToken: token.token };
```

On subsequent requests, validate the token:

```typescript
const { token } = await ctx.modules.tokens.validate({
  token: req.userToken,
});

// Use token.meta.userId to identify the user
const userId = token.meta.userId;
```

### 2. Passing Tokens in Requests

Tokens are typically passed in the `Authorization` header of HTTP requests:

```http
Authorization: Bearer <token>
```

In your route handlers, you can extract and validate the token:

```typescript
export async function run(ctx: RouteContext, req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new RuntimeError("invalid_auth_header");
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const { token: validatedToken } = await ctx.modules.tokens.validate({ token });
    // Use validatedToken.meta to access token metadata
  } catch (error) {
    if (error instanceof RuntimeError && error.code === "token_not_found") {
      throw new RuntimeError("unauthorized");
    }
    throw error;
  }

  // Proceed with the authenticated request
}
```

### 3. Revoking Tokens on Logout

When a user logs out, revoke their token:

```typescript
await ctx.modules.tokens.revoke({
  tokenIds: [userToken.id],
});
```

### 4. Using Short-lived Tokens for Password Reset

Create a short-lived token for password reset:

```typescript
const { token } = await ctx.modules.tokens.create({
  type: "password_reset",
  meta: { userId: user.id },
  expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
});

// Send token to user's email
await sendPasswordResetEmail(user.email, token.token);
```

When the user clicks the reset link, validate the token:

```typescript
const { token } = await ctx.modules.tokens.validate({
  token: req.resetToken,
});

// Ensure token type is correct
if (token.type !== "password_reset") {
  throw new RuntimeError("invalid_token_type");
}

// Allow password reset for token.meta.userId
```

By following these patterns and utilizing the token module's functionality, you can implement secure authentication and authorization in your Open Game Backend projects.

## FAQ

### Why not use JWTs?

**Performance**

JWTs are often touted as better performing since you can cryptographically
validate them. However, you still need to check the database to see if the token
is expired, which is just as slow as handling normal tokens. Opt for better
caching.

**Simplicity**

JWTs require handling & rotating a private key, in addition to being able to
blacklist tokens in case of a leaked private key. This is cumbersome and error
prone.

**Length**

JWTs are _long_ and are cumbersome to copy & paste. Database-backed tokens can
store unlimited metadata.
