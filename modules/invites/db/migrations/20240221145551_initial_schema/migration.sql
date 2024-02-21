-- CreateTable
CREATE TABLE "ActiveDirectionalInvite" (
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "for" TEXT NOT NULL,
    "originModule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration" TIMESTAMP(3),
    "hidePostExpire" BOOLEAN,

    CONSTRAINT "ActiveDirectionalInvite_pkey" PRIMARY KEY ("fromUserId","toUserId")
);

-- CreateTable
CREATE TABLE "ActiveNondirectionalInvite" (
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "for" TEXT NOT NULL,
    "originModule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration" TIMESTAMP(3),
    "hidePostExpire" BOOLEAN,

    CONSTRAINT "ActiveNondirectionalInvite_pkey" PRIMARY KEY ("userAId","userBId")
);
