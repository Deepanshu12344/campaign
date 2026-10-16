import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { campaignController } from '../controllers/campaign.controller';
import { validate } from '../middlewares/validate.middleware';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware';
import {
  CampaignQuerySchema,
  FeedbackInputSchema,
  QuoteInputSchema,
} from '@campaigns/shared';

const router = Router();

// Rate limiter for feedback endpoint
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many feedback submissions from this IP, please try again later.',
    },
  },
});

router.get('/', validate({ query: CampaignQuerySchema }), campaignController.list);
router.get('/featured', campaignController.featured);
router.get('/:id', optionalAuth, campaignController.getById);

router.post(
  '/:id/quote',
  validate({ body: QuoteInputSchema }),
  campaignController.quote
);

router.post(
  '/:id/feedback',
  feedbackLimiter,
  optionalAuth,
  validate({ body: FeedbackInputSchema }),
  campaignController.submitFeedback
);

router.post('/:id/save', requireAuth, campaignController.save);
router.delete('/:id/save', requireAuth, campaignController.unsave);

router.post('/:id/follow', requireAuth, campaignController.follow);
router.delete('/:id/follow', requireAuth, campaignController.unfollow);

export default router;
