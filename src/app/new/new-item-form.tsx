"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput, MenariumTextarea } from "@/components/menarium/input";
import { cn } from "@/lib/utils";
import { trackClientProductEvent } from "@/lib/product-analytics-client";

type UploadedImage = {
  id: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

type NewItemDraft = {
  title: string;
  type: "THING" | "SERVICE";
  category: string;
  description: string;
  city: string;
  desiredText: string;
  acceptsAnything: boolean;
  extraOfferText: string;
  isOnline: boolean;
  images: UploadedImage[];
};

type NewItemFormProps = {
  userId: string;
  returnTo: string | null;
  continuationTitle: string | null;
};

const DRAFT_KEY_PREFIX = "menarium:new-item-draft:v2";
const categories = ["Техника", "Мода", "Музыка", "Спорт", "Книги", "Искусство", "Фото", "Услуги"];
const quickWants = ["iPhone", "MacBook", "Игровая консоль", "Наушники", "Кроссовки", "Винтажная камера"];
const steps = [
  { title: "Предложение", hint: "Что и как выглядит" },
  { title: "Подробности", hint: "Состояние и формат" },
  { title: "Обмен", hint: "Что хочется взамен" },
];

function readDraft(key: string): Partial<NewItemDraft> | null {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Partial<NewItemDraft>) : null;
  } catch {
    return null;
  }
}

