/*
  Warnings:

  - You are about to drop the column `friendRequestId` on the `Friend` table. All the data in the column will be lost.
  - You are about to drop the `FriendRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Friend" DROP CONSTRAINT "Friend_friendRequestId_fkey";

-- DropIndex
DROP INDEX "Friend_friendRequestId_key";

-- AlterTable
ALTER TABLE "Friend" DROP COLUMN "friendRequestId";

-- DropTable
DROP TABLE "FriendRequest";
