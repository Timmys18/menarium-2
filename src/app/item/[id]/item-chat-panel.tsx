"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatConversation, type ChatMessageView } from "@/components/chat/chat-conversation";
import { GlassCard } from "@/components/menarium/card";

export function ItemChatPanel({
  itemId,
  initialThreadId,
  currentUserId,
  messages,
  nextCursor,
  canWrite,
  isOwner = false,
}: {
  itemId: string;
  initialThreadId: string | null;
  currentUserId: string;
  messages: ChatMessageView[];
  nextCursor: string | null;
  canWrite: boolean;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [threadId, setThreadId] = useState(initialThreadId);

  async function ensureThread() {
    if (threadId) {
      return {
        endpoint: `/api/items/chat/${threadId}/messages`,
        entityId: threadId,
      };
    }
    const response = await fetch(`/api/items/${itemId}/chat`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Не удалось открыть чат");
    const nextThreadId = body.data?.id;
    if (typeof nextThreadId !== "string") throw new Error("Сервер не вернул созданный чат");
    setThreadId(nextThreadId);
    router.replace(`/item/${itemId}?thread=${nextThreadId}`);
    return {
      endpoint: `/api/items/chat/${nextThreadId}/messages`,
      entityId: nextThreadId,
    };
  }

  return (
    <GlassCard className="mt-8 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Чат по объявлению</h2>
        <p className="mt-1 text-sm text-white/45">
          {!canWrite
            ? "Переписка сохранена в истории, но новые сообщения для этого объявления закрыты."
            : isOwner
            ? "Ответьте покупателю на вопрос по этому объявлению."
            : "Задайте вопрос владельцу до предложения обмена."}
        </p>
      </div>
      <ChatConversation
        target={
          threadId
            ? { endpoint: `/api/items/chat/${threadId}/messages`, entityId: threadId }
            : null
        }
        resolveTarget={ensureThread}
        currentUserId={currentUserId}
        initialMessages={messages}
        initialNextCursor={nextCursor}
        realtimeTypes={["item-message"]}
        canWrite={canWrite}
        placeholder={isOwner ? "Ответьте покупателю..." : "Напишите владельцу..."}
        disabledPlaceholder="Переписка закрыта для новых сообщений"
        emptyMessage="Сообщений пока нет. Начните диалог первым сообщением."
        draftKey={`item:${itemId}`}
      />
    </GlassCard>
  );
}
