import { describe, expect, it } from "vitest";
import { RequestBodyTooLargeError, readFormDataWithinLimit } from "./request-body";

function multipartBody(content: string) {
  const boundary = "menarium-test-boundary";
  const encoder = new TextEncoder();
  const payload = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.txt"\r\nContent-Type: text/plain\r\n\r\n${content}\r\n--${boundary}--\r\n`,
  );
  return { boundary, payload };
}

describe("readFormDataWithinLimit", () => {
  it("rejects a multipart body that exceeds the limit even without Content-Length", async () => {
    const { boundary, payload } = multipartBody("x".repeat(256));
    const request = new Request("http://menarium.test/api/media", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(payload.slice(0, 80));
          controller.enqueue(payload.slice(80));
          controller.close();
        },
      }),
      // Node requires this when a request body is a stream.
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readFormDataWithinLimit(request, 128)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("parses a body inside the limit", async () => {
    const { boundary, payload } = multipartBody("safe");
    const request = new Request("http://menarium.test/api/media", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body: payload,
    });

    const formData = await readFormDataWithinLimit(request, 1024);
    expect((formData.get("file") as File).name).toBe("photo.txt");
  });
});
