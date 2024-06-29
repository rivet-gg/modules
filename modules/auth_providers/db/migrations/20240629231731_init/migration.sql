-- CreateTable
CREATE TABLE "ProviderEntries" (
    "userId" UUID NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerData" JSONB NOT NULL,

    CONSTRAINT "ProviderEntries_pkey" PRIMARY KEY ("userId","providerType","providerId")
);

-- CreateIndex
CREATE INDEX "ProviderEntries_userId_idx" ON "ProviderEntries"("userId");

-- CreateIndex
CREATE INDEX "ProviderEntries_providerType_providerId_idx" ON "ProviderEntries"("providerType", "providerId");
