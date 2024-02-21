-- AlterTable
ALTER TABLE "ActiveDirectionalInvite" ADD COLUMN     "onAccept" TEXT,
ADD COLUMN     "onDecline" TEXT;

-- AlterTable
ALTER TABLE "ActiveNondirectionalInvite" ADD COLUMN     "onAccept" TEXT,
ADD COLUMN     "onDecline" TEXT;
