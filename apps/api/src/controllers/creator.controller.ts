import { Request, Response, NextFunction } from 'express';
import { creatorService } from '../services/creator.service';

export class CreatorController {
  async createDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.createDraft(req.user!.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.updateDraft(req.params.id as string, req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.submitCampaign(req.params.id as string, req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMyCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const result = await creatorService.getMyCampaigns(req.user!.id, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMyCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.getMyCampaign(req.params.id as string, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.deleteDraft(req.params.id as string, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCampaignAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.getCampaignAnalytics(req.params.id as string, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await creatorService.createUpdate(req.params.id as string, req.user!.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const creatorController = new CreatorController();
