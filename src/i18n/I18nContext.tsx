'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import zh, { type TranslationKeys } from './locales/zh';
import en from './locales/en';
import {
  type Locale,
  detectClientLocale,
  parseLocale,
  persistClientLocale,
} from './localeStorage';

export type { Locale } from './localeStorage';

const LOCALES: Record<Locale, TranslationKeys> = { zh, en };

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

export function I18nProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => parseLocale(initialLocale));

  useEffect(() => {
    const detected = detectClientLocale();
    setLocaleState((current) => (current === detected ? current : detected));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persistClientLocale(l);
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
