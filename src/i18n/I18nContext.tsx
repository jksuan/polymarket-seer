'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import zh, { type TranslationKeys } from './locales/zh';
import en from './locales/en';

// ─── Supported locales ───
export type Locale = 'zh' | 'en';

const LOCALES: Record<Locale, TranslationKeys> = { zh, en };
const STORAGE_KEY = 'seer_locale';

// ─── Context shape ───
interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TranslationKeys;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: en,
});

// ─── Detect browser language, default to English ───
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  // 1. Check localStorage for persisted preference
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && LOCALES[saved]) return saved;

  // 2. Detect browser language
  const browserLang = navigator.language || '';
  if (browserLang.startsWith('zh')) return 'zh';

  // 3. Default to English
  return 'en';
}

// ─── Provider ───
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Initialize locale on mount (client-side only)
  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: LOCALES[locale],
  }), [locale, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
