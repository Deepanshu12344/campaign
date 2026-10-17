import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from '../services/storage.service.js';
import { ServiceUnavailableError } from '../utils/errors.js';
import fs from 'fs';
import path from 'path';

describe('StorageService & Resilient Upload Storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('instantiates safely without throwing even if mkdir fails with EACCES', () => {
    // Mock fs.existsSync to return false and fs.mkdirSync to throw EACCES
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      const err = new Error("EACCES: permission denied, mkdir '/uploads'");
      (err as NodeJS.ErrnoException).code = 'EACCES';
      throw err;
    });

    expect(() => {
      const svc = new StorageService('/restricted/uploads');
      expect(svc).toBeDefined();
    }).not.toThrow();
  });

  it('throws ServiceUnavailableError (HTTP 503) when Supabase is not configured and local storage is not writable', async () => {
    // Mock fs.accessSync to throw permission denied
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'accessSync').mockImplementation(() => {
      const err = new Error("EACCES: permission denied, access '/uploads'");
      (err as NodeJS.ErrnoException).code = 'EACCES';
      throw err;
    });

    const svc = new StorageService('/non-writable/uploads');
    const fakeFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test image data'),
      mimetype: 'image/jpeg',
      size: 15,
    } as Express.Multer.File;

    await expect(svc.uploadFile(fakeFile)).rejects.toThrow(ServiceUnavailableError);
    await expect(svc.uploadFile(fakeFile)).rejects.toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('successfully writes to local storage when directory is writable', async () => {
    const tempTestDir = path.resolve(process.cwd(), 'uploads/test-temp');
    const svc = new StorageService(tempTestDir);
    const fakeFile = {
      originalname: 'unit-test.png',
      buffer: Buffer.from('sample pixel data'),
      mimetype: 'image/png',
      size: 17,
    } as Express.Multer.File;

    const result = await svc.uploadFile(fakeFile);
    expect(result).toHaveProperty('url');
    expect(result.url).toMatch(/^\/uploads\//);
    expect(result.size).toBe(17);
    expect(result.mimeType).toBe('image/png');

    // Clean up created test file if exists
    try {
      const filePath = path.join(tempTestDir, result.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(tempTestDir)) {
        fs.rmdirSync(tempTestDir);
      }
    } catch {
      // Ignore cleanup error
    }
  });
});
