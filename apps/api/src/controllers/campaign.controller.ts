import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { CampaignQuery, FeedbackInput, QuoteInput } from '@campaigns/shared';

export class CampaignController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.listCampaigns(req.query as unknown as CampaignQuery);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async featured(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.getFeaturedCampaigns();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.getCampaignById(id, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async quote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { amountCents } = req.body as QuoteInput;
      const result = await campaignService.quoteContribution(id, amountCents);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.submitFeedback(
        id,
        req.body as FeedbackInput,
        req.user?.id
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async save(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.toggleSave(id, req.user!.id, true);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async unsave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.toggleSave(id, req.user!.id, false);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async follow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.toggleFollow(id, req.user!.id, true);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async unfollow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await campaignService.toggleFollow(id, req.user!.id, false);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const campaignController = new CampaignController();
