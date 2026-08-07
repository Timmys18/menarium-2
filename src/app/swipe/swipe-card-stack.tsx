"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Heart,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
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
  cards,
  userItems,
}: {
  cards: SwipeCardData[];
  userItems: UserItem[];
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const likeOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [likeOpen, setLikeOpen] = useState(false);
  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [lastPassed, setLastPassed] = useState<{
    card: SwipeCardData;
    index: number;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exiting = useRef(false);
  const card = cards[currentIndex];

  async function recordPass(itemId: string) {
    const response = await fetch("/api/items/swipe/pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error ?? "Не удалось пропустить карточку");
  }

  async function passCard() {
    if (!card || exiting.current) return;
    exiting.current = true;
    setLoading(true);
    setError(null);

    try {
      if (!reducedMotion) {
        await animate(x, -420, { duration: 0.28, ease: "easeIn" });
      }
      await recordPass(card.id);
      setLastPassed({ card, index: currentIndex });
      setCurrentIndex((index) => index + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Не удалось пропустить карточку");
      await animate(x, 0, { duration: 0.2, type: "spring", stiffness: 400, damping: 30 });
    } finally {
      exiting.current = false;
      setLoading(false);
    }
  }

  async function undoLastPass() {
    if (!lastPassed || undoing) return;
    setUndoing(true);
    setError(null);
    try {
      const response = await fetch("/api/items/swipe/pass", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: lastPassed.card.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось вернуть карточку");
      setCurrentIndex(lastPassed.index);
      setLastPassed(null);
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "Не удалось вернуть карточку");
    } finally {
      setUndoing(false);
    }
  }

  function openExchangeFlow() {
    if (!card) return;
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
  }, [card?.id, x]);

  useEffect(() => {
    if (!lastPassed) return;
    const timeout = window.setTimeout(() => {
      setLastPassed(null);
      if (currentIndex >= cards.length) router.refresh();
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [cards.length, currentIndex, lastPassed, router]);

  const undoNotice = lastPassed ? (
    <div
      role="status"
      className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[18px] border border-teal-300/20 bg-[#0b1518]/95 px-4 py-3 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl md:static md:mt-4"
    >
      <span className="min-w-0 truncate text-white/72">«{lastPassed.card.title}» пропущено</span>
      <button
        type="button"
        onClick={() => void undoLastPass()}
        disabled={undoing}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 font-semibold text-teal-200 transition hover:bg-teal-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/70 disabled:opacity-50"
      >
        {undoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        Вернуть
      </button>
    </div>
  ) : null;

  if (!card) {
    return (
      <>
        <GlassCard className="mx-auto flex min-h-[420px] max-w-[460px] flex-col items-center justify-center border border-white/8 p-8 text-center md:min-h-[510px]">
          <Loader2 className="mb-4 h-7 w-7 animate-spin text-teal-200" />
          <h2 className="text-xl font-semibold">Ищем новые варианты</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-white/62">
            Очередь просмотрена. Через несколько секунд проверим свежие объявления.
          </p>
        </GlassCard>
        {undoNotice}
      </>
    );
  }

  const createHref = `/new?returnTo=${encodeURIComponent(`/item/${card.id}`)}`;

  return (
    <>
      <div className="relative flex min-h-[420px] items-center justify-center md:min-h-[510px]">
        <GlassCard className="absolute h-[400px] w-[min(430px,91vw)] translate-y-5 scale-[0.91] border border-white/5 opacity-35 md:h-[490px] md:translate-y-7" />
        <GlassCard className="absolute h-[400px] w-[min(430px,91vw)] translate-y-2.5 scale-[0.96] border border-white/7 opacity-55 md:h-[490px] md:translate-y-3" />

        <motion.div
          style={{ x, rotate }}
          drag={loading || undoing ? false : "x"}
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

            <div className="relative h-[238px] sm:h-[280px] md:h-[320px]">
              <ItemCoverImage
                src={card.image}
                alt={card.title}
                priority
                sizes="(max-width: 520px) 94vw, 460px"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3.5 md:p-4">
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

            <div className="px-4 pb-4 pt-3.5 sm:px-5 md:px-6 md:pb-5 md:pt-4">
              <h2 className="line-clamp-1 text-xl font-bold tracking-tight sm:text-2xl">{card.title}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/62 md:mt-2">
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {card.ownerName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {card.city}
                </span>
              </div>
              <div className="mt-3 rounded-[15px] border border-teal-300/15 bg-teal-300/[0.055] px-3.5 py-2.5 md:mt-4 md:rounded-[16px] md:px-4 md:py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/72">Интересно взамен</p>
                <p className="mt-0.5 line-clamp-1 text-sm leading-5 text-white/82 md:mt-1 md:line-clamp-2">{card.wanted}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {undoNotice}

      <div className="mobile-action-dock fixed inset-x-3 z-40 mx-auto grid max-w-[460px] grid-cols-3 gap-2 rounded-[22px] border border-white/12 bg-[#090e16]/94 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:static md:mt-6 md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
        <button
          type="button"
          disabled={loading || undoing}
          onClick={() => void passCard()}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[16px] border border-red-300/18 bg-red-300/[0.055] px-2 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-300/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 disabled:opacity-50 md:min-h-16 md:rounded-[18px] md:py-3"
          aria-label="Пропустить"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          <span>Пропустить</span>
        </button>
        <MenariumLinkButton
          href={`/item/${card.id}`}
          variant="secondary"
          className="min-h-14 flex-col gap-1 rounded-[16px] px-2 py-2 text-xs md:min-h-16 md:rounded-[18px] md:py-3"
          aria-label="Подробнее"
        >
          <Info className="h-5 w-5 text-blue-200" />
          Подробнее
        </MenariumLinkButton>
        <button
          type="button"
          disabled={loading || undoing}
          onClick={openExchangeFlow}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[16px] border border-teal-200/24 bg-gradient-to-br from-blue-500 to-teal-400 px-2 py-2 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(56,189,180,0.24)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/80 disabled:opacity-50 md:min-h-16 md:rounded-[18px] md:py-3"
          aria-label="Предложить обмен"
        >
          <Heart className="h-5 w-5" />
          <span>Обменять</span>
        </button>
      </div>

      <p className="mx-auto mt-3 hidden max-w-[460px] text-center text-xs text-white/62 md:block">
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
        receiverWanted={card.wanted}
        userItems={userItems}
        onClose={() => setLikeOpen(false)}
        onSuccess={(swapId) => {
          setLikeOpen(false);
          router.push(`/exchange?tab=outgoing&swap=${encodeURIComponent(swapId)}&notice=sent`);
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
