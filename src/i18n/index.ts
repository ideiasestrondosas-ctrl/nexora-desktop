import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English é sempre carregado — serve de fallback e de default
import en from './locales/en/base.json';

const SUPPORTED_LANGS = new Set([
  'pt',
  'es',
  'fr',
  'de',
  'ar',
  'it',
  'ja',
  'ko',
  'nl',
  'pl',
  'ru',
  'sv',
  'tr',
  'zh',
]);

async function importLocale(lang: string): Promise<object | null> {
  switch (lang) {
    case 'pt':
      return (await import('./locales/pt/common.json')).default;
    case 'es':
      return (await import('./locales/es/common.json')).default;
    case 'fr':
      return (await import('./locales/fr/common.json')).default;
    case 'de':
      return (await import('./locales/de/common.json')).default;
    case 'ar':
      return (await import('./locales/ar/common.json')).default;
    case 'it':
      return (await import('./locales/it/common.json')).default;
    case 'ja':
      return (await import('./locales/ja/common.json')).default;
    case 'ko':
      return (await import('./locales/ko/common.json')).default;
    case 'nl':
      return (await import('./locales/nl/common.json')).default;
    case 'pl':
      return (await import('./locales/pl/common.json')).default;
    case 'ru':
      return (await import('./locales/ru/common.json')).default;
    case 'sv':
      return (await import('./locales/sv/common.json')).default;
    case 'tr':
      return (await import('./locales/tr/common.json')).default;
    case 'zh':
      return (await import('./locales/zh/common.json')).default;
    default:
      return null;
  }
}

function detectInitialLang(): string {
  try {
    const stored = localStorage.getItem('i18nextLng');
    if (stored) {
      const base = stored.split('-')[0];
      if (base === 'en' || SUPPORTED_LANGS.has(base)) return base;
    }
  } catch {
    // localStorage indisponível
  }
  const nav = (navigator.language ?? 'en').split('-')[0];
  return nav === 'en' || SUPPORTED_LANGS.has(nav) ? nav : 'en';
}

/**
 * Carrega o locale dado (se ainda não estiver em memória) e muda o idioma.
 * Chamado em useLanguageSync e em qualquer ponto que precise de mudar idioma.
 */
export async function loadAndChangeLanguage(lang: string): Promise<void> {
  const base = lang.split('-')[0];
  const target = base === 'en' || SUPPORTED_LANGS.has(base) ? base : 'en';

  if (target !== 'en' && !i18n.hasResourceBundle(target, 'common')) {
    const locale = await importLocale(target);
    if (locale) i18n.addResourceBundle(target, 'common', locale);
  }

  await i18n.changeLanguage(target);
}

/**
 * Inicializa o i18next carregando apenas o idioma inicial detectado.
 * Deve ser awaited em main.tsx antes de montar o React.
 */
export async function initI18n(): Promise<void> {
  const initialLang = detectInitialLang();

  const resources: Record<string, { common: object }> = {
    en: { common: en },
  };

  if (initialLang !== 'en') {
    const locale = await importLocale(initialLang);
    if (locale) resources[initialLang] = { common: locale };
  }

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLang,
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });
}

export default i18n;
