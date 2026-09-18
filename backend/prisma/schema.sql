CREATE TABLE "users" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "hash_password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('student', 'teacher')),
    "createdAt" TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT now()
);


CREATE TABLE "tasks"(
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT now(),
    "deadline" TIMESTAMP(0) WITH TIME ZONE NOT NULL,
    "createdBy" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "submissions"(
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "taskId" BIGINT NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "filePath" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "grade" SMALLINT,
    "feedback" TEXT,
    "gradeAt" TIMESTAMP(0) WITH TIME ZONE ,
    "createdAt" TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "submissions_grade_range" CHECK ("grade" IS NULL OR "grade" BETWEEN 0 AND 100)
);

-- One active submission per student per task; teacher test submissions are exempt.
CREATE UNIQUE INDEX "submissions_userId_taskId_active_key"
    ON "submissions"("userId", "taskId") WHERE "isTest" = false;


CREATE TABLE "password_resets" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "userId" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(0) WITH TIME ZONE NOT NULL,
    "usedAt" TIMESTAMP(0) WITH TIME ZONE,
    "createdAt" TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT now()
);
