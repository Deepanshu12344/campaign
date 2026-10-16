import { Router } from 'express';
import authRoutes from './auth.routes';
import configRoutes from './config.routes';
import campaignRoutes from './campaign.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { authController } from '../controllers/auth.controller';

const router = Router();

router.use('/auth', authRoutes);
router.get('/me', requireAuth, authController.getMe);
router.use('/config', configRoutes);
router.use('/campaigns', campaignRoutes);

export default router;
