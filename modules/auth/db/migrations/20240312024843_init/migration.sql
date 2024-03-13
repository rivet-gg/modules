/*
  Warnings:

  - You are about to drop the column `identityId` on the `EmailPasswordlessVerification` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmailPasswordlessVerification" DROP CONSTRAINT "EmailPasswordlessVerification_identityId_fkey";

-- AlterTable
ALTER TABLE "EmailPasswordlessVerification" DROP COLUMN "identityId",
ADD COLUMN     "userId" UUID;
