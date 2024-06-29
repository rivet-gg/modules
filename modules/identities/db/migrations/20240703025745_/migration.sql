-- CreateTable
CREATE TABLE "UserIdentities" (
    "userId" UUID NOT NULL,
    "identityType" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "uniqueData" JSONB NOT NULL,
    "additionalData" JSONB NOT NULL,

    CONSTRAINT "UserIdentities_pkey" PRIMARY KEY ("userId","identityType","identityId")
);

-- CreateIndex
CREATE INDEX "UserIdentities_userId_idx" ON "UserIdentities"("userId");

-- CreateIndex
CREATE INDEX "UserIdentities_identityType_identityId_idx" ON "UserIdentities"("identityType", "identityId");

-- CreateIndex
CREATE INDEX "UserIdentities_identityType_identityId_uniqueData_idx" ON "UserIdentities"("identityType", "identityId", "uniqueData");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentities_identityType_identityId_uniqueData_key" ON "UserIdentities"("identityType", "identityId", "uniqueData");
