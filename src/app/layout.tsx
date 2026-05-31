import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { AppI18nShell } from "@/components/AppI18nShell";
import { APP_BRAND_NAME, APP_FAVICON_URL } from "@/lib/brandAssets";
import { LOCALE_COOKIE_NAME, parseLocale } from "@/i18n/localeStorage";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_BRAND_NAME,
  description: "Sports prediction market on Polymarket",
  icons: {
    icon: [{ url: APP_FAVICON_URL, type: "image/svg+xml" }],
    shortcut: APP_FAVICON_URL,
    apple: APP_FAVICON_URL,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = parseLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={initialLocale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#0D0518', minHeight: '100dvh' }}
      >
        <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative', overflowX: 'hidden', minHeight: '100dvh' }}>
          <Providers>
            <AppI18nShell initialLocale={initialLocale}>{children}</AppI18nShell>
          </Providers>
        </div>
      </body>
    </html>
  );
}
