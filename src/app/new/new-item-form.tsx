"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/menarium/badge";
import { MenariumButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput, MenariumTextarea } from "@/components/menarium/input";

type UploadedImage = {
  id: string;
  url: string;
  contentType: string;
  sizeBytes: number;
};

const categories = ["Техника", "Мода", "Музыка", "Спорт", "Книги", "Искусство", "Фото", "Услуги"];
const quickWants = ["iPhone 15", "MacBook Pro", "PlayStation 5", "AirPods Pro", "Nike Jordan", "Vintage камера"];

export function NewItemForm() {
  const router = useRouter();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desired = useMemo(
    () =>
      desiredText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [desiredText],
  );

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setIsUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files).slice(0, 8 - images.length)) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("ownerType", "ITEM");
        const response = await fetch("/api/media", { method: "POST", body: formData });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Не удалось загрузить фото");
        uploaded.push(body.data);
      }
      setImages((current) => [...current, ...uploaded].slice(0, 8));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
    }
  }

  async function submit() {
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
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось создать объявление");
      router.push(`/item/${body.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать объявление");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="rounded-3xl border-2 border-dashed border-white/20 p-8 text-center transition-colors hover:border-purple-500/50">
        <input
          id="item-images"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(event) => uploadFiles(event.target.files)}
        />
        <label htmlFor="item-images" className="block cursor-pointer">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500/20 to-purple-500/20">
            {isUploading ? <Loader2 className="h-10 w-10 animate-spin text-purple-400" /> : <Upload className="h-10 w-10 text-purple-400" />}
          </div>
          <h3 className="mb-2 text-2xl font-bold">Загрузи фото</h3>
          <p className="mb-4 text-white/60">до 8 изображений, каждое до 8 МБ</p>
          <div className="flex items-center justify-center gap-4">
            <span className="glass-card inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold">
              <Camera className="h-5 w-5" />
              Выбрать фото
            </span>
          </div>
        </label>
        {images.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.map((image) => (
              <div key={image.id} className="relative h-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <Image src={image.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard className="rounded-2xl border border-purple-500/30 p-6">
        <div className="mb-3 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span className="gradient-text-accent font-semibold">Умный create flow</span>
        </div>
        <p className="text-white/80">
          Menarium сохранит фото, привяжет их к объявлению и сразу покажет страницу предложения.
        </p>
      </GlassCard>

      <GlassCard className="space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-white/55">Название</span>
            <MenariumInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, Sony WH-1000XM5" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-white/55">Город</span>
            <MenariumInput value={city} onChange={(event) => setCity(event.target.value)} placeholder="Москва" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-white/55">Тип</span>
            <select value={type} onChange={(event) => setType(event.target.value as "THING" | "SERVICE")} className="glass-card w-full rounded-2xl px-4 py-3 text-white outline-none">
              <option value="THING">Предмет</option>
              <option value="SERVICE">Услуга</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-white/55">Категория</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="glass-card w-full rounded-2xl px-4 py-3 text-white outline-none">
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-white/55">Описание</span>
          <MenariumTextarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Состояние, комплектация, нюансы, что важно знать перед обменом..." />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/55">Что хотите взамен</span>
          <MenariumInput value={desiredText} onChange={(event) => setDesiredText(event.target.value)} placeholder="Через запятую: iPad Pro, камера, часы" />
        </label>

        <div className="flex flex-wrap gap-2">
          {quickWants.map((want) => (
            <button
              key={want}
              type="button"
              onClick={() => setDesiredText((current) => (current ? `${current}, ${want}` : want))}
            >
              <Badge variant="purple">{want}</Badge>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/70">
            <input type="checkbox" checked={acceptsAnything} onChange={(event) => setAcceptsAnything(event.target.checked)} />
            Открыт к любым предложениям
          </label>
          <label className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/70">
            <input type="checkbox" checked={isOnline} onChange={(event) => setIsOnline(event.target.checked)} />
            Можно обменяться онлайн
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-white/55">Дополнительные пожелания</span>
          <MenariumInput value={extraOfferText} onChange={(event) => setExtraOfferText(event.target.value)} placeholder="Например, готов доплатить или рассмотреть похожие варианты" />
        </label>

        {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

        <MenariumButton onClick={submit} disabled={isSubmitting || isUploading} className="w-full">
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          Создать объявление
        </MenariumButton>
      </GlassCard>
    </div>
  );
}
