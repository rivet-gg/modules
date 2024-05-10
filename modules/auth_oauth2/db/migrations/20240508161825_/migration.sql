-- CreateTable
CREATE TABLE "OAuthUsers" (
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthUsers_pkey" PRIMARY KEY ("provider","userId")
);

-- CreateTable
CREATE TABLE "OAuthLoginAttempt" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthCreds" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "loginAttemptId" TEXT NOT NULL,

    CONSTRAINT "OAuthCreds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthCreds_loginAttemptId_key" ON "OAuthCreds"("loginAttemptId");

-- AddForeignKey
ALTER TABLE "OAuthCreds" ADD CONSTRAINT "OAuthCreds_loginAttemptId_fkey" FOREIGN KEY ("loginAttemptId") REFERENCES "OAuthLoginAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
