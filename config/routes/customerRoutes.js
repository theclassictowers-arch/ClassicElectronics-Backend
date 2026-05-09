import express from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from '../../controllers/customerController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protectAdmin, getCustomers);
router.get('/:id', protectAdmin, getCustomer);
router.post('/', protectAdmin, createCustomer);
router.put('/:id', protectAdmin, updateCustomer);
router.delete('/:id', protectAdmin, deleteCustomer);

export default router;
