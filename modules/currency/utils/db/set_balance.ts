import { prisma } from "@ogs/helpers/currency/mod.ts";

type LimittedDB = Omit<
	prisma.Prisma.DefaultPrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const setBalance = async (
	db: LimittedDB,
	userId: string,
	balance: number,
) => {
	if (balance < 0) throw new RangeError("Invalid balance");

	db.userWallet.upsert({
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
