import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

export class AdminController {
  async getQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getQueue();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async makeDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.makeDecision(req.params.id as string, req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async advanceCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.advanceCampaign(req.params.id as string, req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async simulateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.simulateReport(req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetDemo(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.resetDemo();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async simulateFundGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.simulateFundingToGoal(req.params.id as string, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getAuditTrail(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLifecycle(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getLifecycleCampaigns();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
