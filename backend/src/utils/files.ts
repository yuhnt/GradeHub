import fs from 'fs/promises';

/** Best-effort file removal: a missing file must never fail the request. */
export async function removeFile(filePath: string | undefined | null) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`failed to remove file ${filePath}`, err);
    }
  }
}
