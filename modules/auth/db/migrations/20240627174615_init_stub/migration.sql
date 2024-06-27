-- CreateTable
CREATE TABLE "IdentityEmail" (
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "IdentityEmail_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "IdentityOAuth" (
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "subId" TEXT NOT NULL,

    CONSTRAINT "IdentityOAuth_pkey" PRIMARY KEY ("provider","subId")
);

-- CreateIndex
CREATE INDEX "IdentityEmail_userId_idx" ON "IdentityEmail"("userId");

-- CreateIndex
CREATE INDEX "IdentityOAuth_userId_idx" ON "IdentityOAuth"("userId");
