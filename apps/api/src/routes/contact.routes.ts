import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { ContactInputSchema, ContactInput } from '@campaigns/shared';
import { validate } from '../middlewares/validate.middleware';
import { logger } from '../index';

export const contactRoutes = Router();

// Rate limiter: 10 contact submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many contact requests from this IP, please try again later.',
    },
  },
});

contactRoutes.post(
  '/contact',
  contactLimiter,
  validate({ body: ContactInputSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as ContactInput;

      // Generate a human-readable support ticket ID
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketId = `TICK-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

      // Privacy requirement: Log metadata strictly WITHOUT personal data (no name or email in log payload)
      logger.info({
        action: 'contact_submission_received',
        ticketId,
        topic: input.topic,
        messageLength: input.message.length,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for contacting Campaigns. Your message has been received, and our support team will follow up if required.',
        ticketId,
      });
    } catch (err) {
      next(err);
    }
  }
);
