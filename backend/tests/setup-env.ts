import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Point the tests at .env.test (a separate test database and upload dir)
// when it exists, so `npm test` never touches the dev database.
const testEnvPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
}
