import type { MetadataRoute } from "next";

/**
 * CSP уже разрешал `manifest-src 'self'`, но самого манифеста не существовало,
 * поэтому продукт, который по сути живёт на телефоне, нельзя было установить на
 * домашний экран. `display: standalone` и `id` фиксируют установленное
 * приложение как отдельную сущность, а не как ярлык вкладки.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Менариум — обмен вещами и услугами",
    short_name: "Менариум",
    description: "Обменивайте вещи и услуги напрямую: вещь на вещь, услугу на услугу или услугу на вещь.",
    lang: "ru",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Совпадает с --background: иначе системная строка и splash-экран
    // вспыхивают белым перед первой отрисовкой тёмного интерфейса.
    background_color: "#070a10",
    theme_color: "#070a10",
    categories: ["shopping", "lifestyle", "social"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Каталог", short_name: "Каталог", url: "/catalog" },
      { name: "Свайп", short_name: "Свайп", url: "/swipe" },
      { name: "Добавить объявление", short_name: "Добавить", url: "/new" },
    ],
  };
}
