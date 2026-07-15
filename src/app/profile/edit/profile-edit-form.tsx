"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { GlassCard } from "@/components/menarium/card";
import { ConfirmDialog } from "@/components/menarium/dialog";
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAvatarId, setUploadedAvatarId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Не удалось загрузить аватар");
      const previousUploadId = uploadedAvatarId;
      setImage(body.data.url);
      setUploadedAvatarId(body.data.id);
      if (previousUploadId) {
        void fetch(`/api/media?id=${encodeURIComponent(previousUploadId)}`, {
          method: "DELETE",
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить аватар");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeAvatar() {
    setError(null);
    try {
      if (uploadedAvatarId) {
        const response = await fetch(`/api/media?id=${encodeURIComponent(uploadedAvatarId)}`, {
          method: "DELETE",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Не удалось удалить аватар");
      }
      setImage("");
      setUploadedAvatarId(null);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Не удалось удалить аватар");
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

  async function changePassword() {
    setError(null);
    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось сменить пароль");
      setCurrentPassword("");
      setNewPassword("");
      await signOut({ callbackUrl: "/auth/login?passwordChanged=1" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function deleteAccount() {
    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось удалить аккаунт");
      setDeleteDialogOpen(false);
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить аккаунт");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <GlassCard className="space-y-5 p-8">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600">
            {image ? (
              <Image src={image} alt="Аватар" fill className="object-cover" />
            ) : (
              <span className="text-2xl font-bold">{(name || "M").slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={isUploading}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void uploadAvatar(file);
              }}
            />
            <label
              htmlFor="avatar-upload"
              className="glass-card inline-flex cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-teal-400/60"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Загрузить аватар
            </label>
            <p className="mt-2 text-xs text-white/40">PNG, JPG, WEBP или GIF до 8 МБ.</p>
            {image ? (
              <button
                type="button"
                onClick={() => void removeAvatar()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-200/80 transition hover:text-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить аватар
              </button>
            ) : null}
          </div>
        </div>

        <MenariumInput placeholder="Имя" value={name} onChange={(event) => setName(event.target.value)} />
        <MenariumInput placeholder="Город" value={city} onChange={(event) => setCity(event.target.value)} />

        {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

        <div className="flex gap-3">
          <MenariumButton onClick={saveProfile} disabled={isSaving || isUploading}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Сохранить
          </MenariumButton>
          <MenariumLinkButton
            href="/profile"
            variant="secondary"
            onClick={() => {
              if (uploadedAvatarId) {
                void fetch(`/api/media?id=${encodeURIComponent(uploadedAvatarId)}`, {
                  method: "DELETE",
                  keepalive: true,
                });
              }
            }}
          >
            Отмена
          </MenariumLinkButton>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 p-8">
        <h2 className="text-lg font-semibold">Смена пароля</h2>
        <MenariumInput
          type="password"
          placeholder="Текущий пароль"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <MenariumInput
          type="password"
          placeholder="Новый пароль (мин. 8 символов, буквы и цифры)"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <MenariumButton
          variant="secondary"
          onClick={changePassword}
          disabled={isChangingPassword || !currentPassword || newPassword.length < 8}
        >
          {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Обновить пароль
        </MenariumButton>
      </GlassCard>

      <GlassCard className="space-y-4 border border-red-500/20 p-8">
        <h2 className="text-lg font-semibold text-red-200">Удаление аккаунта</h2>
        <p className="text-sm text-white/50">
          Личные данные будут удалены, объявления сняты с публикации. История завершённых сделок
          сохранится у участников в обезличенном виде.
        </p>
        <MenariumInput
          type="password"
          placeholder="Пароль для подтверждения"
          value={deletePassword}
          onChange={(event) => setDeletePassword(event.target.value)}
        />
        <MenariumButton
          variant="danger"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting || !deletePassword}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Удалить аккаунт
        </MenariumButton>
      </GlassCard>
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAccount}
        title="Удалить аккаунт?"
        description="Это действие нельзя отменить. Мы удалим ваши личные данные и закроем доступ к аккаунту. Завершённые сделки и сообщения останутся у участников с подписью «Удалённый пользователь»."
        confirmLabel="Удалить мои данные"
        pending={isDeleting}
        danger
      />
    </div>
  );
}
