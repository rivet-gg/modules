-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityGuest" (
    "identityId" UUID NOT NULL,

    CONSTRAINT "IdentityGuest_pkey" PRIMARY KEY ("identityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityGuest_identityId_key" ON "IdentityGuest"("identityId");

-- AddForeignKey
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityGuest" ADD CONSTRAINT "IdentityGuest_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
