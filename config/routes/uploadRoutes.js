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
      console.error('Multer error:', err.code, err.message);
      return res.status(400).json({
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      console.error('Image upload error:', err);
      return res.status(500).json({ message: 'Upload failed' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Create response with full URLs and file metadata
    const uploadedFiles = req.files.map((file) => ({
      url: `/uploads/products/${file.filename}`.replace(/\\/g, '/'),
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    console.log('Images uploaded successfully:', uploadedFiles.length, 'files');
    res.json({ 
      success: true,
      url: uploadedFiles[0].url,
      urls: uploadedFiles.map(f => f.url),
      files: uploadedFiles 
    });
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
      console.error('Multer error:', err.code, err.message);
      return res.status(400).json({
        message: messages[err.code] || `Upload error: ${err.message}`,
      });
    }

    if (err) {
      console.error('PDF upload error:', err);
      return res.status(500).json({ message: 'Failed to upload PDF. Please try again.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF uploaded' });
    }

    // Use relative URL for frontend access
    const url = `/uploads/pdfs/${req.file.filename}`.replace(/\\/g, '/');
    
    console.log('PDF uploaded successfully:', url);
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });
});

export default router;
