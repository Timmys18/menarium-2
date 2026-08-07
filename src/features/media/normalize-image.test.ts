import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizePublicImage } from "./normalize-image";

describe("normalizePublicImage", () => {
  it("removes EXIF and resizes the public derivative", async () => {
    const source = await sharp({
      create: { width: 4096, height: 2731, channels: 3, background: "#0b78d0" },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: "private owner" } } })
      .toBuffer();

    const normalized = await normalizePublicImage(source, "image/jpeg");
    const metadata = await sharp(normalized.bytes).metadata();

    expect(normalized.metadata).toMatchObject({ contentType: "image/webp", extension: "webp" });
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(2048);
    expect(metadata.exif).toBeUndefined();
  });
});
