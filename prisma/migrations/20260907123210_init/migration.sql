-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('index', 'chat');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "repo" TEXT NOT NULL,
    "userId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "question" TEXT,
    "answer" TEXT,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_repo_idx" ON "Job"("repo");

-- CreateIndex
CREATE INDEX "Message_userId_repo_createdAt_idx" ON "Message"("userId", "repo", "createdAt");
