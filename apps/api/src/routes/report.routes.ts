import { Router } from 'express';
import { reportController } from '../controllers/report.controller';

const router = Router();

router.get('/campaigns/:id/report', (req, res, next) =>
  reportController.getCampaignReport(req, res, next)
);

export const reportRoutes = router;
