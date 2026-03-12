-- CreateEnum
CREATE TYPE "FloorType" AS ENUM ('THEMATIC', 'COMMONS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('ACCEPTED_PENDING_CLAIM', 'CLAIMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'LEAD', 'HOST', 'STEWARD');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('FLOOR', 'TOWER', 'LEADS_ONLY');

-- CreateEnum
CREATE TYPE "IntroOpenness" AS ENUM ('VERY_OPEN', 'OPEN_IF_RELEVANT', 'LOW_PROFILE');

-- CreateEnum
CREATE TYPE "IntroRequestReason" AS ENUM ('FEEDBACK', 'COLLABORATION', 'LEARNING', 'SHARED_INTEREST', 'EVENT_FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferredConnection" AS ENUM ('QUICK_ASYNC_INTRO', 'FIFTEEN_MIN_CHAT', 'MEET_AT_EVENT', 'OPEN_TO_WHATEVER');

-- CreateEnum
CREATE TYPE "IntroRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'NOT_NOW', 'PASSED', 'ALTERNATE_PATH', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlternatePathType" AS ENUM ('MEET_AT_EVENT', 'SEND_ASYNC_QUESTION', 'FOLLOW_UP_LATER', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ONBOARDING_COMPLETED', 'INTRO_REQUEST_RECEIVED', 'INTRO_REQUEST_ACCEPTED', 'INTRO_REQUEST_NOT_NOW', 'INTRO_REQUEST_PASSED', 'INTRO_REQUEST_ALTERNATE_PATH');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "shortDescription" TEXT,
    "floorType" "FloorType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'ACCEPTED_PENDING_CLAIM',
    "inviteTokenHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberFloorMembership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberFloorMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "homeFloorId" TEXT NOT NULL,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "oneLineIntro" TEXT,
    "workingOn" TEXT,
    "curiousAbout" TEXT,
    "wantsToMeet" TEXT,
    "canHelpWith" TEXT,
    "needsHelpWith" TEXT,
    "conversationStarter" TEXT,
    "websiteUrl" TEXT,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'FLOOR',
    "introOpenness" "IntroOpenness" NOT NULL DEFAULT 'VERY_OPEN',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfileTopic" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,

    CONSTRAINT "MemberProfileTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntroRequest" (
    "id" TEXT NOT NULL,
    "requesterMemberId" TEXT NOT NULL,
    "recipientMemberId" TEXT NOT NULL,
    "reason" "IntroRequestReason" NOT NULL,
    "note" TEXT NOT NULL,
    "preferredConnection" "PreferredConnection" NOT NULL,
    "linkUrl" TEXT,
    "status" "IntroRequestStatus" NOT NULL DEFAULT 'PENDING',
    "recipientResponseNote" TEXT,
    "alternatePathType" "AlternatePathType",
    "alternatePathUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "IntroRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "hostMemberId" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_number_key" ON "Floor"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_inviteTokenHash_key" ON "Invitation"("inviteTokenHash");

-- CreateIndex
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- CreateIndex
CREATE INDEX "MemberFloorMembership_floorId_idx" ON "MemberFloorMembership"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFloorMembership_memberId_floorId_key" ON "MemberFloorMembership"("memberId", "floorId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_memberId_key" ON "MemberProfile"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfileTopic_memberProfileId_topic_key" ON "MemberProfileTopic"("memberProfileId", "topic");

-- CreateIndex
CREATE INDEX "IntroRequest_requesterMemberId_idx" ON "IntroRequest"("requesterMemberId");

-- CreateIndex
CREATE INDEX "IntroRequest_recipientMemberId_idx" ON "IntroRequest"("recipientMemberId");

-- CreateIndex
CREATE INDEX "IntroRequest_recipientMemberId_requesterMemberId_status_idx" ON "IntroRequest"("recipientMemberId", "requesterMemberId", "status");

-- CreateIndex
CREATE INDEX "Notification_memberId_readAt_idx" ON "Notification"("memberId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_memberId_createdAt_idx" ON "Notification"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_floorId_startsAt_idx" ON "Event"("floorId", "startsAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFloorMembership" ADD CONSTRAINT "MemberFloorMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFloorMembership" ADD CONSTRAINT "MemberFloorMembership_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_homeFloorId_fkey" FOREIGN KEY ("homeFloorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProfileTopic" ADD CONSTRAINT "MemberProfileTopic_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_requesterMemberId_fkey" FOREIGN KEY ("requesterMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_recipientMemberId_fkey" FOREIGN KEY ("recipientMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_hostMemberId_fkey" FOREIGN KEY ("hostMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
