-- CreateTable
CREATE TABLE "Token" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");
