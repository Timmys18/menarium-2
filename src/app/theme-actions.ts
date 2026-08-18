"use server";

import { cookies } from "next/headers";
import { THEME_COOKIE, parseThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * Cookie ставит сервер, а не `document.cookie` на клиенте: значение нужно
 * именно серверному рендеру следующей страницы, и записывать его отсюда —
 * единственный способ гарантировать, что оно там окажется.
 */
export async function rememberTheme(choice: ThemeChoice) {
  const store = await cookies();
  store.set(THEME_COOKIE, parseThemeChoice(choice), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Оформление — не секрет: пусть остаётся читаемым для клиента,
    // но защищённым от передачи по открытому протоколу в production.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
