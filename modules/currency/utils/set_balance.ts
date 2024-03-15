import { prisma, RuntimeError } from "../_gen/mod.ts";

type LimittedDB = Omit<
	prisma.Prisma.DefaultPrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const setBalance = async (
	db: LimittedDB,
	userId: string,
	balance: number,
) => {
	if (balance < 0) throw new RuntimeError("invalid_amount");

	await db.userWallet.upsert({
		where: {
			userId,
		},
		update: {
			balance: balance,
		},
		create: {
			balance: balance,
			userId,
		},
	});
};
