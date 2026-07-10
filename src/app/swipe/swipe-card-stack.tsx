"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Info, Loader2, X } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";
import { ItemCoverImage } from "@/components/menarium/item-cover-image";
import { GlassCard } from "@/components/menarium/card";
import { MenariumLinkButton } from "@/components/menarium/button";
import { SwipeLikeModal } from "./swipe-like-modal";

type SwipeCardData = {
  id: string;
  title: string;
  category: string;
  wanted: string;
  image: string;
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
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);
  const [loading, setLoading] = useState(false);
  const [likeOpen, setLikeOpen] = useState(false);
  const exiting = useRef(false);

  async function passCard() {
    if (loading || exiting.current) return;
    exiting.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/items/swipe/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: card.id }),
      });
      if (!res.ok) throw new Error("pass failed");
      router.refresh();
    } finally {
      setLoading(false);
      exiting.current = false;
    }
  }

  async function animateExit(direction: "left" | "right", then: () => void | Promise<void>) {
    if (exiting.current) return;
    exiting.current = true;
    setLoading(true);
    if (reducedMotion) {
      await then();
      router.refresh();
      exiting.current = false;
      setLoading(false);
      return;
    }
    await animate(x, direction === "left" ? -420 : 420, { duration: 0.28, ease: "easeIn" });
    await then();
    router.refresh();
    exiting.current = false;
    setLoading(false);
  }

  function onDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      if (userItems.length === 0) {
        void animateExit("right", async () => {
          router.push(`/item/${card.id}`);
        });
        return;
      }
      setLikeOpen(true);
      animate(x, 0, { duration: 0.2 });
      exiting.current = false;
      setLoading(false);
      return;
    }
    if (info.offset.x < -SWIPE_THRESHOLD) {
      void animateExit("left", passCard);
      return;
    }
    animate(x, 0, { duration: 0.25, type: "spring", stiffness: 400, damping: 30 });
  }

  useEffect(() => {
    x.set(0);
    exiting.current = false;
  }, [card.id, x]);

  return (
    <>
      <div className="relative flex min-h-[min(640px,78vh)] items-center justify-center">
        <GlassCard className="absolute h-[min(600px,74vh)] w-[min(420px,92vw)] translate-y-8 scale-90 rounded-3xl opacity-40" />
        <GlassCard className="absolute h-[min(600px,74vh)] w-[min(420px,92vw)] translate-y-4 scale-95 rounded-3xl opacity-60" />

        <motion.div
          style={{ x, rotate }}
          drag={loading ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={onDragEnd}
          className="relative z-10 w-full max-w-[450px] touch-none"
        >
          <GlassCard className="relative overflow-hidden rounded-3xl">
            <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-6 top-6 z-20 rounded-2xl border-2 border-teal-400 bg-teal-500/20 px-4 py-2 text-sm font-bold text-teal-300">
              ХОЧУ
            </motion.div>
            <motion.div style={{ opacity: passOpacity }} className="pointer-events-none absolute right-6 top-6 z-20 rounded-2xl border-2 border-red-400 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300">
              МИМО
            </motion.div>
            <div className="relative h-[min(480px,58vh)]">
              <ItemCoverImage src={card.image} alt={card.title} />
              <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-xl">
                <span className="text-xs tracking-wide text-white/90">{card.category}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <div className="px-6 py-5">
              <h2 className="mb-2 text-xl font-semibold tracking-tight">{card.title}</h2>
              <p className="text-sm text-white/55">Хочет: {card.wanted}</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          disabled={loading}
          onClick={() => void animateExit("left", passCard)}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-50"
          aria-label="Пропустить"
        >
          {loading ? <Loader2 className="h-7 w-7 animate-spin text-white/60" /> : <X className="h-8 w-8 text-red-400" />}
        </button>
        <MenariumLinkButton href={`/item/${card.id}`} variant="secondary" className="h-16 w-16 rounded-full p-0" aria-label="Подробнее">
          <Info className="h-7 w-7 text-blue-400" />
        </MenariumLinkButton>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (userItems.length === 0) {
              router.push(`/item/${card.id}`);
              return;
            }
            setLikeOpen(true);
          }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-purple-500 transition hover:scale-105 disabled:opacity-50"
          aria-label="Предложить обмен"
        >
          <Heart className="h-8 w-8 text-white" />
        </button>
      </div>

      <SwipeLikeModal
        open={likeOpen}
        receiverItemId={card.id}
        receiverTitle={card.title}
        userItems={userItems}
        onClose={() => setLikeOpen(false)}
        onSuccess={() => {
          setLikeOpen(false);
          void animateExit("right", async () => {
            await fetch("/api/items/swipe/pass", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: card.id }),
            });
          });
        }}
      />
    </>
  );
}
