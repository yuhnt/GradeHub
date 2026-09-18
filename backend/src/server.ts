import { env } from './config/env';
import { prisma } from './config/db';
import { createApp } from './app';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}: http://localhost:${env.port}`);
});

// `docker stop` sends SIGTERM: finish in-flight requests, then release the
// DB pool, instead of being killed mid-upload after the grace period.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
  });
}
