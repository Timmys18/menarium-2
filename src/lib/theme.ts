export const THEME_COOKIE = "menarium-theme";

export type ThemeChoice = "dark" | "light" | "system";

/**
 * Тема хранится в cookie, а не в localStorage, намеренно: страницы рендерятся
 * на сервере, и только cookie доступна в момент формирования HTML. С
 * localStorage разметка всегда уходила бы тёмной, а нужная тема применялась бы
 * уже в браузере — то есть пользователь светлой темы видел бы вспышку тёмного
 * фона на каждой навигации.
 */
export function parseThemeChoice(value: string | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * `system` возвращает `undefined`: атрибут не выставляется, и оформление
 * достаётся медиазапросу `prefers-color-scheme`.
 */
export function themeAttribute(choice: ThemeChoice): "light" | "dark" | undefined {
  return choice === "system" ? undefined : choice;
}
