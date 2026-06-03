import type { StorageProvider, StorageUploadResult } from "./types";

export async function createSupabaseStorageProvider(): Promise<StorageProvider> {
  const { createServiceClient } = await import("@/lib/supabase/server");
  const supabase = await createServiceClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

  return {
    async upload(key, body, contentType): Promise<StorageUploadResult> {
      const { error } = await supabase.storage.from(bucket).upload(key, body, {
        contentType,
        upsert: true,
      });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return { key, url: data.publicUrl, provider: "supabase" };
    },

    async delete(key): Promise<void> {
      const { error } = await supabase.storage.from(bucket).remove([key]);
      if (error) throw new Error(error.message);
    },

    getPublicUrl(key: string): string {
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    },
  };
}
