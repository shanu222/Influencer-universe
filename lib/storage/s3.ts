import type { StorageProvider, StorageUploadResult } from "./types";

/**
 * AWS S3 storage provider.
 * Requires AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET.
 * Uses dynamic import to avoid bundling AWS SDK on client.
 */
export async function createS3StorageProvider(): Promise<StorageProvider> {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is required for S3 storage");
  }

  const region = process.env.AWS_REGION ?? "us-east-1";
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  const publicBase =
    process.env.AWS_S3_PUBLIC_URL ?? `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    async upload(key, body, contentType): Promise<StorageUploadResult> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ACL: "public-read",
        })
      );
      return { key, url: `${publicBase}/${key}`, provider: "s3" };
    },

    async delete(key): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    getPublicUrl(key: string): string {
      return `${publicBase}/${key}`;
    },
  };
}
