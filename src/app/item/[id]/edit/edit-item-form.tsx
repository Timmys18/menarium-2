"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput, MenariumTextarea } from "@/components/menarium/input";
import type { PublicItem } from "@/features/items/serializers";
import { cn } from "@/lib/utils";

type EditableImage = {
  id?: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  isNew?: boolean;
};

const categories = ["Техника", "Мода", "Музыка", "Спорт", "Книги", "Искусство", "Фото", "Услуги"];
const quickWants = ["iPhone 15", "MacBook Pro", "PlayStation 5", "AirPods Pro", "Nike Jordan", "Vintage камера"];

export function EditItemForm({ item }: { item: PublicItem }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState<"THING" | "SERVICE">(item.type === "SERVICE" ? "SERVICE" : "THING");
  const [category, setCategory] = useState(item.category);
  const [description, setDescription] = useState(item.description);
  const [city, setCity] = useState(item.city);
  const [desiredText, setDesiredText] = useState(item.desired.join(", "));
  const [acceptsAnything, setAcceptsAnything] = useState(item.acceptsAnything);
  const [extraOfferText, setExtraOfferText] = useState(item.extraOfferText ?? "");
  const [images, setImages] = useState<EditableImage[]>(
    item.images.map((image) => ({
      id: image.id,
      url: image.url,
      contentType: image.contentType,
      sizeBytes: 1,
    })),
  );
  const [isOnline, setIsOnline] = useState(item.isOnline);
  const [isUploading, setIsUploading] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desired = desiredText
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  function addQuickWant(want: string) {
    if (desired.includes(want) || desired.length >= 12) return;
    setDesiredText([...desired, want].join(", "));
  }

  function validate() {
    if (title.trim().length < 2) return "Добавь понятное название длиной хотя бы в два символа.";
    if (description.trim().length < 10) return "Расскажи о предложении чуть подробнее — минимум 10 символов.";
    if (city.trim().length < 2) return "Укажи город, чтобы людям было проще оценить обмен.";
    if (desired.length === 0 && !acceptsAnything) {
      return "Напиши, что интересно получить, или отметь, что открыт к любым предложениям.";
    }
    if (desired.length > 12) return "Оставь не больше 12 вариантов для обмена.";
    if (desired.some((entry) => entry.length > 80)) return "Сократи каждый вариант до 80 символов.";
    if (extraOfferText.trim().length > 1000) return "Сократи дополнительные пожелания до 1000 символов.";
    return null;
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
        const uploaded = { ...body.data, isNew: true } as EditableImage;
        setImages((current) =>
          current.some((image) => image.id === uploaded.id)
            ? current
            : [...current, uploaded].slice(0, 8),
        );
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeImage(image: EditableImage) {
    if (!image.id) return;
    setError(null);
    setRemovingImageId(image.id);
    try {
      if (image.isNew) {
        const response = await fetch(`/api/media?id=${encodeURIComponent(image.id)}`, {
          method: "DELETE",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Не удалось удалить фото");
      }
      setImages((current) => current.filter((entry) => entry.id !== image.id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Не удалось удалить фото");
    } finally {
      setRemovingImageId(null);
    }
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isSubmitting || isUploading || isCancelling) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
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
      if (!response.ok) throw new Error(body.error ?? "Не удалось сохранить объявление");
      router.push(`/item/${body.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить объявление");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancel() {
    if (isSubmitting || isCancelling) return;
    setIsCancelling(true);
    const unattachedIds = images
      .filter((image) => image.isNew && image.id)
      .map((image) => image.id as string);

    await Promise.all(
      unattachedIds.map((id) =>
        fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null),
      ),
    );
    router.push(`/item/${item.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <GlassCard className="overflow-hidden border border-white/8 p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/65">Фотографии</p>
            <h2 className="mt-1.5 text-2xl font-bold">Фотографии</h2>
            <p className="mt-2 text-sm text-white/45">Первое изображение станет обложкой. Можно добавить до 8 фото.</p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45">
            {images.length}/8
          </span>
        </div>
        <input
          id="item-edit-images"
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
          htmlFor="item-edit-images"
          className={cn(
            "block cursor-pointer rounded-[22px] border border-dashed border-white/15 bg-white/[0.025] p-6 text-center transition hover:border-blue-300/35 hover:bg-blue-400/[0.04]",
            (isUploading || images.length >= 8) && "pointer-events-none opacity-60",
          )}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-teal-400/20">
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-blue-200" /> : <Upload className="h-6 w-6 text-teal-200" />}
          </div>
          <span className="inline-flex items-center gap-2 font-semibold text-white">
            <Camera className="h-5 w-5" />
            {images.length ? "Добавить ещё фото" : "Добавить фотографии"}
          </span>
          <span className="mt-1 block text-xs text-white/40">PNG, JPEG, WebP или GIF, каждое до 8 МБ</span>
        </label>
        {images.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.map((image, index) => (
                <div key={`${image.id ?? image.url}`} className="relative h-28 overflow-hidden rounded-[16px] border border-white/10 bg-white/5">
                  <Image
                    src={image.url}
                    alt={`Фото объявления ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 45vw, 180px"
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
      </GlassCard>

      <GlassCard className="space-y-6 border border-white/8 p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/65">Описание обмена</p>
          <h2 className="mt-1.5 text-2xl font-bold">Обнови детали</h2>
          <p className="mt-2 text-sm text-white/45">Изменения сразу появятся в каталоге после сохранения.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Название</span>
            <MenariumInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
            <span className="block text-right text-xs text-white/30">{title.length}/120</span>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Город</span>
            <MenariumInput
              value={city}
              onChange={(event) => setCity(event.target.value)}
              maxLength={80}
              autoComplete="address-level2"
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Тип</span>
            <select value={type} onChange={(event) => setType(event.target.value as "THING" | "SERVICE")} className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50">
              <option value="THING">Предмет</option>
              <option value="SERVICE">Услуга</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-white/70">Категория</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 w-full rounded-[14px] border border-white/10 bg-[#111723] px-4 py-3 text-white outline-none focus:border-blue-300/55 focus-visible:ring-2 focus-visible:ring-blue-300/50">
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
              {!categories.includes(category) ? <option value={category}>{category}</option> : null}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/70">Описание</span>
          <MenariumTextarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            required
          />
          <span className="block text-right text-xs text-white/30">{description.length}/4000</span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/70">Что интересно взамен</span>
          <MenariumInput
            value={desiredText}
            onChange={(event) => setDesiredText(event.target.value)}
            placeholder="Например: наушники, винил, камера"
          />
          <span className="block text-xs text-white/35">Разделяй варианты запятыми, максимум 12.</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {quickWants.map((want) => (
            <button
              key={want}
              type="button"
              onClick={() => addQuickWant(want)}
              disabled={desired.includes(want) || desired.length >= 12}
              aria-pressed={desired.includes(want)}
              className="disabled:opacity-45"
            >
              <Badge variant="purple">{want}</Badge>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex min-h-14 items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-white/70">
            <input type="checkbox" checked={acceptsAnything} onChange={(event) => setAcceptsAnything(event.target.checked)} />
            Открыт к любым предложениям
          </label>
          <label className="flex min-h-14 items-center gap-3 rounded-[16px] border border-white/8 bg-white/[0.025] px-4 py-3 text-sm text-white/70">
            <input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} />
            Можно обменяться онлайн
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/70">Дополнительные пожелания</span>
          <MenariumTextarea
            value={extraOfferText}
            onChange={(event) => setExtraOfferText(event.target.value)}
            maxLength={1000}
            className="min-h-24"
          />
          <span className="block text-right text-xs text-white/30">{extraOfferText.length}/1000</span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <MenariumButton
            type="submit"
            disabled={isSubmitting || isUploading || isCancelling}
            className="flex-1"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Сохранить
          </MenariumButton>
          <MenariumButton
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => void cancel()}
            disabled={isSubmitting || isCancelling}
          >
            {isCancelling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Отмена
          </MenariumButton>
        </div>
      </GlassCard>
    </form>
  );
}
