import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { onest, spaceGrotesk } from "./fonts";
import { THEME_COOKIE, parseThemeChoice, themeAttribute } from "@/lib/theme";
import { ProductAnalytics } from "@/components/analytics/product-analytics";
import { AuthProvider } from "@/components/providers/auth-provider";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

export const viewport: Viewport = {
  // Совпадает с --background: без этого системная строка на телефоне и
  // splash-экран установленного приложения вспыхивают белым.
  // Значения --background числами: это уходит в <meta name="theme-color">,
  // который не понимает CSS-переменные.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070a10" },
  ],
  colorScheme: "light dark",
  // viewportFit=cover нужен, чтобы env(safe-area-inset-*) в globals.css
  // действительно получал значения на устройствах с вырезом.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Менариум",
    template: "%s | Менариум",
  },
  description: "Обмен вещей и услуг напрямую: вещь на вещь, услуга на услугу или услуга на вещь.",
  applicationName: "Менариум",
  icons: {
    icon: "/icon",
    shortcut: "/icon",
    apple: "/icon",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Менариум",
    title: "Меняйся. Просто",
    description: "Обменивайте вещи и услуги напрямую.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Меняйся. Просто",
    description: "Обменивайте вещи и услуги напрямую.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Тема читается на сервере, поэтому HTML уходит уже в нужной схеме и
  // светлая тема не начинается со вспышки тёмного фона.
  const cookieStore = await cookies();
  const theme = themeAttribute(parseThemeChoice(cookieStore.get(THEME_COOKIE)?.value));

  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      data-theme={theme}
      className={`${onest.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <OrganizationJsonLd />
        <AuthProvider>
          {children}
          <ProductAnalytics />
        </AuthProvider>
      </body>
    </html>
  );
}
