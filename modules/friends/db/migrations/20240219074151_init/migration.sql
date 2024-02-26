-- CreateTable
CREATE TABLE "Friend" (
    "userIdA" UUID NOT NULL,
    "userIdB" UUID NOT NULL,
    "friendRequestId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("userIdA","userIdB")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declinedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friend_friendRequestId_key" ON "Friend"("friendRequestId");

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendRequestId_fkey" FOREIGN KEY ("friendRequestId") REFERENCES "FriendRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_userIdA_lt_userIdB" CHECK ("userIdA" < "userIdB" AND "userIdA" != "userIdB");
CREATE UNIQUE INDEX "FriendRequest_senderUserId_targetUserId" ON "FriendRequest" ("senderUserId","targetUserId") WHERE "declinedAt" IS NULL AND "acceptedAt" IS NULL;
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderUserId_ne_targetUserId" CHECK ("senderUserId" != "targetUserId");