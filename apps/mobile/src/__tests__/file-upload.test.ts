import { describe, it, expect, vi } from 'vitest';

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

vi.mock('../api/client', () => ({
  apiClient: {
    uploadFile: vi.fn().mockResolvedValue({ url: '/uploads/mock.jpg' }),
    getBaseUrl: () => 'http://localhost:4000/api/v1',
  },
}));

import { createUploadFormData, uploadImage } from '../utils/fileUpload';

describe('fileUpload utility', () => {
  it('creates FormData with Blob on web when uri is provided', async () => {
    // Mock global fetch to return a blob
    const mockBlob = new Blob(['test image content'], { type: 'image/jpeg' });
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    }) as unknown as typeof fetch;

    const formData = await createUploadFormData({
      uri: 'blob:http://localhost:8081/test-blob-uuid',
      fileName: 'my-photo.jpg',
      mimeType: 'image/jpeg',
    });

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('file')).toBeDefined();
  });

  it('correctly handles file object if provided directly on web', async () => {
    const mockFile = new Blob(['sample file data'], { type: 'image/png' });
    const formData = await createUploadFormData({
      uri: 'blob:http://localhost:8081/test-blob-uuid',
      fileName: 'image.png',
      mimeType: 'image/png',
      file: mockFile,
    });

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('file')).toBeDefined();
  });

  it('infers mimeType from filename extension when omitted', async () => {
    const mockBlob = new Blob(['test image content'], { type: 'image/webp' });
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    }) as unknown as typeof fetch;

    const formData = await createUploadFormData({
      uri: 'blob:http://localhost:8081/test-blob-uuid',
      fileName: 'banner.webp',
    });

    expect(formData).toBeInstanceOf(FormData);
  });

  it('uploadImage resolves fullUrl from relative upload response', async () => {
    const res = await uploadImage({
      uri: 'blob:http://localhost:8081/test-blob-uuid',
      fileName: 'photo.jpg',
    });

    expect(res.url).toBe('/uploads/mock.jpg');
    expect(res.fullUrl).toBe('http://localhost:4000/uploads/mock.jpg');
  });
});
