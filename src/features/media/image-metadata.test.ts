import { describe, expect, it } from "vitest";
import { inspectImage } from "./image-metadata";

function setUint16Be(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function setUint24Le(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

function setUint32Be(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function setUint32Le(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  [...value].forEach((character, index) => {
    bytes[offset + index] = character.charCodeAt(0);
  });
}

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  setUint32Be(bytes, 8, 13);
  writeAscii(bytes, 12, "IHDR");
  setUint32Be(bytes, 16, width);
  setUint32Be(bytes, 20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  const bytes = new Uint8Array(23);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  setUint16Be(bytes, 7, height);
  setUint16Be(bytes, 9, width);
  bytes.set([0xff, 0xd9], 21);
  return bytes;
}

function gif(width: number, height: number) {
  const bytes = new Uint8Array(10);
  writeAscii(bytes, 0, "GIF89a");
  bytes[6] = width & 0xff;
  bytes[7] = (width >>> 8) & 0xff;
  bytes[8] = height & 0xff;
  bytes[9] = (height >>> 8) & 0xff;
  return bytes;
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30);
  writeAscii(bytes, 0, "RIFF");
  setUint32Le(bytes, 4, 22);
  writeAscii(bytes, 8, "WEBP");
  writeAscii(bytes, 12, "VP8X");
  setUint32Le(bytes, 16, 10);
  setUint24Le(bytes, 24, width - 1);
  setUint24Le(bytes, 27, height - 1);
  return bytes;
}

describe("inspectImage", () => {
  it.each([
    [png(1200, 800), "image/png", "png"],
    [jpeg(1600, 900), "image/jpeg", "jpg"],
    [gif(640, 480), "image/gif", "gif"],
    [webp(1920, 1080), "image/webp", "webp"],
  ] as const)("detects image bytes instead of trusting the filename", (bytes, type, extension) => {
    expect(inspectImage(bytes, type)).toMatchObject({ contentType: type, extension });
  });

  it("rejects a spoofed browser MIME type", () => {
    expect(() => inspectImage(png(800, 600), "image/jpeg")).toThrow("CONTENT_TYPE_MISMATCH");
  });

  it("rejects malformed non-image data", () => {
    expect(() => inspectImage(new TextEncoder().encode("not an image"), "image/png")).toThrow(
      "INVALID_IMAGE_CONTENT",
    );
  });

  it("rejects decompression-bomb dimensions", () => {
    expect(() => inspectImage(png(16_000, 16_000), "image/png")).toThrow(
      "IMAGE_DIMENSIONS_TOO_LARGE",
    );
  });
});
