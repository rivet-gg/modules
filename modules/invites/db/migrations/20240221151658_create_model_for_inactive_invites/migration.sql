-- CreateTable
CREATE TABLE "ExpiredInvite" (
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "directional" BOOLEAN NOT NULL,
    "for" TEXT NOT NULL,
    "originModule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration" TIMESTAMP(3),
    "hidePostExpire" BOOLEAN,

    CONSTRAINT "ExpiredInvite_pkey" PRIMARY KEY ("fromUserId","toUserId")
);
