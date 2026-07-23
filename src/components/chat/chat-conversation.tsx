"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";
import type { RealtimeEvent } from "@/components/hooks/use-realtime";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumTextarea } from "@/components/menarium/input";

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

type ConversationTarget = {
  endpoint: string;
  entityId: string;
};

function mergeMessages(current: ChatMessageView[], incoming: ChatMessageView[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));

  return [...byId.values()].sort((left, right) => {
    const byDate = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return byDate || left.id.localeCompare(right.id);
  });
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : fallback;
}

export function ChatConversation({
  target: initialTarget,
  resolveTarget,
  currentUserId,
  initialMessages,
  initialNextCursor,
  realtimeTypes,
  canWrite,
  placeholder,
  disabledPlaceholder,
  emptyMessage,
  draftKey,
}: {
  target: ConversationTarget | null;
  resolveTarget?: () => Promise<ConversationTarget>;
  currentUserId: string;
  initialMessages: ChatMessageView[];
  initialNextCursor: string | null;
  realtimeTypes: RealtimeEvent["type"][];
  canWrite: boolean;
  placeholder: string;
  disabledPlaceholder: string;
  emptyMessage: string;
  draftKey: string;
}) {
  const router = useRouter();
  const draftStorageKey = `menarium:chat-draft:v1:${currentUserId}:${draftKey}`;
  const [target, setTarget] = useState(initialTarget);
  const [localMessages, setLocalMessages] = useState<ChatMessageView[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prependHeightRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const messages = mergeMessages(initialMessages, localMessages);
  const nextCursor = historyCursor === undefined ? initialNextCursor : historyCursor;
  const messageLayoutKey = `${messages.length}:${messages[0]?.id ?? ""}:${messages.at(-1)?.id ?? ""}`;

  useEffect(() => {
    const restoreDraft = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(draftStorageKey);
        if (saved) setText(saved.slice(0, 2000));
      } catch {
        // Chat remains usable when browser storage is unavailable.
      }
      setDraftReady(true);
    }, 0);

    return () => window.clearTimeout(restoreDraft);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    try {
      if (text) {
        window.localStorage.setItem(draftStorageKey, text);
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // Draft persistence is an enhancement and must not block messaging.
    }
  }, [draftReady, draftStorageKey, text]);

  const connected = useAutoRefresh(Boolean(target), (event) => {
    return Boolean(
      target && event.entityId === target.entityId && realtimeTypes.includes(event.type),
    );
  });

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (prependHeightRef.current !== null) {
      container.scrollTop += container.scrollHeight - prependHeightRef.current;
      prependHeightRef.current = null;
      return;
    }

    if (shouldStickToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messageLayoutKey]);

  async function loadOlder() {
    if (!target || !nextCursor || isLoadingOlder) return;

    setError(null);
    setIsLoadingOlder(true);
    const container = scrollRef.current;
    if (container) prependHeightRef.current = container.scrollHeight;

    try {
      const response = await fetch(
        `${target.endpoint}?before=${encodeURIComponent(nextCursor)}&limit=40`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Не удалось загрузить историю сообщений"));
      }
      const body = (await response.json()) as {
        items?: ChatMessageView[];
        nextCursor?: string | null;
      };
      const incoming = body.items ?? [];
      if (incoming.every((message) => messages.some((current) => current.id === message.id))) {
        prependHeightRef.current = null;
      }
      setLocalMessages((current) => mergeMessages(current, incoming));
      setHistoryCursor(body.nextCursor ?? null);
    } catch (loadError) {
      prependHeightRef.current = null;
      setError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить историю сообщений",
      );
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending || !canWrite) return;

    setError(null);
    setIsSending(true);
    try {
      const nextTarget = target ?? (await resolveTarget?.());
      if (!nextTarget) throw new Error("Не удалось открыть чат");
      if (!target) setTarget(nextTarget);

      const response = await fetch(nextTarget.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Не удалось отправить сообщение"));
      }
      const body = (await response.json()) as { data?: ChatMessageView };
      if (!body.data) throw new Error("Сервер не вернул отправленное сообщение");

      shouldStickToBottomRef.current = true;
      setLocalMessages((current) => mergeMessages(current, [body.data!]));
      setText("");
      startTransition(() => router.refresh());
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const container = event.currentTarget;
          shouldStickToBottomRef.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < 96;
        }}
        role="log"
        aria-live="polite"
        aria-label="Сообщения чата"
        className="max-h-[28rem] space-y-3 overflow-y-auto overscroll-contain pr-1"
      >
        {nextCursor ? (
          <div className="flex justify-center pb-1">
            <MenariumButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={loadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Показать ранние сообщения
            </MenariumButton>
          </div>
        ) : null}

        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <article
                  aria-label={isOwn ? "Ваше сообщение" : "Сообщение собеседника"}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm sm:max-w-[78%] ${
                    isOwn
                      ? "bg-gradient-to-r from-teal-500/20 to-cyan-400/15 text-white/90"
                      : "border border-white/[0.06] bg-white/5 text-white/75"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <time
                    dateTime={message.createdAt}
                    suppressHydrationWarning
                    className="mt-1.5 block text-[11px] text-white/52"
                  >
                    {formatMessageTime(message.createdAt)}
                  </time>
                </article>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/5 p-4 text-sm text-white/64">
            {emptyMessage}
          </div>
        )}
      </div>

      <form className="mt-5 space-y-2" onSubmit={sendMessage}>
        <div className="flex items-end gap-2">
          <MenariumTextarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            disabled={!canWrite || isSending}
            maxLength={2000}
            rows={1}
            aria-label="Текст сообщения"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-y py-2.5 text-sm disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.025] disabled:text-white/55 disabled:placeholder:text-white/48"
            placeholder={canWrite ? placeholder : disabledPlaceholder}
          />
          <MenariumButton
            type="submit"
            size="sm"
            aria-label="Отправить сообщение"
            disabled={!canWrite || isSending || !text.trim()}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </MenariumButton>
        </div>
        <div className="flex min-h-5 items-center justify-between gap-3 text-xs">
          {error ? (
            <p role="alert" className="text-red-300">{error}</p>
          ) : text.trim() ? (
            <span className="text-white/42">Черновик сохранён</span>
          ) : (
            <span />
          )}
          {target ? (
            <span className="flex shrink-0 items-center gap-1.5 text-white/56">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-teal-400" : "bg-amber-400"}`}
              />
              {connected ? "Live" : "Подключаемся"}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
