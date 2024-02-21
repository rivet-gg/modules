/*
  Warnings:

  - The primary key for the `ActiveDirectionalInvite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ActiveNondirectionalInvite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ExpiredInvite` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "ActiveDirectionalInvite" DROP CONSTRAINT "ActiveDirectionalInvite_pkey",
ADD CONSTRAINT "ActiveDirectionalInvite_pkey" PRIMARY KEY ("fromUserId", "toUserId", "for", "originModule");

-- AlterTable
ALTER TABLE "ActiveNondirectionalInvite" DROP CONSTRAINT "ActiveNondirectionalInvite_pkey",
ADD CONSTRAINT "ActiveNondirectionalInvite_pkey" PRIMARY KEY ("userAId", "userBId", "for", "originModule");

-- AlterTable
ALTER TABLE "ExpiredInvite" DROP CONSTRAINT "ExpiredInvite_pkey",
ADD CONSTRAINT "ExpiredInvite_pkey" PRIMARY KEY ("fromUserId", "toUserId", "for", "originModule", "createdAt");
