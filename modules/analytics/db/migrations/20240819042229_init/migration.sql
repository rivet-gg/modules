-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_id_key" ON "Event"("id");

-- CreateIndex
CREATE INDEX "Event_name_time_idx" ON "Event"("name", "timestamp" DESC);
