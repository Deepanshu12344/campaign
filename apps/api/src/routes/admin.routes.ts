import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { adminController } from '../controllers/admin.controller';
import {
  AdminDecisionInputSchema,
  AdminAdvanceInputSchema,
  SimulateReportInputSchema,
} from '@campaigns/shared';

const router = Router();

// Guard all admin routes with ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

router.get('/queue', (req, res, next) => adminController.getQueue(req, res, next));
router.get('/lifecycle', (req, res, next) => adminController.getLifecycle(req, res, next));
router.get('/campaigns/:id/audit', (req, res, next) => adminController.getAuditTrail(req, res, next));

router.post(
  '/campaigns/:id/decision',
  validateBody(AdminDecisionInputSchema),
  (req, res, next) => adminController.makeDecision(req, res, next)
);

router.post(
  '/campaigns/:id/advance',
  validateBody(AdminAdvanceInputSchema),
  (req, res, next) => adminController.advanceCampaign(req, res, next)
);

router.post(
  '/campaigns/:id/simulate-report',
  validateBody(SimulateReportInputSchema),
  (req, res, next) => adminController.simulateReport(req, res, next)
);

router.post(
  '/campaigns/:id/simulate-fund-goal',
  (req, res, next) => adminController.simulateFundGoal(req, res, next)
);

router.post('/reset-demo', (req, res, next) => adminController.resetDemo(req, res, next));

export const adminRoutes = router;
