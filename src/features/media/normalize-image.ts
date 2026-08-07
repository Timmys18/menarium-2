import sharp from "sharp";
import { inspectImage, type ImageMetadata } from "@/features/media/image-metadata";

const MAX_PUBLIC_IMAGE_EDGE = 2048;
const MAX_INPUT_PIXELS = 60_000_000;

export type NormalizedImage = {
  bytes: Buffer;
  metadata: ImageMetadata;
};

/**
 * Only the newly encoded derivative is stored. Sharp does not retain EXIF,
 * GPS, camera serial numbers, or the original orientation metadata by default.
 */
export async function normalizePublicImage(
  bytes: Buffer,
  claimedContentType: string,
): Promise<NormalizedImage> {
  const source = inspectImage(bytes, claimedContentType);
  const transformed = await sharp(bytes, {
    animated: source.contentType === "image/gif",
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .resize({
      width: MAX_PUBLIC_IMAGE_EDGE,
      height: MAX_PUBLIC_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4, smartSubsample: true })
    .toBuffer();

  return {
    bytes: transformed,
    metadata: inspectImage(transformed, "image/webp"),
  };
}
