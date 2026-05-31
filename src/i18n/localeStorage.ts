export type Locale = 'zh' | 'en';

export const LOCALE_STORAGE_KEY = 'seer_locale';
export const LOCALE_COOKIE_NAME = 'seer_locale';

export function parseLocale(value: string | null | undefined): Locale {
  return value === 'zh' || value === 'en' ? value : 'en';
}

/** 浏览器端检测语言（localStorage → navigator.language → en） */
export function detectClientLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved) return parseLocale(saved);

  const browserLang = navigator.language || '';
  if (browserLang.startsWith('zh')) return 'zh';

  return 'en';
}

export function persistClientLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;samesite=lax`;
}
