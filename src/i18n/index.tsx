import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ms from './locales/ms';
import zh from './locales/zh';
import ta from './locales/ta';
import hi from './locales/hi';
import es from './locales/es';

/* The app speaks English by default. Every sentence in the code is the English text itself, and each
   language file maps that English text to its translation. Anything not yet translated falls back to English,
   so a language can be added or improved one sentence at a time. */

export type LocaleId = 'en' | 'ms' | 'zh' | 'ta' | 'hi' | 'es';
export const LOCALES: { id: LocaleId; name: string; tag: string }[] = [
  { id: 'en', name: 'English', tag: 'en' },
  { id: 'ms', name: 'Bahasa Melayu', tag: 'ms' },
  { id: 'zh', name: '中文（简体）', tag: 'zh-CN' },
  { id: 'ta', name: 'தமிழ்', tag: 'ta' },
  { id: 'hi', name: 'हिन्दी', tag: 'hi' },
  { id: 'es', name: 'Español', tag: 'es' },
];
export const isLocale = (v: unknown): v is LocaleId => LOCALES.some((l) => l.id === v);

const DICTIONARIES: Record<LocaleId, Record<string, string>> = { en: {}, ms, zh, ta, hi, es };
const STORAGE_KEY = 'cyc-locale';

function firstLocale(): LocaleId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch { /* storage blocked */ }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    const id = base === 'id' ? 'ms' : base;   // Indonesian speakers read Bahasa Melayu well enough as a fallback
    if (isLocale(id)) return id;
  }
  return 'en';
}

/** Translate outside React (for example when a new resume is created). */
export const translateTo = (locale: string, text: string): string => DICTIONARIES[locale as LocaleId]?.[text] ?? text;

/** If text is a stock section title ("About", "Tentang Saya", "关于我"…) in any language, return it in `locale`. Otherwise null. */
const STOCK_TITLES = ['About', 'Experience', 'Education', 'Skills', 'Languages', 'Co-curricular activities', 'Achievements', 'Certifications', 'Projects', 'References', 'Gallery'];
export function retitle(text: string, locale: string): string | null {
  const key = STOCK_TITLES.find((k) => k === text || Object.values(DICTIONARIES).some((d) => d[k] === text));
  return key ? translateTo(locale, key) : null;
}

export type Translate = (text: string, vars?: Record<string, string | number>) => string;

interface I18n { locale: LocaleId; setLocale: (l: LocaleId) => void; t: Translate; tag: string }
const I18nContext = createContext<I18n>({ locale: 'en', setLocale: () => {}, t: (s) => s, tag: 'en' });
export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>(firstLocale);
  const setLocale = useCallback((l: LocaleId) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage blocked */ }
  }, []);
  const tag = LOCALES.find((l) => l.id === locale)?.tag ?? 'en';
  useEffect(() => { document.documentElement.lang = tag; }, [tag]);
  const value = useMemo<I18n>(() => {
    const dict = DICTIONARIES[locale];
    const t: Translate = (text, vars) => {
      const out = dict[text] ?? text;
      return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
    };
    return { locale, setLocale, t, tag };
  }, [locale, setLocale, tag]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** A drop-down to pick the language of the app. */
export function LanguageSelect({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <select aria-label={t('Language')} value={locale} onChange={(e) => setLocale(e.target.value as LocaleId)}
      className={className ?? 'min-h-10 rounded-sm border border-muted bg-paper px-2 text-[15px] font-semibold text-ink'}>
      {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  );
}
