import express from 'express';
import {
  getSliders,
  getSlider,
  createSlider,
  updateSlider,
  deleteSlider,
  reorderSliders,
} from '../../controllers/sliderController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getSliders);
router.get('/:id', getSlider);
router.post('/', protectAdmin, createSlider);
router.put('/reorder', protectAdmin, reorderSliders);
router.put('/:id', protectAdmin, updateSlider);
router.delete('/:id', protectAdmin, deleteSlider);

export default router;