export function NewItemForm({ userId, returnTo, continuationTitle }: NewItemFormProps) {
  const router = useRouter();
  const draftKey = `${DRAFT_KEY_PREFIX}:${userId}`;
  const hasTrackedStart = useRef(false);
  const [step, setStep] = useState(0);
  const [draftReady, setDraftReady] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"THING" | "SERVICE">("THING");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Москва");
  const [desiredText, setDesiredText] = useState("");
  const [acceptsAnything, setAcceptsAnything] = useState(false);
  const [extraOfferText, setExtraOfferText] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desired = desiredText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  useEffect(() => {
    const restoreDraft = window.setTimeout(() => {
      const draft = readDraft(draftKey);
      if (typeof draft?.title === "string") setTitle(draft.title);
      if (draft?.type === "THING" || draft?.type === "SERVICE") setType(draft.type);
      if (typeof draft?.category === "string" && categories.includes(draft.category)) setCategory(draft.category);
      if (typeof draft?.description === "string") setDescription(draft.description);
      if (typeof draft?.city === "string") setCity(draft.city);
      if (typeof draft?.desiredText === "string") setDesiredText(draft.desiredText);
      if (typeof draft?.acceptsAnything === "boolean") setAcceptsAnything(draft.acceptsAnything);
      if (typeof draft?.extraOfferText === "string") setExtraOfferText(draft.extraOfferText);
      if (typeof draft?.isOnline === "boolean") setIsOnline(draft.isOnline);
      if (Array.isArray(draft?.images)) {
        setImages(
          draft.images
            .filter(
              (image): image is UploadedImage =>
                Boolean(
                  image &&
                    typeof image.id === "string" &&
                    typeof image.url === "string" &&
                    typeof image.contentType === "string" &&
                    typeof image.sizeBytes === "number",
                ),
            )
            .slice(0, 8),
        );
      }
      setDraftReady(true);
    }, 0);

    return () => window.clearTimeout(restoreDraft);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady) return;

    const draft: NewItemDraft = {
      title,
      type,
      category,
      description,
      city,
      desiredText,
      acceptsAnything,
      extraOfferText,
      isOnline,
      images,
    };

    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // A private browsing mode can reject storage; form submission still works.
    }
  }, [
    acceptsAnything,
    category,
    city,
    description,
    desiredText,
    draftReady,
    extraOfferText,
    images,
    isOnline,
    draftKey,
    title,
    type,
  ]);

  function validateStep(stepToValidate: number) {
    if (stepToValidate === 0) {
      if (title.trim().length < 2) {
        setError("Добавь понятное название длиной хотя бы в два символа.");
        return false;
      }
      if (category.trim().length < 2) {
        setError("Выбери категорию объявления.");
        return false;
      }
    }

    if (stepToValidate === 1) {
      if (description.trim().length < 10) {
        setError("Расскажи о предложении чуть подробнее — минимум 10 символов.");
        return false;
      }
      if (city.trim().length < 2) {
        setError("Укажи город, чтобы людям было проще оценить обмен.");
        return false;
      }
    }

    if (stepToValidate === 2 && desired.length === 0 && !acceptsAnything) {
      setError("Напиши, что интересно получить, или отметь, что открыт к любым предложениям.");
      return false;
    }
    if (stepToValidate === 2 && desired.length > 12) {
      setError("Оставь не больше 12 вариантов для обмена.");
      return false;
    }
    if (stepToValidate === 2 && desired.some((item) => item.length > 80)) {
      setError("Сократи каждый вариант до 80 символов.");
      return false;
    }

    setError(null);
    return true;
  }

  function goToNextStep() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goToPreviousStep() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function addQuickWant(want: string) {
    const current = desiredText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (current.includes(want) || current.length >= 12) return;
    setDesiredText([...current, want].join(", "));
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setError(null);
    setIsUploading(true);
    try {
      for (const file of files.slice(0, 8 - images.length)) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`Файл «${file.name}» больше 8 МБ`);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("ownerType", "ITEM");
        const response = await fetch("/api/media", { method: "POST", body: formData });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Не удалось загрузить фото");
        setImages((current) =>
          current.some((image) => image.id === body.data.id)
            ? current
            : [...current, body.data].slice(0, 8),
        );
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeImage(image: UploadedImage) {
    setError(null);
    setRemovingImageId(image.id);
    try {
      const response = await fetch(`/api/media?id=${encodeURIComponent(image.id)}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось удалить фото");
      setImages((current) => current.filter((entry) => entry.id !== image.id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Не удалось удалить фото");
    } finally {
      setRemovingImageId(null);
    }
  }

  async function submit() {
    for (let targetStep = 0; targetStep < steps.length; targetStep += 1) {
      if (!validateStep(targetStep)) {
        setStep(targetStep);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          category,
          description,
          city,
          isOnline,
          desired,
          acceptsAnything,
          extraOfferText,
          images,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось создать объявление");
      window.localStorage.removeItem(draftKey);
      router.push(returnTo ?? `/item/${body.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать объявление");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      onFocusCapture={() => {
        if (hasTrackedStart.current) return;
        hasTrackedStart.current = true;
        void trackClientProductEvent({ name: "item_creation_started", path: "/new" });
      }}
    >
      <div className="space-y-5">
        {continuationTitle ? (
          <div className="flex items-start gap-3 rounded-[20px] border border-teal-300/20 bg-teal-300/[0.07] px-4 py-3.5 text-sm text-white/75">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
            <p>
              После публикации вернёмся к «<span className="font-semibold text-white">{continuationTitle}</span>»,
              чтобы сразу предложить обмен.
            </p>
          </div>
        ) : null}

        <ol className="grid grid-cols-3 gap-2" aria-label="Шаги создания объявления">
          {steps.map((entry, index) => {
            const isCurrent = index === step;
            const isComplete = index < step;
            return (
              <li
                key={entry.title}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "rounded-[18px] border px-3 py-3 transition sm:px-4",
                  isCurrent && "border-blue-300/35 bg-blue-400/[0.1]",
                  isComplete && "border-teal-300/25 bg-teal-300/[0.06]",
                  !isCurrent && !isComplete && "border-white/8 bg-white/[0.025]",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isCurrent && "bg-blue-400 text-white",
                      isComplete && "bg-teal-300 text-[#07110f]",
                      !isCurrent && !isComplete && "bg-white/8 text-white/45",
                    )}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className={cn("text-xs font-semibold sm:text-sm", isCurrent ? "text-white" : "text-white/55")}>
                    {entry.title}
                  </span>
                </div>
                <p className="hidden pl-8 text-xs text-white/38 sm:block">{entry.hint}</p>
              </li>
            );
          })}
        </ol>

        <GlassCard className="overflow-hidden border border-white/8 p-5 sm:p-7">
          {step === 0 ? (
            <section className="space-y-6" aria-labelledby="new-item-step-one">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">Шаг 1 из 3</p>
                <h2 id="new-item-step-one" className="text-2xl font-bold sm:text-3xl">Покажи, что предлагаешь</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Название и хорошее первое фото помогают получить больше осмысленных предложений.</p>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-white/70">Что это?</legend>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ["THING", "Вещь", "Техника, одежда, коллекции"],
                    ["SERVICE", "Услуга", "Навык, помощь, консультация"],
                  ] as const).map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={type === value}
                      onClick={() => setType(value)}
                      className={cn(
                        "rounded-[18px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70",
                        type === value
                          ? "border-blue-300/45 bg-blue-400/[0.12]"
                          : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="block font-semibold text-white">{label}</span>
                      <span className="mt-1 hidden text-xs text-white/40 sm:block">{hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/70">Название</span>
                  <MenariumInput
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Например, Sony WH-1000XM5"
                    maxLength={120}
                    autoComplete="off"
                  />
                  <span className="block text-right text-xs text-white/30">{title.length}/120</span>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-white/70">Категория</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50"
                  >
                    {categories.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <input
                  id="item-images"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  disabled={isUploading || images.length >= 8}
                  className="sr-only"
                  onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    event.currentTarget.value = "";
                    void uploadFiles(files);
                  }}
                />
                <label
                  htmlFor="item-images"
                  className={cn(
                    "block cursor-pointer rounded-[22px] border border-dashed border-white/15 bg-white/[0.025] p-6 text-center transition hover:border-blue-300/35 hover:bg-blue-400/[0.04]",
                    (isUploading || images.length >= 8) && "pointer-events-none opacity-60",
                  )}
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-teal-400/20">
                    {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-200" /> : <Upload className="h-6 w-6 text-teal-200" />}
                  </div>
                  <span className="block font-semibold text-white">
                    {images.length ? "Добавить ещё фото" : "Добавить фотографии"}
                  </span>
                  <span className="mt-1 block text-xs text-white/40">До 8 изображений, каждое до 8 МБ</span>
                </label>

                {images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {images.map((image, index) => (
                      <div key={image.id} className="relative h-28 overflow-hidden rounded-[16px] border border-white/10 bg-white/5">
                        <Image
                          src={image.url}
                          alt={`Фото объявления ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 45vw, 160px"
                          className="object-cover"
                        />
                        {index === 0 ? (
                          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white/80">
                            Обложка
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Удалить фото ${index + 1}`}
                          onClick={() => void removeImage(image)}
                          disabled={removingImageId === image.id || isSubmitting}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-black/70 text-red-100 backdrop-blur-xl transition hover:bg-red-500/70 disabled:opacity-50"
                        >
                          {removingImageId === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6" aria-labelledby="new-item-step-two">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">Шаг 2 из 3</p>
                <h2 id="new-item-step-two" className="text-2xl font-bold sm:text-3xl">Расскажи честно и по делу</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Состояние, комплектация и нюансы заранее снимают лишние вопросы.</p>
              </div>

              <label className="block space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-white/70">Описание</span>
                  <span className="text-xs text-white/30">{description.length}/4000</span>
                </div>
                <MenariumTextarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={type === "THING"
                    ? "Состояние, комплектация, история использования и любые важные нюансы…"
                    : "Что входит в услугу, сколько времени займёт и какой результат получит человек…"}
                  maxLength={4000}
                  className="min-h-44"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/70">Город</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <MenariumInput
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Москва"
                    maxLength={80}
                    autoComplete="address-level2"
                    className="pl-11"
                  />
                </div>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-[20px] border p-4 transition",
                  isOnline ? "border-teal-300/30 bg-teal-300/[0.07]" : "border-white/10 bg-white/[0.03]",
                )}
              >
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(event) => setIsOnline(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-teal-400"
                />
                <span>
                  <span className="block font-semibold text-white">Можно обменяться онлайн</span>
                  <span className="mt-1 block text-sm leading-5 text-white/45">
                    Подходит для цифровых товаров и удалённых услуг.
                  </span>
                </span>
              </label>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6" aria-labelledby="new-item-step-three">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/70">Шаг 3 из 3</p>
                <h2 id="new-item-step-three" className="text-2xl font-bold sm:text-3xl">Что будет хорошим обменом?</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Дай людям ориентир, но оставь пространство для неожиданно классных предложений.</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/70">Что интересно получить</span>
                <MenariumInput
                  value={desiredText}
                  onChange={(event) => setDesiredText(event.target.value)}
                  placeholder="Через запятую: фотоаппарат, наушники, часы"
                />
                <span className="block text-xs text-white/35">До 12 вариантов, каждый — не длиннее 80 символов.</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {quickWants.map((want) => {
                  const selected = desired.includes(want);
                  return (
                    <button
                      key={want}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => addQuickWant(want)}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
                    >
                      <Badge variant={selected ? "teal" : "purple"} className="px-3 py-1.5 text-xs">
                        {selected ? <Check className="h-3 w-3" /> : null}
                        {want}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-[20px] border p-4 transition",
                  acceptsAnything ? "border-teal-300/30 bg-teal-300/[0.07]" : "border-white/10 bg-white/[0.03]",
                )}
              >
                <input
                  type="checkbox"
                  checked={acceptsAnything}
                  onChange={(event) => setAcceptsAnything(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-teal-400"
                />
                <span>
                  <span className="block font-semibold text-white">Открыт к любым предложениям</span>
                  <span className="mt-1 block text-sm leading-5 text-white/45">
                    Отметь, если готов рассмотреть идеи вне списка выше.
                  </span>
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/70">Дополнительные условия <span className="font-normal text-white/35">· необязательно</span></span>
                <MenariumTextarea
                  value={extraOfferText}
                  onChange={(event) => setExtraOfferText(event.target.value)}
                  placeholder="Например: могу доплатить, предпочитаю встречу в центре или готов рассмотреть похожие варианты."
                  maxLength={1000}
                  className="min-h-28"
                />
              </label>

              <div className="rounded-[20px] border border-teal-300/20 bg-gradient-to-br from-teal-300/[0.08] to-blue-400/[0.05] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
                  <div>
                    <p className="font-semibold text-white">Всё готово к публикации</p>
                    <p className="mt-1 text-sm leading-5 text-white/48">
                      Объявление сразу появится в каталоге. Его можно будет изменить или снять с публикации в профиле.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {error ? (
            <div role="alert" className="mt-6 rounded-[18px] border border-red-400/25 bg-red-400/[0.08] p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
            {step > 0 ? (
              <MenariumButton type="button" variant="secondary" onClick={goToPreviousStep} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </MenariumButton>
            ) : (
              <span className="text-xs text-white/30">Черновик сохраняется автоматически</span>
            )}

            {step < steps.length - 1 ? (
              <MenariumButton type="button" onClick={goToNextStep} disabled={isUploading}>
                Продолжить
                <ArrowRight className="h-4 w-4" />
              </MenariumButton>
            ) : (
              <MenariumButton type="button" onClick={() => void submit()} disabled={isSubmitting || isUploading}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                {returnTo ? "Создать и продолжить обмен" : "Создать объявление"}
              </MenariumButton>
            )}
          </div>
        </GlassCard>
      </div>

      <aside className="hidden lg:block">
        <GlassCard className="sticky top-28 overflow-hidden border border-white/8">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-500/12 to-teal-400/8">
            {images[0] ? (
              <Image
                src={images[0].url}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/28">
                <Camera className="mb-3 h-9 w-9" />
                <span className="text-xs">Здесь появится обложка</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b1019] to-transparent" />
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="purple">{type === "THING" ? "Вещь" : "Услуга"}</Badge>
              <Badge variant="glass">{category}</Badge>
              {isOnline ? <Badge variant="teal">Онлайн</Badge> : null}
            </div>
            <h3 className={cn("text-xl font-bold leading-tight", title ? "text-white" : "text-white/30")}>
              {title || "Название появится здесь"}
            </h3>
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-white/45">
              {description || "Короткое и честное описание поможет быстрее найти подходящий обмен."}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
              <MapPin className="h-3.5 w-3.5" />
              {city || "Город не указан"}
            </div>
            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-200/65">
                <Sparkles className="h-3.5 w-3.5" />
                Интересно взамен
              </div>
              <p className="text-sm leading-5 text-white/60">
                {desired.length > 0
                  ? desired.join(", ")
                  : acceptsAnything
                    ? "Открыт к любым предложениям"
                    : "Пожелания появятся на последнем шаге"}
              </p>
            </div>
          </div>
        </GlassCard>
      </aside>
    </div>
  );
}
