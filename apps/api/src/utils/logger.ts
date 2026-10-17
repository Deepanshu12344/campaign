import { pino } from 'pino';
import { envConfig } from '../config/env';

export const logger = pino({
  level: envConfig.LOG_LEVEL,
});
