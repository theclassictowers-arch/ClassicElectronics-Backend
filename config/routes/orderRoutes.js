import express from 'express';
import { createOrder, getOrders, updateOrderStatus } from '../../controllers/orderController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Public (checkout)
router.post('/', createOrder);

// Admin
router.get('/', protectAdmin, getOrders);
router.put('/:id/status', protectAdmin, updateOrderStatus);

export default router;

