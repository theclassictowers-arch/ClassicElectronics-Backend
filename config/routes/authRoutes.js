import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getMe,
  updateAdminProfile,
  uploadAdminProfileImage,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  updateUserStatus,
  deleteUser,
} from '../../controllers/authController.js';
import { protect, protectAdmin, protectUser } from '../../middleware/authMiddleware.js';
import { profileUpload } from '../../middleware/upload.js';

const router = express.Router();

// Admin routes
router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.get('/admin/me', protectAdmin, getMe);
router.put('/admin/profile', protectAdmin, updateAdminProfile);
router.post('/admin/profile/upload', protectAdmin, profileUpload.single('profileImage'), uploadAdminProfileImage);

// User routes
router.post('/users/register', registerUser);
router.post('/users/login', loginUser);
router.get('/users/me', protectUser, getUserProfile);
router.put('/users/profile', protectUser, updateUserProfile);

// Admin-only user management routes
router.get('/users', protectAdmin, getUsers);
router.put('/users/:id/status', protectAdmin, updateUserStatus);
router.delete('/users/:id', protectAdmin, deleteUser);

// Backward/alternate admin user routes (frontend may call these)
router.get('/admin/users', protectAdmin, getUsers);
router.delete('/admin/users/:id', protectAdmin, deleteUser);

export default router;
