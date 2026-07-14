import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxUploadBytes = 8 * 1024 * 1024;

export type StoredUpload = {
  url: string;
  key: string;
  contentType: string;
  sizeBytes: number;
};

function safeExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

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
  if (!allowedContentTypes.has(file.type)) {
    throw new Error("UNSUPPORTED_CONTENT_TYPE");
  }
  if (file.size > maxUploadBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = safeExtension(file.type);
  const key = `uploads/${ownerId}/${Date.now()}-${nanoid(10)}.${extension}`;

  if (process.env.STORAGE_PROVIDER === "s3") {
    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) throw new Error("STORAGE_NOT_CONFIGURED");

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: file.type,
      }),
    );

    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;
    return {
      key,
      url: publicBaseUrl ? `${publicBaseUrl.replace(/\/$/, "")}/${key}` : key,
      contentType: file.type,
      sizeBytes: file.size,
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
    contentType: file.type,
    sizeBytes: file.size,
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
