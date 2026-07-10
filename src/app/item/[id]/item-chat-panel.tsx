"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";

type ItemChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export function ItemChatPanel({
  itemId,
  initialThreadId,
  currentUserId,
  messages,
  isOwner = false,
}: {
  itemId: string;
  initialThreadId: string | null;
  currentUserId: string;
  messages: ItemChatMessage[];
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [threadId, setThreadId] = useState(initialThreadId);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useAutoRefresh(Boolean(threadId), 8000);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function readError(response: Response) {
    const body = await response.json().catch(() => ({}));
    return typeof body.error === "string" ? body.error : "Не удалось отправить сообщение";
  }

  async function ensureThread() {
    if (threadId) return threadId;
    const response = await fetch(`/api/items/${itemId}/chat`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Не удалось открыть чат");
    setThreadId(body.data.id);
    return body.data.id as string;
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError(null);
    setIsSending(true);
    try {
      const nextThreadId = await ensureThread();
      const response = await fetch(`/api/items/chat/${nextThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setText("");
      router.replace(`/item/${itemId}?thread=${nextThreadId}`);
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <GlassCard className="mt-8 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Чат по объявлению</h2>
        <p className="mt-1 text-sm text-white/45">
          {isOwner
            ? "Ответьте покупателю на вопрос по этому объявлению."
            : "Задайте вопрос владельцу до предложения обмена."}
        </p>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl p-4 text-sm ${
                message.senderId === currentUserId
                  ? "ml-8 bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white/80"
                  : "bg-white/5 text-white/70"
              }`}
            >
              {message.text}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/55">
            Сообщений пока нет. Начните диалог первым сообщением.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            disabled={isSending}
            className="glass-card min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-white/35 disabled:opacity-50"
            placeholder={isOwner ? "Ответьте покупателю..." : "Напишите владельцу..."}
          />
          <MenariumButton size="sm" onClick={sendMessage} disabled={isSending || !text.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </MenariumButton>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </GlassCard>
  );
}
