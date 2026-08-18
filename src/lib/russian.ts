/**
 * Русская морфология для интерфейса.
 *
 * `Intl.DateTimeFormat` с одним только `month: "long"` возвращает именительный
 * падеж — «август», а фраза «С нами с август 2026 г.» требует родительного.
 * Точно так же «Чат с Дмитрий П.» требует творительного падежа имени.
 * Оба случая раньше выводились как есть, и это первое, что замечает носитель
 * языка на странице, которая в остальном выглядит дорого.
 */

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/** «август 2026» → «августа 2026». Для дат вида «с ... по ...». */
export function formatMonthYearGenitive(date: Date): string {
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

const VOWELS = "аеёиоуыэюя";

function isVowel(letter: string) {
  return VOWELS.includes(letter.toLowerCase());
}

/**
 * Творительный падеж имени: «Дмитрий» → «Дмитрием», «Мария» → «Марией».
 *
 * Полная морфология русского имени требует словаря и знания рода, которого у
 * нас нет: пользователь вводит имя свободным текстом. Поэтому правила покрывают
 * регулярные окончания, а всё нераспознанное возвращается без изменений —
 * неизменённое имя читается нейтрально, а неверно просклонённое выглядит хуже
 * исходного.
 */
export function toInstrumentalName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  // «Дмитрий П.» — склоняем только первое слово, инициал остаётся как есть.
  const [first, ...rest] = trimmed.split(/\s+/);
  const inflected = inflectWordToInstrumental(first!);
  return [inflected, ...rest].join(" ");
}

function inflectWordToInstrumental(word: string): string {
  // Латиница, аббревиатуры и никнеймы вроде «xX_trader_Xx» не склоняем.
  if (!/^[А-Яа-яЁё-]+$/.test(word)) return word;
  if (word.length < 3) return word;
  if (word === word.toUpperCase()) return word;

  const lower = word.toLowerCase();
  const stem = word.slice(0, -1);
  const last = lower.at(-1)!;
  const beforeLast = lower.at(-2)!;

  // Мария → Марией, Аня → Аней; Ольга → Ольгой, Анна → Анной.
  if (last === "я") return `${stem}${beforeLast === "и" ? "ей" : "ей"}`;
  if (last === "а") return `${stem}${"жчшщц".includes(beforeLast) ? "ей" : "ой"}`;

  // Дмитрий → Дмитрием, Сергей → Сергеем.
  if (last === "й") return `${stem}ем`;

  // Игорь → Игорем, Любовь → Любовью — по мягкому знаку род не определить,
  // поэтому оставляем как есть, чтобы не выдать «Любовем».
  if (last === "ь") return word;

  // Иван → Иваном, Пётр → Петром; после шипящих — «-ем» (Кощеем не бывает,
  // но Гоша → Гошей уже обработан выше).
  if (!isVowel(last)) return `${word}${"жчшщц".includes(last) ? "ем" : "ом"}`;

  // Оканчивается на прочую гласную (Отто, Леви) — несклоняемое.
  return word;
}

/**
 * Готовая подпись «Чат с Дмитрием». Отдельная функция, чтобы запасной вариант
 * для пустого имени был один на весь продукт.
 */
export function chatWithLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "Чат с собеседником";
  return `Чат с ${toInstrumentalName(trimmed)}`;
}
