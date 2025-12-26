-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "headers" JSONB,
ADD COLUMN     "key" TEXT;

-- CreateIndex
CREATE INDEX "OutboxEvent_topic_createdAt_idx" ON "OutboxEvent"("topic", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_key_idx" ON "OutboxEvent"("key");
