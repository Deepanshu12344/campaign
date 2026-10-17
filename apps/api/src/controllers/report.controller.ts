import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';

export class ReportController {
  async getCampaignReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportService.getCampaignReport(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
