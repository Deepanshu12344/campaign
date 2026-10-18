import { Platform } from 'react-native';
import { apiClient } from '../api/client';

export interface ImageAssetInput {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  type?: string | null;
  file?: unknown;
}

/**
 * Creates a platform-compliant FormData instance for file uploads.
 * - On Web: uses the underlying File object if available, or fetches the blob: URI into a standard Blob.
 * - On Native (Android/iOS): uses expo-file-system File which implements Blob with .bytes() for Expo's WinterCG fetch,
 *   falling back gracefully if unavailable.
 */
export async function createUploadFormData(
  asset: ImageAssetInput,
  fieldName = 'file'
): Promise<FormData> {
  const formData = new FormData();
  const filename =
    asset.fileName ||
    asset.name ||
    asset.uri.split('/').pop() ||
    'upload.jpg';

  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeType =
    asset.mimeType ||
    (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

  if (Platform.OS === 'web') {
    // Web: If browser File/Blob is provided directly (e.g. from expo-image-picker web)
    if (asset.file && typeof (asset.file as Blob).slice === 'function') {
      formData.append(fieldName, asset.file as Blob, filename);
      return formData;
    }
    // Web: Fetch blob from object/data URL
    try {
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      formData.append(fieldName, blob, filename);
      return formData;
    } catch {
      // Fallback
      formData.append(fieldName, {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);
      return formData;
    }
  }

  // Native (Android & iOS): Expo SDK 52+ WinterCG File
  try {
    // Dynamic require so web bundlers don't attempt to bundle native ExpoFileSystem
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File: ExpoFile } = require('expo-file-system');
    const expoFile = new ExpoFile(asset.uri);
    formData.append(fieldName, expoFile as unknown as Blob);
    return formData;
  } catch {
    // Fallback 1: Fetch local blob if runtime supports it
    try {
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      formData.append(fieldName, blob, filename);
      return formData;
    } catch {
      // Fallback 2: React Native legacy FormData representation
      formData.append(fieldName, {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);
      return formData;
    }
  }
}

/**
 * Uploads an image asset to /uploads and returns the resolved full URL.
 */
export async function uploadImage(
  asset: ImageAssetInput
): Promise<{ url: string; fullUrl: string }> {
  const formData = await createUploadFormData(asset);
  const res = await apiClient.uploadFile<{ url: string }>('/uploads', formData);
  const fullUrl = res.url.startsWith('http')
    ? res.url
    : `${apiClient.getBaseUrl().replace(/\/api\/v1$/, '')}${res.url}`;
  return { url: res.url, fullUrl };
}
