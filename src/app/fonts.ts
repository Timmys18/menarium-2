import localFont from "next/font/local";

// Onest — основной шрифт интерфейса: полностью поддерживает кириллицу и латиницу,
// премиальный геометрический гротеск в духе фирменного стиля Menarium.
export const onest = localFont({
  variable: "--font-onest",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/onest-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/onest-cyrillic.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
});

// Space Grotesk — акцентный дисплейный шрифт для латинских элементов бренда
// (логотип MENARIUM и т.п.). Кириллицу не покрывает, поэтому только для латиницы.
export const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/spacegrotesk-latin.woff2",
      weight: "300 700",
      style: "normal",
    },
  ],
});
