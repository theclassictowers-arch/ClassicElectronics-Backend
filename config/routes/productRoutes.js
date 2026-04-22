import express from 'express';
import {
  getProducts,
  getProductBySlug,
  getProduct,
  reorderProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../../controllers/productController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/by-slug', getProductBySlug);
router.get('/:id', getProduct);
router.put('/reorder', protectAdmin, reorderProducts);
router.post('/', protectAdmin, createProduct);
router.put('/:id', protectAdmin, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

export default router;
