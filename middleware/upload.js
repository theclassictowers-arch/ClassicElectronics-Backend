import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const uploadDir = 'uploads/products';
const pdfUploadDir = 'uploads/pdfs';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(pdfUploadDir)) {
  fs.mkdirSync(pdfUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // max 10 files at once
  },
});

// Profile image upload config
const profileUploadDir = 'uploads/profiles';

if (!fs.existsSync(profileUploadDir)) {
  fs.mkdirSync(profileUploadDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const profileUpload = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

export const pdfUpload = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export default upload;
