import { prisma } from "../module.gen.ts";

type LimittedDB = Omit<
	prisma.Prisma.DefaultPrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const getBalance = async (
	db: LimittedDB,
	userId: string,
): Promise<number> => {
	const user = await db.userWallet.findFirst({
		where: {
			userId,
		},
		select: {
			balance: true,
		},
	});

	if (!user) {
		return 0;
	}

	return user.balance;
};
