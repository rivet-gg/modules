-- Add timescale
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- CreateTable
CREATE TABLE "event" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "event_id_key" ON "event"("id");

-- CreateIndex
CREATE INDEX "event_name_time_idx" ON "event"("name", "timestamp" DESC);