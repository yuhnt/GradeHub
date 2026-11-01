import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from './error.middleware';

// Ensure the upload directory exists before multer tries to write into it.
if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// Checked by MIME type only (client-declared, not byte-inspected).
// Good enough for this project's scope; note that a renamed file can
// spoof this, so it's not a security-grade check.
function pdfOnlyFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'file must be a PDF'));
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB cap, adjust as needed

const multerPdf = multer({
  storage,
  fileFilter: pdfOnlyFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Accepts a single PDF in the `file` form field. Multer's own errors
 * (file too large, unexpected field, ...) are turned into 400s, and a
 * missing file is rejected here so services can assume req.file exists.
 */
export function uploadPdf(req: Request, res: Response, next: NextFunction) {
  multerPdf.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `file must be at most ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          : err.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'the PDF must be sent in the "file" field'
            : err.message;
      return next(new ApiError(400, message));
    }
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, 'no file attached'));
    next();
  });
}
