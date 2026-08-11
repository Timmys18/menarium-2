"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, Star } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";
import { MenariumDialog } from "@/components/menarium/dialog";
import { MenariumTextarea } from "@/components/menarium/input";
import { cn } from "@/lib/utils";

type ReviewView = {
  id: string;
  rating: number;
  comment: string | null;
  visibleAt: string;
  createdAt: string;
  isVisible: boolean;
};

const ratingLabels = ["", "Неудачно", "Есть проблемы", "Нормально", "Хорошо", "Отлично"];

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "h-4 w-4",
            index < rating ? "fill-amber-300 text-amber-300" : "text-white/18",
          )}
        />
      ))}
    </span>
  );
}

export function ExchangeReviewPanel({
  swapId,
  partnerName,
  initialReview,
  receivedReview,
}: {
  swapId: string;
  partnerName: string;
  initialReview: ReviewView | null;
  receivedReview: ReviewView | null;
}) {
  const [review, setReview] = useState(initialReview);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview() {
    if (!rating || pending) return;
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/exchange/${swapId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: ReviewView;
        error?: string;
      };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Не удалось сохранить отзыв");
      }
      setReview(body.data);
      setConfirmOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить отзыв");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-5 space-y-4 rounded-[18px] border border-amber-300/14 bg-amber-300/[0.045] p-4" aria-labelledby="exchange-review-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-amber-300/10 text-amber-200">
          <Star className="h-5 w-5" />
        </span>
        <div>
          <h3 id="exchange-review-title" className="text-sm font-semibold text-white/90">
            Подтверждённый отзыв
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/62">
            Оценку могут оставить только участники завершённого обмена.
          </p>
        </div>
      </div>

      {review ? (
        <div className="rounded-[15px] border border-white/8 bg-white/[0.025] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <Stars rating={review.rating} label={`Ваша оценка: ${review.rating} из 5`} />
            <span className="text-xs text-white/62">{ratingLabels[review.rating]}</span>
          </div>
          {review.comment ? <p className="mt-3 text-sm leading-6 text-white/64">{review.comment}</p> : null}
          <div className="mt-3 flex items-start gap-2 border-t border-white/7 pt-3 text-xs leading-5 text-white/62">
            {review.isVisible ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />
            ) : (
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/70" />
            )}
            {review.isVisible
              ? "Отзыв опубликован в профиле партнёра."
              : `Отзыв откроется после ответа партнёра или ${new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(review.visibleAt))}.`}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-white/78">Как прошёл обмен с {partnerName}?</p>
          <div className="mt-3 flex gap-1.5" role="group" aria-label="Оценка обмена">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} из 5 — ${ratingLabels[value]}`}
                  aria-pressed={rating === value}
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.035] transition hover:border-amber-200/28 hover:bg-amber-200/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60"
                >
                  <Star className={cn("h-5 w-5", value <= rating ? "fill-amber-300 text-amber-300" : "text-white/24")} />
                </button>
              );
            })}
          </div>
          <p className="mt-2 min-h-5 text-xs text-amber-100/55">
            {rating ? ratingLabels[rating] : "Выберите оценку"}
          </p>
          <label htmlFor="exchange-review-comment" className="mt-3 block text-xs font-medium text-white/62">
            Комментарий <span className="text-white/62">необязательно</span>
          </label>
          <MenariumTextarea
            id="exchange-review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={600}
            placeholder="Что было особенно хорошо или что стоит улучшить?"
            className="mt-2 min-h-24"
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/62">
            <span>Партнёр не увидит отзыв до своей оценки.</span>
            <span>{comment.length}/600</span>
          </div>
          <MenariumButton
            type="button"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={!rating || pending}
          >
            <Star className="h-4 w-4" />
            Проверить и отправить
          </MenariumButton>
        </div>
      )}

      <MenariumDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Проверить отзыв"
        description="После отправки оценку и текст нельзя изменить. Партнёр не увидит их до своей оценки или окончания слепого периода."
        footer={
          <>
            <MenariumButton
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Вернуться
            </MenariumButton>
            <MenariumButton onClick={() => void submitReview()} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              Отправить отзыв
            </MenariumButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[16px] border border-amber-300/12 bg-amber-300/[0.045] p-4">
            <div className="flex items-center justify-between gap-3">
              <Stars rating={rating} label={`Ваша оценка: ${rating} из 5`} />
              <span className="text-sm font-medium text-amber-100/70">
                {ratingLabels[rating]}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/62">
              {comment.trim() || "Без дополнительного комментария."}
            </p>
          </div>
          <p className="flex items-start gap-2 text-xs leading-5 text-white/62">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/65" />
            Слепая публикация не позволяет второй стороне подстроить свою оценку под вашу.
          </p>
        </div>
      </MenariumDialog>

      {receivedReview ? (
        <div className="rounded-[15px] border border-teal-300/12 bg-teal-300/[0.04] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-teal-100/70">Отзыв партнёра о вас</p>
            <Stars rating={receivedReview.rating} label={`Оценка партнёра: ${receivedReview.rating} из 5`} />
          </div>
          {receivedReview.comment ? (
            <p className="mt-3 text-sm leading-6 text-white/62">{receivedReview.comment}</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
