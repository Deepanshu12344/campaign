import { Request, Response, NextFunction } from 'express';
import { contributionService } from '../services/contribution.service';

export class ContributionController {
  private getGuestToken(req: Request): string | undefined {
    return (
      (req.headers['x-guest-receipt-token'] as string) ||
      (req.query.guestReceiptToken as string) ||
      undefined
    );
  }

  async createContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestToken = this.getGuestToken(req);
      const result = await contributionService.createContribution(req.body, req.user, guestToken);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async payContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestToken = this.getGuestToken(req);
      const result = await contributionService.payContribution(
        req.params.id as string,
        req.body,
        req.user,
        guestToken
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async cancelContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestToken = this.getGuestToken(req);
      const result = await contributionService.cancelContribution(
        req.params.id as string,
        req.user,
        guestToken
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getContribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestToken = this.getGuestToken(req);
      const result = await contributionService.getContribution(
        req.params.id as string,
        req.user,
        guestToken
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMyContributions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contributionService.getMyContributions(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestToken = this.getGuestToken(req);
      const result = await contributionService.getReceipt(
        req.params.id as string,
        req.user,
        guestToken
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async claimContributions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contributionService.claimContributions(req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const contributionController = new ContributionController();
