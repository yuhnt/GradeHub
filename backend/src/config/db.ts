import { PrismaClient } from '@prisma/client';

// A single shared Prisma client for the whole app.
// Creating a new PrismaClient per request would exhaust DB connections.
export const prisma = new PrismaClient();
