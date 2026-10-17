import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { envConfig } from './config/env';
import { logger } from './utils/logger';
import apiV1Router from './routes';
import { uploadRoutes } from './routes/upload.routes.js';
import { errorHandler } from './middlewares/error.middleware';
import { jobsService } from './services/jobs.service';
import { prisma } from './utils/prisma';

export { logger };

const app = express();
const port = envConfig.PORT;

// Trust proxy for production reverse proxies (Render, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// Security & Parsing Middlewares
app.use(helmet());

// Production-ready CORS configuration
const allowedOrigins = envConfig.ALLOWED_ORIGINS;
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile applications, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // If allowed origins are explicitly defined, validate against list
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }

      // In non-production environments with no ALLOWED_ORIGINS set, allow requesting origin
      if (envConfig.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // In production without ALLOWED_ORIGINS defined, deny web browser origins for security
      return callback(new Error('CORS origin denied in production: ALLOWED_ORIGINS not configured'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: envConfig.NODE_ENV !== 'test',
  })
);

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint (at root)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: envConfig.NODE_ENV,
  });
});

// Static uploads serving (for local fallback)
app.use('/uploads', express.static(envConfig.UPLOADS_DIR));

// Also mount uploadRoutes at root so POST /uploads works directly
app.use(uploadRoutes);

// Mount API v1 router
app.use('/api/v1', apiV1Router);

// 404 handler for undefined routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Centralized error handler
app.use(errorHandler);

let server: ReturnType<typeof app.listen> | null = null;

if (envConfig.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    logger.info(`Campaigns API running on port ${port} (env: ${envConfig.NODE_ENV})`);
    // Start background jobs worker
    jobsService.start();
  });

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    jobsService.stop();

    if (server) {
      server.close(() => {
        logger.info('HTTP server closed.');
      });
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma connection pool closed.');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting Prisma');
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
