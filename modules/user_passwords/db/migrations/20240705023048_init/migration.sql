-- CreateTable
CREATE TABLE "Passwords" (
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "algo" TEXT NOT NULL,

    CONSTRAINT "Passwords_pkey" PRIMARY KEY ("userId")
);
