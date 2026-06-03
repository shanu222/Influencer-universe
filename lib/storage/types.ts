export interface StorageUploadResult {
  key: string;
  url: string;
  provider: "s3" | "supabase";
}

export interface StorageProvider {
  upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
