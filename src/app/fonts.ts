import localFont from "next/font/local";

// Onest — основной шрифт интерфейса с поддержкой кириллицы и латиницы.
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

// Space Grotesk — акцентный шрифт для цифр и коротких латинских элементов.
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
