import express from 'express';
import multer from 'multer';
import upload, { pdfUpload } from '../../middleware/upload.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/images', protectAdmin, (req, res) => {
  const uploadMiddleware = upload.array('images', 10);

  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: 'File too large. Maximum 5MB per file.',
        LIMIT_FILE_COUNT: 'Too many files. Maximum 10 files at once.',
        LIMIT_UNEXPECTED_FILE: 'Invalid file type. Only JPEG, PNG, WebP, SVG, and GIF are allowed.',
      };
      return res.status(400).json({
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      return res.status(500).json({ message: 'Upload failed' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const urls = req.files.map((file) => `/${file.path.replace(/\\/g, '/')}`);

    res.json({ urls });
  });
});

router.post('/pdf', protectAdmin, (req, res) => {
  const uploadMiddleware = pdfUpload.single('pdf');

  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: 'File too large. Maximum 10MB.',
        LIMIT_UNEXPECTED_FILE: 'Invalid file type. Only PDF files are allowed.',
      };
      return res.status(400).json({
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      return res.status(500).json({ message: 'PDF upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF uploaded' });
    }

    const url = `/${req.file.path.replace(/\\/g, '/')}`;
    res.json({ url });
  });
});

export default router;
