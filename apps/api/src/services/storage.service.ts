import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from '../config/env';
import { logger } from '../utils/logger';
import { ServiceUnavailableError } from '../utils/errors';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export class StorageService {
  private supabase: SupabaseClient | null = null;
  private uploadsDir: string;
  private bucket: string;

  constructor(customUploadsDir?: string, options?: { forceLocal?: boolean }) {
    this.uploadsDir = customUploadsDir || envConfig.UPLOADS_DIR;
    this.bucket = envConfig.SUPABASE_STORAGE_BUCKET || envConfig.SUPABASE_BUCKET || 'campaign-uploads';

    if (!options?.forceLocal && envConfig.SUPABASE_URL && envConfig.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        this.supabase = createClient(
          envConfig.SUPABASE_URL,
          envConfig.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          }
        );
        logger.info(`StorageService initialized with Supabase Storage (bucket: ${this.bucket})`);
      } catch (err) {
        logger.warn({ err }, 'Failed to initialize Supabase client, falling back to local storage');
        this.supabase = null;
      }
    } else {
      logger.info('Supabase Storage credentials not provided; local disk storage will be used as fallback');
    }

    // Safely attempt local uploads directory creation without crashing startup
    this.ensureLocalUploadsDir();
  }

  /**
   * Safely and lazily ensures that the local uploads directory exists and is writable.
   * Never throws; returns true if directory is writable, false otherwise.
   */
  private ensureLocalUploadsDir(): boolean {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
      fs.accessSync(this.uploadsDir, fs.constants.W_OK);
      return true;
    } catch (err) {
      logger.warn(
        { err, dir: this.uploadsDir },
        'Local uploads directory is not writable or could not be created; local fallback will be disabled.'
      );
      return false;
    }
  }

  getUploadsDir(): string {
    return this.uploadsDir;
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}${ext}`;

    // 1. Supabase Storage Driver (default in production when configured)
    if (this.supabase) {
      try {
        const { error } = await this.supabase.storage
          .from(this.bucket)
          .upload(uniqueFilename, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data: publicUrlData } = this.supabase.storage
          .from(this.bucket)
          .getPublicUrl(uniqueFilename);

        return {
          url: publicUrlData.publicUrl,
          filename: uniqueFilename,
          size: file.size,
          mimeType: file.mimetype,
        };
      } catch (uploadError) {
        logger.error({ err: uploadError }, 'Supabase Storage upload failed, attempting local disk fallback');
        // Fall through to local storage fallback
      }
    }

    // 2. Local Disk Storage Fallback (only for local dev or when Supabase fails)
    const isWritable = this.ensureLocalUploadsDir();
    if (!isWritable) {
      throw new ServiceUnavailableError(
        'Upload storage is temporarily unavailable. Supabase Storage is not configured or failed, and local disk storage is not writable.'
      );
    }

    try {
      const targetPath = path.join(this.uploadsDir, uniqueFilename);
      await fs.promises.writeFile(targetPath, file.buffer);

      return {
        url: `/uploads/${uniqueFilename}`,
        filename: uniqueFilename,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (fsErr) {
      logger.error({ err: fsErr, dir: this.uploadsDir }, 'Failed to write upload to local disk');
      throw new ServiceUnavailableError(
        'Upload storage is temporarily unavailable. Failed to persist uploaded file to disk.'
      );
    }
  }
}

export const storageService = new StorageService();
