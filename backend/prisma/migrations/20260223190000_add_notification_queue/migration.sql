-- CreateEnum
CREATE TYPE "NotificationQueueType" AS ENUM ('SMS', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "NotificationQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "NotificationQueue" (
    "id" TEXT NOT NULL,
    "type" "NotificationQueueType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationQueueStatus" NOT NULL DEFAULT 'PENDING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationQueue_dedupeKey_key" ON "NotificationQueue"("dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationQueue_status_scheduledAt_idx" ON "NotificationQueue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationQueue_type_status_scheduledAt_idx" ON "NotificationQueue"("type", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationQueue_createdAt_idx" ON "NotificationQueue"("createdAt");
