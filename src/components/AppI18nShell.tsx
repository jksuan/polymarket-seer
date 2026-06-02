"use client";

import { I18nProvider } from "@/i18n";
import type { Locale } from "@/i18n/localeStorage";

export function AppI18nShell({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
}
