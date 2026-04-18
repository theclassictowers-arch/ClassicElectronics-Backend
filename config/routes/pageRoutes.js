import express from 'express';
import { getPages, getPage, updatePage } from '../../controllers/pageController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getPages);
router.get('/:slug', getPage);
router.put('/:slug', protectAdmin, updatePage);

export default router;
