// import { PrismaClient } from "../../../dist/prisma/currency/default.js";
// import { Prisma } from "../../../dist/prisma/currency/default.js";
// import { DefaultArgs } from "../../../dist/prisma/currency/runtime/library.js";

// type LimittedDB = Omit<
// 	PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
// 	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
// >;

export const setBalance = async (
	db: any,
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
