import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from '../config/env';
import { logger } from '../utils/logger';

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

  constructor() {
    this.uploadsDir = path.resolve(__dirname, '../../uploads');
    this.bucket = envConfig.SUPABASE_BUCKET || 'campaign-uploads';

    if (envConfig.SUPABASE_URL && envConfig.SUPABASE_SERVICE_ROLE_KEY) {
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
      logger.info('Supabase Storage credentials not provided; using local disk storage (/uploads)');
    }

    // Ensure local uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}${ext}`;

    // 1. Supabase Storage Driver
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
        logger.error({ err: uploadError }, 'Supabase Storage upload failed, falling back to local disk');
        // Fall through to local storage fallback
      }
    }

    // 2. Local Disk Storage Fallback
    const targetPath = path.join(this.uploadsDir, uniqueFilename);
    await fs.promises.writeFile(targetPath, file.buffer);

    return {
      url: `/uploads/${uniqueFilename}`,
      filename: uniqueFilename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

export const storageService = new StorageService();
