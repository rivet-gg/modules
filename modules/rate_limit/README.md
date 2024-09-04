# Rate Limit

Rate limiting is a crucial aspect of managing your game's backend to prevent abuse and ensure fair usage of your resources. The `rate_limit` module in Open Game Backend provides an easy way to implement rate limiting for your scripts.

## What is Rate Limiting?

Rate limiting restricts the number of requests a client can make to your backend within a specified time period. This helps to:

1. Prevent abuse and potential DoS attacks
2. Ensure fair usage of resources among all users
3. Manage server load and maintain performance

## Using the Rate Limit Module

The `rate_limit` module provides two main scripts:

1. `throttle`: For general-purpose rate limiting
2. `throttle_public`: Specifically designed for rate limiting public scripts

Let's focus on `throttle_public` as it's the recommended method for rate limiting public scripts.

### Throttling Public Scripts

To rate limit a public script, you can use the `throttle_public` script at the beginning of your script. Here's how to use it:

<CodeGroup>
```typescript scripts/my_public_script.ts
import { ScriptContext } from "../module.gen.ts";

export interface Request {
  // Your request parameters here
}

export interface Response {
  // Your response type here
}

export async function run(
  ctx: ScriptContext,
  req: Request
): Promise<Response> {
  // Apply rate limiting
  await ctx.modules.rateLimit.throttlePublic({});

  // Your script logic here
  // ...

  return {
    // Your response here
  };
}
```
</CodeGroup>

The `throttlePublic` script automatically uses the client's IP address for rate limiting. By default, it allows 20 requests per 5 minutes (300 seconds) for each IP address.

### Customizing Rate Limits

You can customize the rate limit by passing parameters to `throttlePublic`:

<CodeGroup>
```typescript scripts/my_custom_rate_limited_script.ts
export async function run(
  ctx: ScriptContext,
  req: Request
): Promise<Response> {
  // Custom rate limit: 5 requests per 1 minute
  await ctx.modules.rateLimit.throttlePublic({
    requests: 5,
    period: 60
  });

  // Your script logic here
  // ...
}
```
</CodeGroup>

## Best Practices for Rate Limiting

1. **Only Rate Limit Public Scripts**: Apply rate limiting to public scripts that are directly accessible by clients. Internal scripts called by other modules typically don't need rate limiting.

2. **Choose Appropriate Limits**: Set rate limits that balance protection against abuse with legitimate usage patterns. Consider your game's requirements and user behavior.

3. **Use `throttle_public` for Client-Facing Scripts**: The `throttle_public` script is designed to work with client IP addresses automatically, making it ideal for public-facing endpoints.

4. **Consistent Application**: Apply rate limiting consistently across all public endpoints to prevent attackers from finding unprotected routes.

5. **Monitor and Adjust**: Regularly review your rate limits and adjust them based on real-world usage and any issues that arise.

6. **Inform Users**: When a rate limit is exceeded, return a clear error message to the client so they understand why their request was blocked.

7. **Consider Different Limits for Different Actions**: Some actions might require stricter rate limits than others. For example:

   <CodeGroup>
   ```typescript scripts/login.ts
   export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
     // Stricter rate limit for login attempts
     await ctx.modules.rateLimit.throttlePublic({
       requests: 5,
       period: 300 // 5 minutes
     });

     // Login logic here
     // ...
   }
   ```

   ```typescript scripts/fetch_game_state.ts
   export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
     // More lenient rate limit for fetching game state
     await ctx.modules.rateLimit.throttlePublic({
       requests: 60,
       period: 60 // 1 minute
     });

     // Fetch game state logic here
     // ...
   }
   ```
   </CodeGroup>

8. **Handle Rate Limit Errors Gracefully**: In your client-side code, be prepared to handle rate limit errors and potentially implement exponential backoff for retries.

## Example: Rate Limited Leaderboard Fetch

Here's an example of how you might implement a rate-limited public script for fetching a game leaderboard:

<CodeGroup>
```typescript scripts/fetch_leaderboard.ts
import { ScriptContext } from "../module.gen.ts";

export interface Request {
  gameMode: string;
  limit: number;
}

export interface Response {
  leaderboard: LeaderboardEntry[];
}

interface LeaderboardEntry {
  username: string;
  score: number;
}

export async function run(
  ctx: ScriptContext,
  req: Request
): Promise<Response> {
  // Apply rate limiting: 10 requests per minute
  await ctx.modules.rateLimit.throttlePublic({
    requests: 10,
    period: 60
  });

  // Validate request
  if (req.limit > 100) {
    throw new Error("Limit cannot exceed 100");
  }

  // Fetch leaderboard logic here (example)
  const leaderboard = await ctx.modules.gameData.getLeaderboard(req.gameMode, req.limit);

  return {
    leaderboard
  };
}
```
</CodeGroup>

In this example, we've applied a rate limit of 10 requests per minute to the leaderboard fetch script. This allows frequent updates for players while still protecting the backend from excessive requests.
