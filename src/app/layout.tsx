import type { Metadata, Viewport } from "next";
import { onest, spaceGrotesk } from "./fonts";
import { ProductAnalytics } from "@/components/analytics/product-analytics";
import { AuthProvider } from "@/components/providers/auth-provider";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

export const viewport: Viewport = {
  // Совпадает с --background: без этого системная строка на телефоне и
  // splash-экран установленного приложения вспыхивают белым.
  themeColor: "#070a10",
  colorScheme: "dark",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
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
