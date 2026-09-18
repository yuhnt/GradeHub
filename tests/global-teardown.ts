import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Runs once after every test file has finished (so no file can delete the
// upload dir while another is still writing to it).
export default function globalTeardown() {
  const testEnvPath = path.resolve(__dirname, '../.env.test');
  const parsed = fs.existsSync(testEnvPath) ? dotenv.parse(fs.readFileSync(testEnvPath)) : {};
  const uploadDir = parsed.UPLOAD_DIR;
  // Only clean up a dedicated test upload dir, never the dev one.
  if (uploadDir && uploadDir.includes('test')) {
    fs.rmSync(path.resolve(__dirname, '..', uploadDir), { recursive: true, force: true });
  }
}
