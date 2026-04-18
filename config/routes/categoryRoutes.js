import express from 'express';
import {
  getCategories,
  getCategoriesTree,
  getNavbarData,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../../controllers/categoryController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/tree', getCategoriesTree);
router.get('/nav', getNavbarData);
router.get('/admin', protectAdmin, getAdminCategories);
router.post('/', protectAdmin, createCategory);
router.put('/:id', protectAdmin, updateCategory);
router.delete('/:id', protectAdmin, deleteCategory);

export default router;
