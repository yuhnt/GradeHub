-- Hand-written migration (Prisma can't express partial indexes or CHECKs).
-- See prisma/PARTIAL_INDEX_NOTE.md.

-- One active submission per student per task applies to real submissions
-- only: teacher test submissions (isTest = true) are unrestricted.
DROP INDEX IF EXISTS "submissions_userId_taskId_key";

CREATE UNIQUE INDEX "submissions_userId_taskId_active_key"
    ON "submissions"("userId", "taskId")
    WHERE "isTest" = false;

-- Grade range safety net, matching the 0-100 rule enforced by the API.
ALTER TABLE "submissions"
    ADD CONSTRAINT "submissions_grade_range"
    CHECK ("grade" IS NULL OR "grade" BETWEEN 0 AND 100);

-- Matches @@index([taskId]) in schema.prisma (listing a task's submissions).
CREATE INDEX "submissions_taskId_idx" ON "submissions"("taskId");
