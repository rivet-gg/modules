-- CreateTable
CREATE TABLE "Verifications" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttemptCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP NOT NULL,
    "completedAt" TIMESTAMP,

    CONSTRAINT "Verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verifications_code_key" ON "Verifications"("code");
