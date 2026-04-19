import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import fs from 'fs';
import authRoutes from './config/routes/authRoutes.js';
import categoryRoutes from './config/routes/categoryRoutes.js';
import productRoutes from './config/routes/productRoutes.js';
import themeRoutes from './config/routes/themeRoutes.js';
import orderRoutes from './config/routes/orderRoutes.js';
import uploadRoutes from './config/routes/uploadRoutes.js';
import sliderRoutes from './config/routes/sliderRoutes.js';
import pageRoutes from './config/routes/pageRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const uploadsRoot = path.join(__dirname, 'uploads');

// Middleware
app.use(cors({
  origin: true, // Frontend origin ko allow karne ke liye
  credentials: true
}));
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Ensure essential directories exist
const uploadPaths = [
  uploadsRoot,
  path.join(uploadsRoot, 'products'),
  path.join(uploadsRoot, 'profiles'),
  path.join(uploadsRoot, 'pdfs'),
];
uploadPaths.forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// Serve uploaded files statically with CORS headers
app.use('/uploads', (req, res, next) => {
  // Modern browsers mein images aur PDFs ko cross-origin load karne ke liye
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsRoot, {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400'); 
    // PDF file handling to prevent .htm download issues
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.set('Content-Type', 'application/pdf');
      // 'inline' use karein taake browser mein open ho, 'attachment' download karwa deta hai
      res.set('Content-Disposition', 'inline');
    }
  }
}));

// Health check route
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected, 1=connected
  res.json({
    status: state === 1 ? 'ok' : 'disconnected',
    db: mongoose.connection.name,
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Routes
// Auth routes for both admin and users
// Direct routes for admin/login support
app.use('/', authRoutes);
app.use('/api', authRoutes);

app.use(['/api/categories', '/categories'], categoryRoutes);
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/theme', '/theme'], themeRoutes);
app.use(['/api/orders', '/orders'], orderRoutes);
app.use(['/api/upload', '/upload'], uploadRoutes);
app.use(['/api/sliders', '/sliders'], sliderRoutes);
app.use(['/api/pages', '/pages'], pageRoutes);

// Handle 404 for undefined API routes (Strict prefix match)
app.use('/api', (req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Root route
app.get('/', (req, res) => {
  res.send('Classic Electroinc API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5001;

// Connect to database then start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(` Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

startServer();
