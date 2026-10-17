import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { contributionController } from '../controllers/contribution.controller';
import {
  CreateContributionInputSchema,
  PayContributionInputSchema,
  ClaimContributionsInputSchema,
} from '@campaigns/shared';

const router = Router();

// Create pending contribution (public or authenticated)
router.post(
  '/contributions',
  optionalAuth,
  validateBody(CreateContributionInputSchema),
  (req, res, next) => contributionController.createContribution(req, res, next)
);

// Claim guest contributions into authenticated account
router.post(
  '/contributions/claim',
  requireAuth,
  validateBody(ClaimContributionsInputSchema),
  (req, res, next) => contributionController.claimContributions(req, res, next)
);

// Authenticated user's contributions
router.get('/me/contributions', requireAuth, (req, res, next) =>
  contributionController.getMyContributions(req, res, next)
);

// Single contribution actions
router.post(
  '/contributions/:id/pay',
  optionalAuth,
  validateBody(PayContributionInputSchema),
  (req, res, next) => contributionController.payContribution(req, res, next)
);

router.post('/contributions/:id/cancel', optionalAuth, (req, res, next) =>
  contributionController.cancelContribution(req, res, next)
);

router.get('/contributions/:id', optionalAuth, (req, res, next) =>
  contributionController.getContribution(req, res, next)
);

router.get('/contributions/:id/receipt', optionalAuth, (req, res, next) =>
  contributionController.getReceipt(req, res, next)
);

export const contributionRoutes = router;
