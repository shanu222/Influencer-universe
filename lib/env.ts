const requiredServer = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const optionalServer = [
  "OPENAI_API_KEY",
  "CRON_SECRET",
  "ADMIN_USER_IDS",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "STORAGE_PROVIDER",
  "API_BASE_URL",
  "NEXT_PUBLIC_API_BASE_URL",
] as const;

export function getEnv(name: (typeof requiredServer)[number]): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: (typeof optionalServer)[number]): string | undefined {
  return process.env[name];
}

export function validateServerEnv(): void {
  for (const key of requiredServer) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export const env = {
  supabaseUrl: () => getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: () => getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: () => getOptionalEnv("OPENAI_API_KEY"),
  cronSecret: () => getOptionalEnv("CRON_SECRET"),
  adminUserIds: () => (getOptionalEnv("ADMIN_USER_IDS") ?? "").split(",").filter(Boolean),
  storageProvider: () => getOptionalEnv("STORAGE_PROVIDER") ?? "s3",
  awsRegion: () => getOptionalEnv("AWS_REGION") ?? "us-east-1",
  awsS3Bucket: () => getOptionalEnv("AWS_S3_BUCKET"),
  apiBaseUrl: () => getOptionalEnv("NEXT_PUBLIC_API_BASE_URL") ?? "",
};
