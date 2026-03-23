/*
  Warnings:

  - A unique constraint covering the columns `[walletAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Floor" ADD COLUMN     "requiredSelfPassId" TEXT;

-- AlterTable
ALTER TABLE "MemberFloorMembership" ADD COLUMN     "accessSource" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ensName" TEXT,
ADD COLUMN     "walletAddress" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
