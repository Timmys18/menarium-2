"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput, MenariumTextarea } from "@/components/menarium/input";
import { MenariumSelect } from "@/components/menarium/select";
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
    if (title.trim().length < 2) return "Добавьте понятное название длиной хотя бы в два символа.";
    if (description.trim().length < 10) return "Расскажите о предложении чуть подробнее — минимум 10 символов.";
    if (city.trim().length < 2) return "Укажите город, чтобы людям было проще оценить обмен.";
    if (desired.length === 0 && !acceptsAnything) {
      return "Напишите, что интересно получить, или отметьте, что открыты к любым предложениям.";
    }
    if (desired.length > 12) return "Оставьте не больше 12 вариантов для обмена.";
    if (desired.some((entry) => entry.length > 80)) return "Сократите каждый вариант до 80 символов.";
    if (extraOfferText.trim().length > 1000) return "Сократите дополнительные пожелания до 1000 символов.";
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
    const previousIndex = images.findIndex((entry) => entry.id === image.id);
    setImages((current) => current.filter((entry) => entry.id !== image.id));
    try {
      if (image.isNew) {
        const response = await fetch(`/api/media?id=${encodeURIComponent(image.id)}`, {
          method: "DELETE",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Не удалось удалить фото");
      }
    } catch (removeError) {
      setImages((current) => {
        if (current.some((entry) => entry.id === image.id)) return current;
        const restored = [...current];
        restored.splice(Math.max(0, previousIndex), 0, image);
        return restored;
      });
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
      <GlassCard className="overflow-hidden border border-line-hairline p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info-soft">Фотографии</p>
            <h2 className="mt-1.5 text-2xl font-bold">Фотографии</h2>
            <p className="mt-2 text-sm text-text-subtle">Первое изображение станет обложкой. Можно добавить до 8 фото.</p>
          </div>
          <span className="shrink-0 rounded-full border border-line-default bg-fill-1 px-3 py-1.5 text-xs text-text-subtle">
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
            "block cursor-pointer rounded-card border border-dashed border-line-strong bg-fill-1 p-6 text-center transition hover:border-blue-300/35 hover:bg-blue-400/[0.04]",
            (isUploading || images.length >= 8) && "pointer-events-none opacity-60",
          )}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-control bg-gradient-to-br from-blue-500/20 to-teal-400/20">
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-info" /> : <Upload className="h-6 w-6 text-accent" />}
          </div>
          <span className="inline-flex items-center gap-2 font-semibold text-text-primary">
            <Camera className="h-5 w-5" />
            {images.length ? "Добавить ещё фото" : "Добавить фото"}
          </span>
          <span className="mt-1 block text-xs text-text-subtle">PNG, JPEG, WebP или GIF, каждое до 8 МБ</span>
        </label>
        {images.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.map((image, index) => (
                <div key={`${image.id ?? image.url}`} className="relative h-28 overflow-hidden rounded-control border border-line-default bg-fill-2">
                  <Image
                    src={image.url}
                    alt={`Фото объявления ${index + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 45vw, 180px"
                    className="object-cover"
                  />
                  {index === 0 ? (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-micro font-medium text-on-media-soft">
                      Обложка
                    </span>
                  ) : null}
                <button
                  type="button"
                  aria-label={`Удалить фото ${index + 1}`}
                  onClick={() => void removeImage(image)}
                  disabled={removingImageId === image.id || isSubmitting}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xs bg-black/70 text-danger backdrop-blur-sm transition hover:bg-red-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-card)] disabled:opacity-50"
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

      <GlassCard className="space-y-6 border border-line-hairline p-5 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft">Описание обмена</p>
          <h2 className="mt-1.5 text-2xl font-bold">Обнови детали</h2>
          <p className="mt-2 text-sm text-text-subtle">Изменения сразу появятся в каталоге после сохранения.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-muted">Название</span>
            <MenariumInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
            <span className="block text-right text-xs text-text-subtle">{title.length}/120</span>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-text-muted">Город</span>
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
          <div className="space-y-2">
            <label htmlFor="edit-item-type" className="block text-sm font-medium text-text-muted">
              Тип
            </label>
            <MenariumSelect
              id="edit-item-type"
              ariaLabel="Тип"
              value={type}
              options={[
                { value: "THING", label: "Предмет" },
                { value: "SERVICE", label: "Услуга" },
              ]}
              onChange={(next) => setType(next as "THING" | "SERVICE")}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-item-category" className="block text-sm font-medium text-text-muted">
              Категория
            </label>
            <MenariumSelect
              id="edit-item-category"
              ariaLabel="Категория"
              value={category}
              options={[
                ...categories.map((entry) => ({ value: entry, label: entry })),
                // Объявление могло быть создано до правки справочника —
                // не теряем его текущую категорию из списка.
                ...(categories.includes(category) ? [] : [{ value: category, label: category }]),
              ]}
              onChange={setCategory}
            />
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-text-muted">Описание</span>
          <MenariumTextarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            required
          />
          <span className="block text-right text-xs text-text-subtle">{description.length}/4000</span>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-text-muted">Что интересно взамен</span>
          <MenariumInput
            value={desiredText}
            onChange={(event) => setDesiredText(event.target.value)}
            placeholder="Например: наушники, винил, камера"
          />
          <span className="block text-xs text-text-subtle">Разделяйте варианты запятыми, максимум 12.</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {quickWants.map((want) => (
            <button
              key={want}
              type="button"
              onClick={() => addQuickWant(want)}
              disabled={desired.includes(want) || desired.length >= 12}
              aria-pressed={desired.includes(want)}
              className="inline-flex min-h-11 items-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-45"
            >
              <Badge variant="purple">{want}</Badge>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex min-h-14 items-center gap-3 rounded-control border border-line-hairline bg-fill-1 px-4 py-3 text-sm text-text-muted">
            <input type="checkbox" checked={acceptsAnything} onChange={(event) => setAcceptsAnything(event.target.checked)} />
            Открыт к любым предложениям
          </label>
          <label className="flex min-h-14 items-center gap-3 rounded-control border border-line-hairline bg-fill-1 px-4 py-3 text-sm text-text-muted">
            <input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} />
            Можно обменяться онлайн
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-text-muted">Дополнительные пожелания</span>
          <MenariumTextarea
            value={extraOfferText}
            onChange={(event) => setExtraOfferText(event.target.value)}
            maxLength={1000}
            className="min-h-24"
          />
          <span className="block text-right text-xs text-text-subtle">{extraOfferText.length}/1000</span>
        </label>

        {error ? (
          <div className="rounded-control border border-red-500/30 bg-red-500/10 p-4 text-sm text-danger" role="alert">
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
