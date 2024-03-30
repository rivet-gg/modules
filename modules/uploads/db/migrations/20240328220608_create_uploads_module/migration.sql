-- CreateTable
CREATE TABLE "Upload" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "bucket" TEXT NOT NULL,
    "contentLength" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Files" (
    "path" TEXT NOT NULL,
    "mime" TEXT,
    "contentLength" BIGINT NOT NULL,
    "nsfwScoreThreshold" DOUBLE PRECISION,
    "uploadId" UUID NOT NULL,

    CONSTRAINT "Files_pkey" PRIMARY KEY ("uploadId","path")
);

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
