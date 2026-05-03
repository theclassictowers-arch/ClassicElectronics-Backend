import express from 'express';
import {
  getSalesDocuments,
  getSalesDocument,
  createSalesDocument,
  updateSalesDocument,
  deleteSalesDocument,
} from '../../controllers/salesDocumentController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protectAdmin, getSalesDocuments);
router.get('/:id', protectAdmin, getSalesDocument);
router.post('/', protectAdmin, createSalesDocument);
router.put('/:id', protectAdmin, updateSalesDocument);
router.delete('/:id', protectAdmin, deleteSalesDocument);

export default router;
