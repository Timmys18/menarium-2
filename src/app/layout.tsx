import type { Metadata } from "next";
import { onest, spaceGrotesk } from "./fonts";
import { ProductAnalytics } from "@/components/analytics/product-analytics";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Menarium",
    template: "%s | Menarium",
  },
  description:
    "Menarium — премиальная платформа бартерного обмена вещами и услугами. Свайп, каталог, безопасные сделки.",
  applicationName: "Menarium",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Menarium",
    title: "Menarium — бартерный обмен нового уровня",
    description: "Меняйся просто. Находи людей, которым нужен твой предмет.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menarium",
    description: "Премиальная платформа бартерного обмена",
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
      className={`${onest.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          {children}
          <ProductAnalytics />
        </AuthProvider>
      </body>
    </html>
  );
}
