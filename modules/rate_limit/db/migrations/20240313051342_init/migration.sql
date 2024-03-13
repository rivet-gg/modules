-- CreateTable
CREATE UNLOGGED TABLE "TokenBuckets" (
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tokens" BIGINT NOT NULL,
    "lastRefill" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenBuckets_pkey" PRIMARY KEY ("type","key")
);
