-- CreateTable
CREATE TABLE "Presence" (
    "identityId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "message" TEXT,
    "publicMeta" JSONB NOT NULL,
    "mutualMeta" JSONB NOT NULL,
    "expires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("identityId","gameId")
);
