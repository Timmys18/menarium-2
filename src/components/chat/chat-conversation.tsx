"use client";

import Image from "next/image";
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCheck,
  ImagePlus,
  Loader2,
  Reply,
  Send,
  X,
} from "lucide-react";
import { useAutoRefresh } from "@/components/hooks/use-auto-refresh";
import { useRealtime, type RealtimeEvent } from "@/components/hooks/use-realtime";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";
import { MenariumTextarea } from "@/components/menarium/input";
import { cn } from "@/lib/utils";

type ChatAttachmentView = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  contentType: string;
};

type ChatReplyView = {
  id: string;
  senderId: string;
  text: string;
};

export type ChatMessageView = {
  id: string;
  senderId: string;
  text: string;
  isRead: boolean;
  readAt: string | null;
  attachments: ChatAttachmentView[];
  replyTo: ChatReplyView | null;
  createdAt: string;
};

type ConversationTarget = {
  endpoint: string;
  entityId: string;
};

type PushState = "checking" | "unsupported" | "unavailable" | "prompt" | "enabled" | "blocked";

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

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : fallback;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function messageSummary(message: ChatMessageView | ChatReplyView) {
  if (message.text) return message.text;
  return "Фотография";
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
  kind,
  fill = false,
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
  kind: "DEAL" | "ITEM";
  /**
   * Растягивает ленту на всю доступную высоту вместо фиксированных 32rem.
   * Нужен на телефоне, где чат занимает экран целиком: при фиксированной
   * высоте поле ввода уезжало за нижний край, и ответить можно было, только
   * прокрутив страницу.
   */
  fill?: boolean;
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
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachmentView[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessageView | null>(null);
  const [previewImage, setPreviewImage] = useState<ChatAttachmentView | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [preferenceReady, setPreferenceReady] = useState(!initialTarget);
  const [isChangingPreference, setIsChangingPreference] = useState(false);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [isChangingPush, setIsChangingPush] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prependHeightRef = useRef<number | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingRetryTimeoutRef = useRef<number | null>(null);
  const partnerTypingTimeoutRef = useRef<number | null>(null);
  const lastTypingSignalRef = useRef(0);
  const messages = mergeMessages(localMessages, initialMessages);
  const nextCursor = historyCursor === undefined ? initialNextCursor : historyCursor;
  const messageLayoutKey = `${messages.length}:${messages[0]?.id ?? ""}:${messages.at(-1)?.id ?? ""}`;
  const lastOwnMessageId = messages.findLast((message) => message.senderId === currentUserId)?.id;

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
      if (text) window.localStorage.setItem(draftStorageKey, text);
      else window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Draft persistence is an enhancement and must not block messaging.
    }
  }, [draftReady, draftStorageKey, text]);

  useEffect(() => {
    if (!target) return;
    let active = true;
    const query = new URLSearchParams({ kind, entityId: target.entityId });
    void fetch(`/api/chat/preferences?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data?: { muted?: boolean } }>;
      })
      .then((body) => {
        if (active) setMuted(Boolean(body.data?.muted));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setPreferenceReady(true);
      });
    return () => {
      active = false;
    };
  }, [kind, target]);

  useEffect(() => {
    let active = true;
    async function inspectPush() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setPushState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setPushState("blocked");
        return;
      }

      const response = await fetch("/api/push/subscriptions", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { configured?: boolean };
      };
      if (!body.data?.configured) {
        if (active) setPushState("unavailable");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (active) setPushState(subscription ? "enabled" : "prompt");
    }
    void inspectPush().catch(() => {
      if (active) setPushState("unsupported");
    });
    return () => {
      active = false;
    };
  }, []);

  const connected = useAutoRefresh(Boolean(target), (event) => {
    return Boolean(
      target &&
        event.entityId === target.entityId &&
        (realtimeTypes.includes(event.type) || event.type === "chat-read"),
    );
  });

  useEffect(() => {
    if (!target) return;
    let active = true;

    const refreshMessages = async () => {
      const response = await fetch(target.endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { items?: ChatMessageView[] };
      if (active && body.items) {
        setLocalMessages((current) => mergeMessages(current, body.items ?? []));
      }
    };

    const interval = window.setInterval(() => {
      void refreshMessages().catch(() => undefined);
    }, 5_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [target]);

  useRealtime(Boolean(target), (event) => {
    if (!target || event.entityId !== target.entityId) return;

    if (
      realtimeTypes.includes(event.type) &&
      event.actorId !== currentUserId &&
      document.visibilityState === "visible"
    ) {
      // An open, visible conversation is the user's reading surface. Mark incoming
      // messages read immediately instead of leaving a misleading unread badge.
      void fetch(target.endpoint, { cache: "no-store" }).catch(() => undefined);
    }

    if (event.type !== "chat-typing" || event.actorId === currentUserId) return;
    if (partnerTypingTimeoutRef.current) window.clearTimeout(partnerTypingTimeoutRef.current);
    setPartnerTyping(event.state === "active");
    if (event.state === "active") {
      partnerTypingTimeoutRef.current = window.setTimeout(() => setPartnerTyping(false), 4_000);
    }
  });

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (typingRetryTimeoutRef.current) window.clearTimeout(typingRetryTimeoutRef.current);
      if (partnerTypingTimeoutRef.current) window.clearTimeout(partnerTypingTimeoutRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (prependHeightRef.current !== null) {
      container.scrollTop += container.scrollHeight - prependHeightRef.current;
      prependHeightRef.current = null;
      return;
    }
    if (shouldStickToBottomRef.current) container.scrollTop = container.scrollHeight;
  }, [messageLayoutKey, partnerTyping]);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, 128)}px`;
  }, [text]);

  async function signalTyping(typing: boolean) {
    if (!target) return;
    await fetch("/api/chat/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, entityId: target.entityId, typing }),
    }).catch(() => undefined);
  }

  function updateText(value: string) {
    setText(value);
    if (!target || !canWrite) return;

    const now = Date.now();
    if (value.trim() && now - lastTypingSignalRef.current > 2_500) {
      lastTypingSignalRef.current = now;
      void signalTyping(true);
      if (typingRetryTimeoutRef.current) window.clearTimeout(typingRetryTimeoutRef.current);
      typingRetryTimeoutRef.current = window.setTimeout(() => void signalTyping(true), 700);
    }
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      if (typingRetryTimeoutRef.current) window.clearTimeout(typingRetryTimeoutRef.current);
      void signalTyping(false);
    }, 1_500);
  }

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

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    if (attachments.length + files.length > 4) {
      setError("К сообщению можно добавить до четырёх фотографий");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("ownerType", "CHAT");
        form.set("file", file);
        const response = await fetch("/api/media", { method: "POST", body: form });
        if (!response.ok) throw new Error(await readApiError(response, "Не удалось загрузить фото"));
        const body = (await response.json()) as { data?: ChatAttachmentView };
        if (!body.data) throw new Error("Сервер не вернул загруженную фотографию");
        setAttachments((current) => [...current, body.data!]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeAttachment(attachment: ChatAttachmentView) {
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    await fetch(`/api/media?id=${encodeURIComponent(attachment.id)}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isSending || isUploading || !canWrite) return;

    setError(null);
    setIsSending(true);
    try {
      const nextTarget = target ?? (await resolveTarget?.());
      if (!nextTarget) throw new Error("Не удалось открыть чат");
      if (!target) setTarget(nextTarget);

      const response = await fetch(nextTarget.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          imageIds: attachments.map((attachment) => attachment.id),
          replyToId: replyingTo?.id,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Не удалось отправить сообщение"));
      }
      const body = (await response.json()) as { data?: ChatMessageView };
      if (!body.data) throw new Error("Сервер не вернул отправленное сообщение");

      shouldStickToBottomRef.current = true;
      setLocalMessages((current) => mergeMessages(current, [body.data!]));
      setText("");
      setAttachments([]);
      setReplyingTo(null);
      void signalTyping(false);
      startTransition(() => router.refresh());
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
    }
  }

  async function toggleMuted() {
    if (!target || isChangingPreference) return;
    setIsChangingPreference(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, entityId: target.entityId, muted: !muted }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Не удалось изменить уведомления"));
      setMuted((current) => !current);
    } catch (preferenceError) {
      setError(
        preferenceError instanceof Error
          ? preferenceError.message
          : "Не удалось изменить уведомления",
      );
    } finally {
      setIsChangingPreference(false);
    }
  }

  async function enablePush() {
    if (isChangingPush || pushState !== "prompt") return;
    setIsChangingPush(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "blocked" : "prompt");
        return;
      }
      const keyResponse = await fetch("/api/push/subscriptions", { cache: "no-store" });
      const keyBody = (await keyResponse.json()) as { data?: { publicKey?: string } };
      const publicKey = keyBody.data?.publicKey;
      if (!publicKey) throw new Error("Браузерные уведомления пока недоступны");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Не удалось включить уведомления"));
      setPushState("enabled");
    } catch (pushError) {
      setError(pushError instanceof Error ? pushError.message : "Не удалось включить уведомления");
    } finally {
      setIsChangingPush(false);
    }
  }

  return (
    <div
      className={cn("min-w-0 max-w-full", fill && "flex h-full flex-col")}
      data-realtime-connected={target ? String(connected) : undefined}
    >
      {target ? (
        <div className="mb-3 flex items-center justify-end gap-1.5">
          {pushState === "prompt" ? (
            <button
              type="button"
              onClick={() => void enablePush()}
              disabled={isChangingPush}
              className="inline-flex min-h-11 items-center gap-2 rounded-xs px-3 text-xs text-text-muted transition hover:bg-fill-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {isChangingPush ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
              Получать вне сайта
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void toggleMuted()}
            disabled={!preferenceReady || isChangingPreference}
            aria-label={muted ? "Включить уведомления этого чата" : "Отключить уведомления этого чата"}
            title={
              pushState === "blocked"
                ? "Уведомления запрещены в настройках браузера"
                : muted
                  ? "Уведомления этого чата отключены"
                  : "Отключить уведомления этого чата"
            }
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              muted
                ? "bg-amber-300/10 text-warning"
                : "text-text-subtle hover:bg-fill-2 hover:text-text-primary",
            )}
          >
            {isChangingPreference ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : muted ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : null}

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
        className={cn(
          "space-y-2 overflow-y-auto overscroll-contain pr-1",
          fill ? "min-h-0 flex-1" : "max-h-[32rem]",
        )}
      >
        {nextCursor ? (
          <div className="flex justify-center pb-2">
            <MenariumButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={loadOlder}
              disabled={isLoadingOlder}
            >
              {isLoadingOlder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ранние сообщения
            </MenariumButton>
          </div>
        ) : null}

        {messages.length > 0 ? (
          messages.map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const showDay =
              index === 0 || dayKey(messages[index - 1]!.createdAt) !== dayKey(message.createdAt);
            return (
              <div key={message.id}>
                {showDay ? (
                  <div className="my-4 flex items-center gap-3" aria-label={formatDay(message.createdAt)}>
                    <span className="h-px flex-1 bg-fill-2" />
                    <span className="text-micro font-medium text-text-subtle">{formatDay(message.createdAt)}</span>
                    <span className="h-px flex-1 bg-fill-2" />
                  </div>
                ) : null}
                <div className={cn("group flex items-end gap-1.5", isOwn ? "justify-end" : "justify-start")}>
                  {isOwn ? (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(message)}
                      aria-label="Ответить на сообщение"
                      className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-transparent transition group-hover:text-text-muted hover:!bg-fill-2 hover:!text-text-strong focus-visible:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] max-sm:text-text-muted"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <article
                    aria-label={isOwn ? "Ваше сообщение" : "Сообщение собеседника"}
                    className={cn(
                      "max-w-[88%] overflow-hidden rounded-md px-3.5 py-2.5 text-sm sm:max-w-[78%]",
                      isOwn
                        ? "rounded-br-[7px] bg-gradient-to-br from-blue-500/28 to-teal-400/18 text-text-strong"
                        : "rounded-bl-[7px] border border-line-hairline bg-fill-2 text-text-strong",
                    )}
                  >
                    {message.replyTo ? (
                      <div className="mb-2 border-l-2 border-teal-300/45 pl-2.5 text-xs text-text-subtle">
                        <span className="block text-micro font-semibold uppercase tracking-[0.08em] text-accent-soft">
                          {message.replyTo.senderId === currentUserId ? "Вы" : "Собеседник"}
                        </span>
                        <span className="mt-0.5 block max-w-[18rem] truncate">
                          {messageSummary(message.replyTo)}
                        </span>
                      </div>
                    ) : null}
                    {message.attachments.length ? (
                      <div className={cn("mb-2 grid gap-1.5", message.attachments.length > 1 && "grid-cols-2")}>
                        {message.attachments.map((attachment) => (
                          <button
                            type="button"
                            key={attachment.id}
                            onClick={() => setPreviewImage(attachment)}
                            className="relative min-h-28 overflow-hidden rounded-xs bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:min-h-36"
                            aria-label="Открыть фото"
                          >
                            <Image
                              src={attachment.url}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 65vw, 320px"
                              className="object-cover transition duration-[var(--duration-slow)] hover:scale-[1.025]"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                    <div className="mt-1.5 flex items-center justify-end gap-1.5 text-micro text-text-subtle">
                      <time dateTime={message.createdAt} suppressHydrationWarning>
                        {formatMessageTime(message.createdAt)}
                      </time>
                      {isOwn && message.id === lastOwnMessageId ? (
                        <span
                          className={cn("inline-flex items-center gap-1", message.isRead && "text-accent")}
                          aria-label={message.isRead ? "Прочитано" : "Отправлено"}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span>{message.isRead ? "Прочитано" : "Отправлено"}</span>
                        </span>
                      ) : null}
                    </div>
                  </article>
                  {!isOwn ? (
                    <button
                      type="button"
                      onClick={() => setReplyingTo(message)}
                      aria-label="Ответить на сообщение"
                      className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-transparent transition group-hover:text-text-muted hover:!bg-fill-2 hover:!text-text-strong focus-visible:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] max-sm:text-text-muted"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-control border border-line-hairline bg-fill-1 p-4 text-sm text-text-muted">
            {emptyMessage}
          </div>
        )}
        {partnerTyping ? (
          <div className="flex justify-start" aria-live="polite">
            <div className="flex items-center gap-1.5 rounded-control rounded-bl-[7px] border border-line-hairline bg-fill-1 px-3.5 py-3">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                  style={{ animationDelay: `${index * 140}ms` }}
                />
              ))}
              <span className="sr-only">Собеседник печатает</span>
            </div>
          </div>
        ) : null}
      </div>

      <form className="mt-4 space-y-2" onSubmit={sendMessage}>
        {replyingTo ? (
          <div className="flex items-center gap-3 rounded-control border border-teal-300/12 bg-teal-300/[0.045] px-3 py-2.5">
            <Reply className="h-4 w-4 shrink-0 text-accent-soft" />
            <div className="min-w-0 flex-1">
              <p className="text-micro font-semibold uppercase tracking-[0.1em] text-accent-soft">
                Ответ
              </p>
              <p className="truncate text-xs text-text-subtle">{messageSummary(replyingTo)}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              aria-label="Отменить ответ"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition hover:bg-fill-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {attachments.length || isUploading ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control border border-line-default bg-fill-1"
              >
                <Image src={attachment.url} alt="" fill sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => void removeAttachment(attachment)}
                  aria-label="Убрать фото"
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/80 text-on-media focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {isUploading ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-control border border-line-hairline bg-fill-1">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 items-end gap-2 rounded-md border border-line-hairline bg-fill-1 p-1.5 focus-within:border-teal-300/25 focus-within:bg-fill-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={uploadImages}
            disabled={!canWrite || isSending || isUploading || attachments.length >= 4}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canWrite || isSending || isUploading || attachments.length >= 4}
            aria-label="Добавить фото"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xs text-text-muted transition hover:bg-fill-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ImagePlus className="h-4.5 w-4.5" />
          </button>
          <MenariumTextarea
            ref={composerRef}
            value={text}
            onChange={(event) => updateText(event.target.value)}
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
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2 text-sm shadow-none focus:ring-0 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-text-muted disabled:placeholder:text-text-muted"
            placeholder={canWrite ? placeholder : disabledPlaceholder}
          />
          <MenariumButton
            type="submit"
            size="sm"
            aria-label="Отправить сообщение"
            className="h-11 w-11 shrink-0 rounded-xs px-0"
            disabled={
              !canWrite ||
              isSending ||
              isUploading ||
              (!text.trim() && attachments.length === 0)
            }
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </MenariumButton>
        </div>
        <div className="flex min-h-5 items-center justify-between gap-3 text-xs">
          {error ? (
            <p role="alert" className="text-danger">{error}</p>
          ) : text.trim() ? (
            <span className="text-text-subtle">Черновик сохранён</span>
          ) : (
            <span />
          )}
          {/*
            Состояние разрешений браузера — не постоянная подпись к полю ввода.
            Показываем только то, что влияет на отправку прямо сейчас;
            «уведомления запрещены» уходит в подсказку кнопки колокольчика,
            где пользователь и будет их искать.
          */}
          {target && !connected ? (
            <span className="shrink-0 text-warning-soft">Восстанавливаем связь…</span>
          ) : null}
        </div>
      </form>

      <MenariumDialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Фотография"
      >
        {previewImage ? (
          <div className="relative max-h-[72vh] min-h-64 w-full overflow-hidden rounded-md bg-black/35">
            <Image
              src={previewImage.url}
              alt="Фотография из переписки"
              width={previewImage.width ?? 1200}
              height={previewImage.height ?? 900}
              sizes="(max-width: 640px) 92vw, 640px"
              className="max-h-[72vh] h-auto w-full object-contain"
            />
          </div>
        ) : null}
      </MenariumDialog>
    </div>
  );
}
