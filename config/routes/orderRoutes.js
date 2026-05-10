import express from 'express';
import { createMyOrder, createOrder, getMyOrders, getOrders, updateOrderStatus } from '../../controllers/orderController.js';
import { protectAdmin, protectUser } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Public (checkout)
router.post('/', createOrder);

// Customer account
router.get('/my', protectUser, getMyOrders);
router.post('/my', protectUser, createMyOrder);

// Admin
router.get('/', protectAdmin, getOrders);
router.put('/:id/status', protectAdmin, updateOrderStatus);

export default router;
