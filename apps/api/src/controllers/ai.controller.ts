import { Request, Response, NextFunction } from 'express';
import {
  AiDraftBasicsInputSchema,
  AiDraftStoryInputSchema,
  AiAdCopyInputSchema,
} from '@campaigns/shared';
import { aiService } from '../services/ai.service';
import { BadRequestError } from '../utils/errors';

export class AiController {
  async draftBasics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = AiDraftBasicsInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          'Invalid input for AI draft suggestions',
          'BAD_REQUEST',
          parsed.error.flatten().fieldErrors
        );
      }

      const result = await aiService.generateDraftBasics(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async draftStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = AiDraftStoryInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          'Invalid input for AI story suggestions',
          'BAD_REQUEST',
          parsed.error.flatten().fieldErrors
        );
      }

      const result = await aiService.generateDraftStory(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async draftAdCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = AiAdCopyInputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          'Invalid input for AI ad copy suggestions',
          'BAD_REQUEST',
          parsed.error.flatten().fieldErrors
        );
      }

      const result = await aiService.generateAdCopy(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
