"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RealtimeEvent = {
  type:
    | "notification"
    | "swap"
    | "deal-message"
    | "item-message"
    | "counts"
    | "chat-read"
    | "chat-typing";
  entityId?: string;
  actorId?: string;
  state?: "active" | "idle";
  occurredAt: string;
};

type RealtimeContextValue = {
  connected: boolean;
  subscribe: (listener: (event: RealtimeEvent) => void) => () => void;
};

const listeners = new Set<(event: RealtimeEvent) => void>();

function broadcast(event: RealtimeEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // A listener must not break the shared realtime bus.
    }
  });
}

function subscribe(listener: (event: RealtimeEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  subscribe,
});

export function RealtimeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/realtime");
    const onReady = () => setConnected(true);
    const onMessage = (message: MessageEvent<string>) => {
      try {
        broadcast(JSON.parse(message.data) as RealtimeEvent);
      } catch {
        // A malformed event must not terminate the live connection.
      }
    };

    source.addEventListener("ready", onReady);
    source.addEventListener("update", onMessage as EventListener);
    source.onerror = () => setConnected(false);

    return () => {
      source.removeEventListener("ready", onReady);
      source.removeEventListener("update", onMessage as EventListener);
      source.close();
      setConnected(false);
    };
  }, [enabled]);

  const value = useMemo<RealtimeContextValue>(
    () => ({ connected: enabled && connected, subscribe }),
    [connected, enabled],
  );

  return createElement(RealtimeContext.Provider, { value }, children);
}

export function useRealtime(
  enabled: boolean,
  onUpdate: (event: RealtimeEvent) => void,
) {
  const realtime = useContext(RealtimeContext);
  const handleUpdate = useEffectEvent(onUpdate);

  useEffect(() => {
    if (!enabled) return;
    return realtime.subscribe(handleUpdate);
  }, [enabled, realtime]);

  return enabled && realtime.connected;
}
