import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middlewares/auth.middleware';
import { aiController } from '../controllers/ai.controller';

const router = Router();

// AI generation rate limiter: 30 requests per 15 minutes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many AI requests. Please wait a few moments before trying again.',
    },
  },
});

router.post('/ai/draft-basics', requireAuth, aiLimiter, aiController.draftBasics);
router.post('/ai/draft-story', requireAuth, aiLimiter, aiController.draftStory);
router.post('/ai/ad-copy', requireAuth, aiLimiter, aiController.draftAdCopy);

export const aiRoutes = router;

