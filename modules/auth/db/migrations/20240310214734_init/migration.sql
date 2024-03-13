-- CreateTable
CREATE TABLE "Identity" (
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "EmailPasswordless" (
    "id" UUID NOT NULL,
    "identityId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailPasswordless_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailPasswordlessVerification" (
    "id" UUID NOT NULL,
    "identityId" UUID,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttemptCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP NOT NULL,
    "completedAt" TIMESTAMP,

    CONSTRAINT "EmailPasswordlessVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailPasswordless_email_key" ON "EmailPasswordless"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPasswordlessVerification_code_key" ON "EmailPasswordlessVerification"("code");

-- AddForeignKey
ALTER TABLE "EmailPasswordless" ADD CONSTRAINT "EmailPasswordless_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPasswordlessVerification" ADD CONSTRAINT "EmailPasswordlessVerification_email_fkey" FOREIGN KEY ("email") REFERENCES "EmailPasswordless"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPasswordlessVerification" ADD CONSTRAINT "EmailPasswordlessVerification_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
