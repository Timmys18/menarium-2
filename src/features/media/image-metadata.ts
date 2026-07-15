export type ImageMetadata = {
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  extension: "jpg" | "png" | "webp" | "gif";
  width: number;
  height: number;
};

const MAX_IMAGE_EDGE = 16_384;
const MAX_IMAGE_PIXELS = 60_000_000;

function hasBytes(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function uint16Be(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function uint16Le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function uint24Le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

function uint32Be(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}

function uint32Le(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]! +
    (bytes[offset + 1]! << 8) +
    (bytes[offset + 2]! << 16) +
    bytes[offset + 3]! * 0x1000000
  );
}

function pngMetadata(bytes: Uint8Array): ImageMetadata | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !hasBytes(bytes, 0, signature) || ascii(bytes, 12, 4) !== "IHDR") {
    return null;
  }

  return {
    contentType: "image/png",
    extension: "png",
    width: uint32Be(bytes, 16),
    height: uint32Be(bytes, 20),
  };
}

function gifMetadata(bytes: Uint8Array): ImageMetadata | null {
  if (bytes.length < 10) return null;
  const signature = ascii(bytes, 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;

  return {
    contentType: "image/gif",
    extension: "gif",
    width: uint16Le(bytes, 6),
    height: uint16Le(bytes, 8),
  };
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegMetadata(bytes: Uint8Array): ImageMetadata | null {
  if (bytes.length < 4 || !hasBytes(bytes, 0, [0xff, 0xd8])) return null;

  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;

    const segmentLength = uint16Be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 7) {
      return {
        contentType: "image/jpeg",
        extension: "jpg",
        width: uint16Be(bytes, offset + 5),
        height: uint16Be(bytes, offset + 3),
      };
    }
    offset += segmentLength;
  }

  return null;
}

function webpMetadata(bytes: Uint8Array): ImageMetadata | null {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkSize = uint32Le(bytes, offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkSize > bytes.length) return null;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        contentType: "image/webp",
        extension: "webp",
        width: uint24Le(bytes, dataOffset + 4) + 1,
        height: uint24Le(bytes, dataOffset + 7) + 1,
      };
    }

    if (
      chunkType === "VP8 " &&
      chunkSize >= 10 &&
      hasBytes(bytes, dataOffset + 3, [0x9d, 0x01, 0x2a])
    ) {
      return {
        contentType: "image/webp",
        extension: "webp",
        width: uint16Le(bytes, dataOffset + 6) & 0x3fff,
        height: uint16Le(bytes, dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && bytes[dataOffset] === 0x2f) {
      const b1 = bytes[dataOffset + 1]!;
      const b2 = bytes[dataOffset + 2]!;
      const b3 = bytes[dataOffset + 3]!;
      const b4 = bytes[dataOffset + 4]!;
      return {
        contentType: "image/webp",
        extension: "webp",
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function normalizeClaimedType(value: string) {
  if (value === "image/jpg" || value === "image/pjpeg") return "image/jpeg";
  return value.toLowerCase();
}

export function inspectImage(bytes: Uint8Array, claimedContentType: string): ImageMetadata {
  const metadata =
    pngMetadata(bytes) ?? gifMetadata(bytes) ?? jpegMetadata(bytes) ?? webpMetadata(bytes);
  if (!metadata) throw new Error("INVALID_IMAGE_CONTENT");
  if (normalizeClaimedType(claimedContentType) !== metadata.contentType) {
    throw new Error("CONTENT_TYPE_MISMATCH");
  }
  if (
    metadata.width <= 0 ||
    metadata.height <= 0 ||
    metadata.width > MAX_IMAGE_EDGE ||
    metadata.height > MAX_IMAGE_EDGE ||
    metadata.width * metadata.height > MAX_IMAGE_PIXELS
  ) {
    throw new Error("IMAGE_DIMENSIONS_TOO_LARGE");
  }

  return metadata;
}
