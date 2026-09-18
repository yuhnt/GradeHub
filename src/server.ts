import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}: http://localhost:${env.port}`);
});
