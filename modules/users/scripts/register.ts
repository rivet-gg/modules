import { ScriptContext } from "@ogs/runtime";
import * as schema from "../db/schema.ts";
import { TokenWithSecret } from "../../tokens/schema/common.ts";
import { Response as TokenCreateResponse } from "../../tokens/scripts/create.ts";
import { drizzle, PostgresJsDatabase } from 'npm:drizzle-orm/postgres-js';

export interface Request {
	username: string;
	identity: IdentityType;
}

export interface Response {
	user: User;
	token: TokenWithSecret;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {
	
}



/* ===== under the hood */

interface OgsScript<THandler, TResponse extends () => infer R ? R : never> {
	handler: () => TResponse
}


interface OgsModuleConfig<TSchema  extends Record<string, unknown>> {
	schema: TSchema, 
	status: 'preview', 
	author: string,

}



const ogsModule = <TSchema extends Record<string, unknown>>(opts: OgsModuleConfig<TSchema>) => {
	return {
		handler: (name: string, fn: (ctx: {db: PostgresJsDatabase<TSchema>}) => void) => {
			return null;
		}
	}
}

/** fafafafajifaefajufjafa */

export const module = ogsModule({
	status: 'preview',
	author: '',
	schema,
});

module.handler('get', (ctx) => {


	ctx.db.

})






class Module {
	readMetadata() {}
	runScript() {}
}


export const handler = createOGSHandler((ctx, req, res) => /* ... */ void,
	{schema: {
		User,
	}
})

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.call("rate_limit", "throttle", { requests: 2, period: 5 * 60 });

	ctx.something();

	// Create user
	// const user = await ctx.postgres.transaction<User>("register", async (tx) => {
	// 	const userQuery = await tx.queryObject<
	// 		User
	// 	>`INSERT INTO users (username) VALUES (${req.username}) RETURNING *`;
	// 	const user = userQuery.rows[0];

	// 	const identity = await tx.queryObject<
	// 		{ id: string }
	// 	>`INSERT INTO identities (user_id) VALUES (${user.id}) RETURNING id`;
	// 	const identityId = identity.rows[0].id;

	// 	if (req.identity.guest) {
	// 		await tx
	// 			.queryObject`INSERT INTO identity_guests (identity_id) VALUES (${identityId})`;
	// 	} else {
	// 		throw new Error("Invalid identity type");
	// 	}

	// 	return user;
	// });

	// Create token
	const { token } = await ctx.call("tokens", "create", {
		type: "user",
		meta: { userId: user.id },
		expire_at: Temporal.Now.plainDateISO().add({ days: 30 }).toString(),
	}) as TokenCreateResponse;

	return { user, token };
}
