import express from 'express';
import { getTheme, updateTheme } from '../../controllers/themeController.js';
import { protectAdmin } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getTheme);
router.put('/', protectAdmin, updateTheme);

export default router;
