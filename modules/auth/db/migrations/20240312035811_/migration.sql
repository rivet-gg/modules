/*
  Warnings:

  - You are about to drop the column `identityId` on the `EmailPasswordless` table. All the data in the column will be lost.
  - You are about to drop the `Identity` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `EmailPasswordless` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `EmailPasswordless` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmailPasswordless" DROP CONSTRAINT "EmailPasswordless_identityId_fkey";

-- AlterTable
ALTER TABLE "EmailPasswordless" DROP COLUMN "identityId",
ADD COLUMN     "userId" UUID NOT NULL;

-- DropTable
DROP TABLE "Identity";

-- CreateIndex
CREATE UNIQUE INDEX "EmailPasswordless_userId_key" ON "EmailPasswordless"("userId");
