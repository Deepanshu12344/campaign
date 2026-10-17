import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.getNotifications(req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markRead(req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPrefs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.updateNotificationPrefs(req.user!.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
