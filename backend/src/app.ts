import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", routes);
  app.use(errorHandler);
  return app;
}
