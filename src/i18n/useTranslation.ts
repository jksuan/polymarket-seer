'use client';

import { useContext } from 'react';
import { I18nContext, type Locale } from './I18nContext';
import type { TranslationKeys } from './locales/zh';

/**
 * Main consumer hook for i18n.
 *
 * Usage:
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * <span>{t.nav.home}</span>                    // → "首页" or "Home"
 * <span>{t.date.monthDay(6, 14)}</span>         // → "6月14日" or "Jun 14"
 * ```
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  return ctx;
}
