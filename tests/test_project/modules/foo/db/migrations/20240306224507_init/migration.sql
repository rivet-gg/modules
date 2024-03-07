/*
  Warnings:

  - You are about to drop the `Identity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IdentityGuest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Identity" DROP CONSTRAINT "Identity_userId_fkey";

-- DropForeignKey
ALTER TABLE "IdentityGuest" DROP CONSTRAINT "IdentityGuest_identityId_fkey";

-- DropTable
DROP TABLE "Identity";

-- DropTable
DROP TABLE "IdentityGuest";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "DbEntry" (
    "id" UUID NOT NULL,

    CONSTRAINT "DbEntry_pkey" PRIMARY KEY ("id")
);
