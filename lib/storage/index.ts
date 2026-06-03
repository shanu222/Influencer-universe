import type { StorageProvider } from "./types";

let cachedProvider: StorageProvider | null = null;

export type { StorageProvider, StorageUploadResult } from "./types";

export async function getStorageProvider(): Promise<StorageProvider> {
  if (cachedProvider) return cachedProvider;

  const provider = process.env.STORAGE_PROVIDER ?? "s3";

  if (provider === "supabase") {
    const { createSupabaseStorageProvider } = await import("./supabase");
    cachedProvider = await createSupabaseStorageProvider();
    return cachedProvider;
  }

  const { createS3StorageProvider } = await import("./s3");
  cachedProvider = await createS3StorageProvider();
  return cachedProvider;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  const storage = await getStorageProvider();
  return storage.upload(key, body, contentType);
}

export async function deleteFile(key: string) {
  const storage = await getStorageProvider();
  return storage.delete(key);
}

export async function getPublicUrl(key: string) {
  const storage = await getStorageProvider();
  return storage.getPublicUrl(key);
}
