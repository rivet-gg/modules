import { PrismaClient } from "../../../dist/prisma/currency/default.js";
import { Prisma } from "../../../dist/prisma/currency/default.js";
import { DefaultArgs } from "../../../dist/prisma/currency/runtime/library.js";

type LimittedDB = Omit<
	PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
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
