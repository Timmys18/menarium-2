import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectImage } from "@/features/media/image-metadata";

const maxUploadBytes = 8 * 1024 * 1024;

export type StoredUpload = {
  url: string;
  key: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

function getS3Client() {
  return new S3Client({
    region: process.env.STORAGE_REGION || "ru-central1",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.STORAGE_ENDPOINT),
    credentials:
      process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

export async function storeImageUpload(file: File, ownerId: string): Promise<StoredUpload> {
  if (file.size <= 0) throw new Error("EMPTY_FILE");
  if (file.size > maxUploadBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = inspectImage(bytes, file.type);
  const key = `uploads/${ownerId}/${Date.now()}-${nanoid(10)}.${metadata.extension}`;

  if (process.env.STORAGE_PROVIDER === "s3") {
    const bucket = process.env.STORAGE_BUCKET;
    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
    if (!bucket || !publicBaseUrl) throw new Error("STORAGE_NOT_CONFIGURED");

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: metadata.contentType,
        CacheControl: "public, max-age=31536000, immutable",
        ContentDisposition: "inline",
      }),
    );

    return {
      key,
      url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
      contentType: metadata.contentType,
      sizeBytes: file.size,
      width: metadata.width,
      height: metadata.height,
    };
  }

  const root = path.join(process.cwd(), "public", "uploads");
  const diskPath = path.join(root, key.replace(/^uploads\//, ""));
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, bytes);

  const publicBase = process.env.STORAGE_PUBLIC_BASE_URL || "/uploads";
  return {
    key,
    url: `${publicBase.replace(/\/$/, "")}/${key.replace(/^uploads\//, "")}`,
    contentType: metadata.contentType,
    sizeBytes: file.size,
    width: metadata.width,
    height: metadata.height,
  };
}

export async function deleteStoredUpload(key: string): Promise<void> {
  if (!key.startsWith("uploads/") || key.includes("..")) {
    throw new Error("INVALID_STORAGE_KEY");
  }

  if (process.env.STORAGE_PROVIDER === "s3") {
    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) throw new Error("STORAGE_NOT_CONFIGURED");
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }

  const root = path.join(process.cwd(), "public", "uploads");
  const diskPath = path.join(root, key.replace(/^uploads\//, ""));
  await unlink(diskPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
