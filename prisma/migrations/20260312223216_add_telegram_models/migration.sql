-- CreateEnum
CREATE TYPE "TelegramJoinStatus" AS ENUM ('UNKNOWN', 'PROMPTED', 'DISMISSED', 'CLICKED');

-- CreateTable
CREATE TABLE "MemberTelegramLink" (
    "id" TEXT NOT NULL,
    "telegramUserId" BIGINT NOT NULL,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "userId" TEXT,
    "memberId" TEXT,
    "telegramJoinStatus" "TelegramJoinStatus" NOT NULL DEFAULT 'UNKNOWN',
    "writeAccessGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberTelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "telegramLinkId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberTelegramLink_telegramUserId_key" ON "MemberTelegramLink"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberTelegramLink_userId_key" ON "MemberTelegramLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberTelegramLink_memberId_key" ON "MemberTelegramLink"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_tokenHash_key" ON "TelegramSession"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramSession_telegramLinkId_idx" ON "TelegramSession"("telegramLinkId");

-- CreateIndex
CREATE INDEX "TelegramSession_expiresAt_idx" ON "TelegramSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "MemberTelegramLink" ADD CONSTRAINT "MemberTelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTelegramLink" ADD CONSTRAINT "MemberTelegramLink_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_telegramLinkId_fkey" FOREIGN KEY ("telegramLinkId") REFERENCES "MemberTelegramLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
