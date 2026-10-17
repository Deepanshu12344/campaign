import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

router.get('/me/notifications', requireAuth, (req, res, next) =>
  notificationController.getNotifications(req, res, next)
);

router.post('/me/notifications/read', requireAuth, (req, res, next) =>
  notificationController.markRead(req, res, next)
);

router.patch('/me/notification-prefs', requireAuth, (req, res, next) =>
  notificationController.updateNotificationPrefs(req, res, next)
);

export const notificationRoutes = router;
