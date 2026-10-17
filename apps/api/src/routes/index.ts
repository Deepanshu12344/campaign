import { Router } from 'express';
import authRoutes from './auth.routes';
import configRoutes from './config.routes';
import campaignRoutes from './campaign.routes';
import { creatorRoutes } from './creator.routes';
import { contributionRoutes } from './contribution.routes';
import { notificationRoutes } from './notification.routes';
import { reportRoutes } from './report.routes';
import { adminRoutes } from './admin.routes';
import { uploadRoutes } from './upload.routes';
import { aiRoutes } from './ai.routes';
import { contactRoutes } from './contact.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authController } from '../controllers/auth.controller';
import { UpdateProfileInputSchema } from '@campaigns/shared';

const router = Router();

router.use('/auth', authRoutes);
router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate({ body: UpdateProfileInputSchema }), authController.updateMe);
router.use('/config', configRoutes);

router.use(contactRoutes);
router.use(reportRoutes);
router.use(creatorRoutes);
router.use(contributionRoutes);
router.use(notificationRoutes);
router.use(uploadRoutes);
router.use(aiRoutes);
router.use('/admin', adminRoutes);

// Public campaign feed & exploration
router.use('/campaigns', campaignRoutes);

export default router;
