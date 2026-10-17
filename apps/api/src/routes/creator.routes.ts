import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { creatorController } from '../controllers/creator.controller';
import {
  DraftUpdateSchema,
  SubmitCampaignInputSchema,
  CampaignUpdateInputSchema,
} from '@campaigns/shared';

const router = Router();

// Draft & Campaign lifecycle
router.post('/campaigns', requireAuth, (req, res, next) => creatorController.createDraft(req, res, next));
router.patch(
  '/campaigns/:id/draft',
  requireAuth,
  validateBody(DraftUpdateSchema),
  (req, res, next) => creatorController.updateDraft(req, res, next)
);
router.post(
  '/campaigns/:id/submit',
  requireAuth,
  validateBody(SubmitCampaignInputSchema),
  (req, res, next) => creatorController.submitCampaign(req, res, next)
);
router.post(
  '/campaigns/:id/updates',
  requireAuth,
  validateBody(CampaignUpdateInputSchema),
  (req, res, next) => creatorController.createUpdate(req, res, next)
);
router.delete('/campaigns/:id', requireAuth, (req, res, next) => creatorController.deleteDraft(req, res, next));

// Creator personal dashboards & analytics
router.get('/me/campaigns', requireAuth, (req, res, next) => creatorController.getMyCampaigns(req, res, next));
router.get('/me/campaigns/:id', requireAuth, (req, res, next) => creatorController.getMyCampaign(req, res, next));
router.get(
  '/me/campaigns/:id/analytics',
  requireAuth,
  (req, res, next) => creatorController.getCampaignAnalytics(req, res, next)
);

export const creatorRoutes = router;
