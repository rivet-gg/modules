import { RuntimeError } from "@ogs/helpers/invites/scripts/clean_expired.ts";
import { ScriptContext } from "@ogs/helpers/invites/scripts/clean_expired.ts";

export interface Request {}

export interface Response {
	cleaned: number;
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	await ctx.modules.rate_limit.throttle({ requests: 50 });
	
	const count = await ctx.db.$transaction(async (tx) => {
		let runningTotal = 0;
		try {
			const [{ count: directionalDeleted }, { count: nondirectionalDeleted }] = await Promise.all([
				tx.activeDirectionalInvite.deleteMany({ where: {
					expiration: { lt: new Date() },
					hidePostExpire: true,
				} }),
				tx.activeNondirectionalInvite.deleteMany({
					where: {
						expiration: { lt: new Date() },
						hidePostExpire: true,
					}
				}),
			]);

			runningTotal += directionalDeleted;
			runningTotal += nondirectionalDeleted;
		} catch (e) {
			throw new RuntimeError("FAILED_TO_DELETE_INVITES", { cause: e });
		}

		try {
			const [expiredDirectional, expiredNondirectional] = await Promise.all([
				tx.activeDirectionalInvite.findMany({
					where: {
						expiration: { lt: new Date() },
						hidePostExpire: false,
					},
				}),
				tx.activeNondirectionalInvite.findMany({
					where: {
						expiration: { lt: new Date() },
						hidePostExpire: false,
					},
				}),
			]);

			const expiredInvites = [
				...expiredDirectional.map(invite => ({
					...invite,
					directional: true,
				})),
				...expiredNondirectional.map(invite => ({
					...invite,
					directional: false,
					fromUserId: invite.senderId,
					toUserId: invite.userAId === invite.senderId ? invite.userBId : invite.userAId,
				})),
			];

			await tx.expiredInvite.createMany({
				data: expiredInvites,
			});

			runningTotal += expiredInvites.length;

			await Promise.all([
				tx.activeDirectionalInvite.deleteMany({
					where: {
						expiration: { lt: new Date() },
					},
				}),
				tx.activeNondirectionalInvite.deleteMany({
					where: {
						expiration: { lt: new Date() },
					},
				}),
			]);
		} catch (e) {
			throw new RuntimeError("FAILED_TO_MOVE_INVITES", { cause: e });
		}

		return runningTotal;
	});

	return { cleaned: count };
}
