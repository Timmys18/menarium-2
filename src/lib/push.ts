import webPush from "web-push";
import { ChatKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/logger";

type PushPayload = {
  title: string;
  body: string;
  href: string;
  tag: string;
};

function configureWebPush() {
  const subject = process.env.WEB_PUSH_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return false;

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isWebPushConfigured() {
  return Boolean(
    process.env.WEB_PUSH_SUBJECT?.trim() &&
      process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() &&
      process.env.WEB_PUSH_PRIVATE_KEY?.trim(),
  );
}

export async function sendChatPush({
  userId,
  kind,
  entityId,
  payload,
}: {
  userId: string;
  kind: ChatKind;
  entityId: string;
  payload: PushPayload;
}) {
  if (!configureWebPush()) return;

  const muted = await prisma.chatPreference.findUnique({
    where: { userId_kind_entityId: { userId, kind, entityId } },
    select: { muted: true },
  });
  if (muted?.muted) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  const serialized = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          serialized,
          { TTL: 60 * 60, urgency: "high", topic: payload.tag.slice(0, 32) },
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
          return;
        }
        reportError("push.send_failed", error, {
          userId,
          subscriptionId: subscription.id,
        });
      }
    }),
  );
}
