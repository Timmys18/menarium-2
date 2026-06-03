"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { MenariumInput } from "@/components/menarium/input";

type ProfileFormUser = {
  name: string | null;
  city: string | null;
  image: string | null;
};

export function ProfileEditForm({ user }: { user: ProfileFormUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("ownerType", "USER");
      const response = await fetch("/api/media", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось загрузить аватар");
      setImage(body.data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить аватар");
    } finally {
      setIsUploading(false);
    }
  }

  async function saveProfile() {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, image }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось сохранить профиль");
      router.push("/profile");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить профиль");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassCard className="space-y-5 p-8">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" />
          ) : (
            <span className="text-2xl font-bold">{(name || "M").slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => uploadAvatar(event.target.files?.[0])}
          />
          <label htmlFor="avatar-upload" className="glass-card inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Загрузить аватар
          </label>
          <p className="mt-2 text-xs text-white/40">PNG, JPG, WEBP или GIF до 8 МБ.</p>
        </div>
      </div>

      <MenariumInput placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
      <MenariumInput placeholder="Город" value={city} onChange={(event) => setCity(event.target.value)} />
      <MenariumInput placeholder="Фото профиля URL" value={image} onChange={(event) => setImage(event.target.value)} />

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <div className="flex gap-3">
        <MenariumButton onClick={saveProfile} disabled={isSaving || isUploading}>
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Сохранить
        </MenariumButton>
        <MenariumLinkButton href="/profile" variant="secondary">Отмена</MenariumLinkButton>
      </div>
    </GlassCard>
  );
}
