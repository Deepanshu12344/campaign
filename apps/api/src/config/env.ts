/**
 * Production environment configuration and fail-fast validation.
 */

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  DIRECT_URL?: string;
  JWT_SECRET: string;
  LOG_LEVEL: string;
  ALLOWED_ORIGINS: string[];
  UPLOADS_DIR: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_BUCKET: string;
  SUPABASE_STORAGE_BUCKET: string;
  GEMINI_API_KEY?: string;
}

import fs from 'fs';
import path from 'path';

export function validateEnv(): EnvConfig {
  // Automatically load local .env file in dev/test if available in Node 20+
  if (typeof (process as unknown as { loadEnvFile?: (path?: string) => void }).loadEnvFile === 'function') {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'apps/api/.env'),
      path.resolve(__dirname, '../../.env'),
      path.resolve(__dirname, '../.env'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(cand);
          break;
        } catch {
          // ignore parsing error or already loaded
        }
      }
    }
  }

  const missing: string[] = [];

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && !isTest) {
    missing.push('DATABASE_URL is required for database connectivity (e.g. postgresql://user:pass@host:port/db)');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && !isTest) {
    missing.push('JWT_SECRET is required to sign and verify authentication tokens');
  }

  if (missing.length > 0) {
    const banner = '='.repeat(80);
    const divider = '-'.repeat(80);
    console.error(`\n${banner}\n🚨 CRITICAL STARTUP ERROR: Missing required environment variables\n${divider}`);
    for (const msg of missing) {
      console.error(`  ✖ ${msg}`);
    }
    console.error(`${banner}\nExiting process immediately.\n`);
    process.exit(1);
  }

  // Parse allowed origins
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
  const parsedOrigins = rawAllowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Resolve uploads directory safely relative to process.cwd()
  const rawUploadsDir = process.env.UPLOADS_DIR?.trim();
  let resolvedUploadsDir: string;
  if (!rawUploadsDir) {
    resolvedUploadsDir = path.resolve(process.cwd(), 'uploads');
  } else if (path.isAbsolute(rawUploadsDir)) {
    // If an absolute path is provided, prevent resolving to filesystem root '/' or '/uploads'
    // Allow if it is an explicit subpath inside process.cwd(); otherwise force relative to process.cwd()
    if (rawUploadsDir.startsWith(process.cwd()) && rawUploadsDir !== '/') {
      resolvedUploadsDir = rawUploadsDir;
    } else {
      const relativePart = rawUploadsDir.replace(/^[/\\]+/, '');
      resolvedUploadsDir = path.resolve(process.cwd(), relativePart || 'uploads');
    }
  } else {
    resolvedUploadsDir = path.resolve(process.cwd(), rawUploadsDir);
  }

  const supabaseBucket =
    process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'campaign-uploads';

  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '4000', 10),
    DATABASE_URL: databaseUrl || 'postgresql://postgres:postgres@localhost:5432/campaigns',
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_SECRET: jwtSecret || 'test-jwt-secret-do-not-use-in-production-1234567890',
    LOG_LEVEL: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
    ALLOWED_ORIGINS: parsedOrigins,
    UPLOADS_DIR: resolvedUploadsDir,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: supabaseBucket,
    SUPABASE_STORAGE_BUCKET: supabaseBucket,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };
}

export const envConfig = validateEnv();
