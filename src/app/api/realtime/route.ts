import { requireUserId } from "@/server/session";
import { subscribeToUserEvents, type RealtimeEvent } from "@/lib/realtime";
import { reportError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function encodeEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  let cleanup: (() => Promise<void>) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const close = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        req.signal.removeEventListener("abort", onAbort);
        await cleanup?.();
        try {
          controller.close();
        } catch {
          // The browser may already have closed the stream.
        }
      };

      const onAbort = () => {
        void close();
      };

      const send = (event: RealtimeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encodeEvent("update", event));
        } catch {
          void close();
        }
      };

      try {
        cleanup = await subscribeToUserEvents(auth.userId, send);
        controller.enqueue(
          encodeEvent("ready", { connected: true, occurredAt: new Date().toISOString() }),
        );
        heartbeat = setInterval(() => {
          if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }, 15_000);
        req.signal.addEventListener("abort", onAbort, { once: true });
      } catch (error) {
        reportError("realtime.subscription_failed", error, { userId: auth.userId });
        controller.error(error);
      }
    },
    async cancel() {
      if (heartbeat) clearInterval(heartbeat);
      await cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
