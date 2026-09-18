# Partial unique index on `submissions`

Requirement: a student may have only **one active submission per task**,
enforced in the database, not just in code. Teacher test submissions
(`isTest = true`) are exempt: a teacher can upload as many as they like to
their own task (decision 6).

A plain `UNIQUE ("userId", "taskId")` can't express that. It would cap a
teacher at one test submission per task. The rule needs a **partial** unique
index:

```sql
CREATE UNIQUE INDEX "submissions_userId_taskId_active_key"
    ON "submissions"("userId", "taskId")
    WHERE "isTest" = false;
```

Prisma 5 can't describe partial indexes in `schema.prisma`, so:

- `schema.prisma` has **no** `@@unique([userId, taskId])` on `Submission`.
- The index (plus a `CHECK` on the 0-100 grade range, which Prisma can't
  describe either) is created by the hand-written migration
  `migrations/20260902000000_submission_partial_unique/migration.sql`.
- Application code can't use `findUnique({ userId_taskId })`; it uses
  `findFirst({ where: { userId, taskId, isTest: false } })`, and treats a
  `P2002` error on insert as a 409 (two concurrent submits both passed the
  check and the index rejected the second).

## What to watch out for

`npx prisma migrate deploy` / `migrate reset` apply the migration as-is.
Nothing extra to do.

`npx prisma migrate dev` doesn't know the partial index is supposed to be
there. The **next time you change the schema**, the generated migration may
include:

```sql
DROP INDEX "submissions_userId_taskId_active_key";
```

(and possibly drop the `submissions_grade_range` check). To avoid that, create
schema migrations with:

```
npx prisma migrate dev --create-only --name <change>
```

Then delete any statement touching `submissions_userId_taskId_active_key` or
`submissions_grade_range` from the generated SQL, and run
`npx prisma migrate dev` to apply it.
