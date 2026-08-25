"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, Eye, EyeOff, Loader2, Trash2, Upload } from "lucide-react";
import { MenariumButton, MenariumLinkButton } from "@/components/menarium/button";
import { SurfaceCard } from "@/components/menarium/card";
import { ConfirmDialog } from "@/components/menarium/dialog";
import { MenariumInput } from "@/components/menarium/input";
import { CityPicker } from "@/components/menarium/city-picker";
import { findCityByName } from "@/features/locations/cities";
import { getPasswordChecks, isPasswordReady } from "@/lib/password-policy";
import { navigateWithViewTransition } from "@/lib/view-transition";

type ProfileFormUser = {
  name: string | null;
  city: string | null;
  cityId: string | null;
  image: string | null;
};

export function ProfileEditForm({ user }: { user: ProfileFormUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [cityId, setCityId] = useState(user.cityId ?? findCityByName(user.city)?.id ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAvatarId, setUploadedAvatarId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const passwordChecks = getPasswordChecks(newPassword);
  const passwordReady = isPasswordReady(newPassword);

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setProfileError(null);
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
      setProfileError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить аватар");
    } finally {
      setIsUploading(false);
    }
  }

  async function removeAvatar() {
    setProfileError(null);
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
      setProfileError(removeError instanceof Error ? removeError.message : "Не удалось удалить аватар");
    }
  }

  async function saveProfile() {
    setProfileError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cityId, image }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Не удалось сохранить профиль");
      await navigateWithViewTransition(() => router.push("/profile"), ["profile-updated"]);
    } catch (saveError) {
      setProfileError(saveError instanceof Error ? saveError.message : "Не удалось сохранить профиль");
    } finally {
      setIsSaving(false);
    }
  }

  async function changePassword() {
    setPasswordError(null);
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
      setPasswordError(err instanceof Error ? err.message : "Не удалось сменить пароль");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
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
      setDeleteDialogOpen(false);
      setDeleteError(err instanceof Error ? err.message : "Не удалось удалить аккаунт");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SurfaceCard className="space-y-5 p-5 sm:p-8">
        {profileError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {profileError}
          </div>
        ) : null}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-500 text-white">
            {image ? (
              <Image src={image} alt="Аватар" fill sizes="80px" className="object-cover" />
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
              className="surface-card inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-blue-300/70"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Загрузить аватар
            </label>
            <p className="mt-2 text-xs text-white/62">PNG, JPG, WEBP или GIF до 8 МБ.</p>
            {image ? (
              <button
                type="button"
                onClick={() => void removeAvatar()}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm text-red-200/90 transition hover:bg-red-500/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/75"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить аватар
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-name" className="block text-sm font-medium text-white/75">
            Имя
          </label>
          <MenariumInput
            id="profile-name"
            name="name"
            autoComplete="name"
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setProfileError(null);
            }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-city" className="block text-sm font-medium text-white/75">
            Город
          </label>
          <CityPicker
            id="profile-city"
            value={cityId}
            onChange={(city) => {
              setCityId(city.id);
              setProfileError(null);
            }}
          />
          <p className="text-xs leading-5 text-white/62">Помогает находить удобные обмены рядом.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <MenariumButton className="w-full sm:w-auto" onClick={saveProfile} disabled={isSaving || isUploading}>
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Сохранить
          </MenariumButton>
          <MenariumLinkButton
            href="/profile"
            variant="secondary"
            className="w-full sm:w-auto"
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
      </SurfaceCard>

      <SurfaceCard className="space-y-4 p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Смена пароля</h2>
        <p className="text-sm leading-5 text-white/62">
          После смены пароля мы завершим текущий сеанс. Войти снова можно будет уже с новым паролем.
        </p>
        {passwordError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {passwordError}
          </div>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="current-password" className="block text-sm font-medium text-white/75">
            Текущий пароль
          </label>
          <div className="relative">
            <MenariumInput
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-12"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setPasswordError(null);
              }}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((visible) => !visible)}
              aria-label={showCurrentPassword ? "Скрыть текущий пароль" : "Показать текущий пароль"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/62 transition hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300/60"
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="new-password" className="block text-sm font-medium text-white/75">
            Новый пароль
          </label>
          <div className="relative">
            <MenariumInput
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-describedby="profile-password-hint"
              className="pr-12"
              placeholder="Минимум 8 символов, буквы и цифры"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setPasswordError(null);
              }}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((visible) => !visible)}
              aria-label={showNewPassword ? "Скрыть новый пароль" : "Показать новый пароль"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/62 transition hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300/60"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div id="profile-password-hint" className="flex flex-wrap gap-2 pt-1" aria-live="polite">
            {passwordChecks.map((check) => (
              <span
                key={check.label}
                className={
                  check.passed
                    ? "inline-flex items-center gap-1.5 rounded-full bg-teal-300/10 px-2.5 py-1 text-xs text-teal-200"
                    : "inline-flex items-center gap-1.5 rounded-full bg-white/[0.045] px-2.5 py-1 text-xs text-white/62"
                }
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                {check.label}
              </span>
            ))}
          </div>
        </div>
        <MenariumButton
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={changePassword}
          disabled={isChangingPassword || !currentPassword || !passwordReady}
        >
          {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Обновить пароль
        </MenariumButton>
      </SurfaceCard>

      <SurfaceCard className="space-y-4 border-red-500/20 p-5 sm:p-8">
        <h2 className="text-lg font-semibold text-red-200">Удаление аккаунта</h2>
        <p className="text-sm text-white/62">
          Личные данные будут удалены, объявления сняты с публикации. История завершённых сделок
          сохранится у участников в обезличенном виде.
        </p>
        {deleteError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            {deleteError}
          </div>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="delete-password" className="block text-sm font-medium text-white/75">
            Пароль для подтверждения
          </label>
          <MenariumInput
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(event) => {
              setDeletePassword(event.target.value);
              setDeleteError(null);
            }}
          />
        </div>
        <MenariumButton
          variant="danger"
          className="w-full sm:w-auto"
          onClick={() => {
            setDeleteError(null);
            setDeleteDialogOpen(true);
          }}
          disabled={isDeleting || !deletePassword}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Удалить аккаунт
        </MenariumButton>
      </SurfaceCard>
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAccount}
        title="Удалить аккаунт?"
        description="Это действие нельзя отменить. Мы удалим ваши личные данные и закроем доступ к аккаунту. Завершённые обмены и сообщения останутся у участников с подписью «Удалённый пользователь»."
        confirmLabel="Удалить мои данные"
        pending={isDeleting}
        danger
      />
    </div>
  );
}
