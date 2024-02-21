-- CreateTable
CREATE TABLE "UserWallet" (
    "userId" UUID NOT NULL,
    "balance" INTEGER NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("userId")
);
