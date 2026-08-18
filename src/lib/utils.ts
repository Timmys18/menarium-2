import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Приводит callbackUrl к безопасному внутреннему пути.
 * Защита от open redirect: принимаем только относительные пути внутри сайта,
 * отсекаем абсолютные URL (//evil.com, https://evil.com) и служебные схемы.
 */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/profile"): string {
  if (!value) return fallback;
  // Должен начинаться с одного слэша и не быть protocol-relative "//".
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  // Исключаем попытки внедрить схему через backslash-трюки.
  if (value.includes("\\") || value.includes("://")) {
    return fallback;
  }
  return value;
}

/** Ссылка на login с безопасным возвратом на текущую страницу. */
export function loginHref(callbackPath: string, fallback = "/profile") {
  return `/auth/login?callbackUrl=${encodeURIComponent(safeCallbackUrl(callbackPath, fallback))}`;
}

/** Инициалы по имени (первая буква каждого слова) с запасным вариантом по почте. */
export function getInitials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
