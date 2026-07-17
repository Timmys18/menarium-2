"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Heart,
  Info,
  Loader2,
  MapPin,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumDialog } from "@/components/menarium/dialog";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { SwipeLikeModal } from "./swipe-like-modal";

type SwipeCardData = {
  id: string;
  title: string;
  category: string;
  wanted: string;
  image: string;
  city: string;
  ownerName: string;
  isOnline: boolean;
};

type UserItem = { id: string; title: string };

const SWIPE_THRESHOLD = 120;

export function SwipeCardStack({
  card,
  userItems,
}: {
  card: SwipeCardData;
  userItems: UserItem[];
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const likeOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const [loading, setLoading] = useState(false);
  const [likeOpen, setLikeOpen] = useState(false);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exiting = useRef(false);

  async function recordPass() {
    const response = await fetch("/api/items/swipe/pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: card.id }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error ?? "Не удалось пропустить карточку");
  }

  async function passCard() {
    if (exiting.current) return;
    exiting.current = true;
    setLoading(true);
    setError(null);

    try {
      if (!reducedMotion) {
        await animate(x, -420, { duration: 0.28, ease: "easeIn" });
      }
      await recordPass();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось пропустить карточку");
      await animate(x, 0, { duration: 0.2, type: "spring", stiffness: 400, damping: 30 });
    } finally {
      exiting.current = false;
      setLoading(false);
    }
  }

  function openExchangeFlow() {
    setError(null);
    void animate(x, 0, { duration: 0.2, type: "spring", stiffness: 400, damping: 30 });
    if (userItems.length === 0) {
      setCreatePromptOpen(true);
      return;
    }
    setLikeOpen(true);
  }

  function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      openExchangeFlow();
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      void passCard();
      return;
    }
    void animate(x, 0, { duration: 0.25, type: "spring", stiffness: 400, damping: 30 });
  }

  useEffect(() => {
    x.set(0);
    exiting.current = false;
  }, [card.id, x]);

  const createHref = `/new?returnTo=${encodeURIComponent(`/item/${card.id}`)}`;

  return (
    <>
      <div className="relative flex min-h-[min(610px,70vh)] items-center justify-center">
        <GlassCard className="absolute h-[min(570px,66vh)] w-[min(430px,91vw)] translate-y-7 scale-[0.91] border border-white/5 opacity-35" />
        <GlassCard className="absolute h-[min(570px,66vh)] w-[min(430px,91vw)] translate-y-3 scale-[0.96] border border-white/7 opacity-55" />

        <motion.div
          style={{ x, rotate }}
          drag={loading ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.85}
          onDragEnd={onDragEnd}
          className="relative z-10 w-full max-w-[460px] touch-pan-y"
        >
          <GlassCard className="relative overflow-hidden border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,0.36)]">
            <motion.div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute left-5 top-5 z-20 rotate-[-5deg] rounded-[14px] border-2 border-teal-300 bg-[#07110f]/80 px-4 py-2 text-sm font-bold tracking-[0.16em] text-teal-200 backdrop-blur-xl"
            >
              ОБМЕН
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="pointer-events-none absolute right-5 top-5 z-20 rotate-[5deg] rounded-[14px] border-2 border-red-300 bg-[#16090b]/80 px-4 py-2 text-sm font-bold tracking-[0.16em] text-red-200 backdrop-blur-xl"
            >
              МИМО
            </motion.div>

            <div className="relative h-[min(400px,47vh)] min-h-72">
              <ItemCoverImage
                src={card.image}
                alt={card.title}
                priority
                sizes="(max-width: 520px) 94vw, 460px"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <span className="rounded-full border border-white/12 bg-black/50 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xl">
                  {card.category}
                </span>
                {card.isOnline ? (
                  <span className="flex items-center gap-1.5 rounded-full border border-teal-300/20 bg-[#07110f]/70 px-3 py-1.5 text-xs font-medium text-teal-100 backdrop-blur-xl">
                    <Wifi className="h-3.5 w-3.5" />
                    Онлайн
                  </span>
                ) : null}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0b1019] to-transparent" />
            </div>

            <div className="px-5 pb-5 pt-4 sm:px-6">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{card.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/42">
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {card.ownerName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {card.city}
                </span>
              </div>
              <div className="mt-4 rounded-[16px] border border-teal-300/15 bg-teal-300/[0.055] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-200/60">Интересно взамен</p>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/75">{card.wanted}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="mx-auto mt-6 grid max-w-[460px] grid-cols-3 gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void passCard()}
          className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[18px] border border-red-300/15 bg-red-300/[0.045] px-2 py-3 text-xs font-semibold text-red-200 transition hover:bg-red-300/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 disabled:opacity-50"
          aria-label="Пропустить"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          <span>Пропустить</span>
        </button>
        <MenariumLinkButton
          href={`/item/${card.id}`}
          variant="secondary"
          className="min-h-16 flex-col gap-1 rounded-[18px] px-2 py-3 text-xs"
          aria-label="Подробнее"
        >
          <Info className="h-5 w-5 text-blue-200" />
          Подробнее
        </MenariumLinkButton>
        <button
          type="button"
          disabled={loading}
          onClick={openExchangeFlow}
          className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[18px] border border-teal-200/20 bg-gradient-to-br from-blue-500 to-teal-400 px-2 py-3 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(56,189,180,0.2)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/80 disabled:opacity-50"
          aria-label="Предложить обмен"
        >
          <Heart className="h-5 w-5" />
          <span>Обменять</span>
        </button>
      </div>

      <p className="mx-auto mt-3 max-w-[460px] text-center text-xs text-white/30">
        Можно тянуть карточку влево или вправо
      </p>

      {error ? (
        <p role="alert" className="mx-auto mt-4 max-w-md text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <SwipeLikeModal
        open={likeOpen}
        receiverItemId={card.id}
        receiverTitle={card.title}
        userItems={userItems}
        onClose={() => setLikeOpen(false)}
        onSuccess={(swapId) => {
          setLikeOpen(false);
          router.push(`/exchange?tab=outgoing&swap=${encodeURIComponent(swapId)}`);
          router.refresh();
        }}
      />

      <MenariumDialog
        open={createPromptOpen}
        onClose={() => setCreatePromptOpen(false)}
        title="Сначала добавим твоё предложение"
        description={`Чтобы предложить обмен на «${card.title}», нужно показать, что ты отдаёшь. После публикации мы вернём тебя к этой карточке.`}
        footer={
          <>
            <MenariumButton variant="secondary" onClick={() => setCreatePromptOpen(false)}>
              Не сейчас
            </MenariumButton>
            <MenariumLinkButton href={createHref}>
              Создать и вернуться
              <ArrowRight className="h-4 w-4" />
            </MenariumLinkButton>
          </>
        }
      />
    </>
  );
}
