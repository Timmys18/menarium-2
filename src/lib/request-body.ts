export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("REQUEST_BODY_TOO_LARGE");
  }
}

/**
 * Applies the size limit while bytes are still arriving. `Request.formData()`
 * otherwise has no safe upper bound when Content-Length is absent or forged.
 */
export async function readFormDataWithinLimit(request: Request, maximumBytes: number) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) throw new Error("REQUEST_BODY_MISSING");

  let receivedBytes = 0;
  const guardedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > maximumBytes) {
          controller.error(new RequestBodyTooLargeError());
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  return new Response(guardedBody, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}
