import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/base.json';
import pt from './locales/pt/common.json';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import de from './locales/de/common.json';
import ar from './locales/ar/common.json';
import it from './locales/it/common.json';
import ja from './locales/ja/common.json';
import ko from './locales/ko/common.json';
import nl from './locales/nl/common.json';
import pl from './locales/pl/common.json';
import ru from './locales/ru/common.json';
import sv from './locales/sv/common.json';
import tr from './locales/tr/common.json';
import zh from './locales/zh/common.json';

const resources = {
  en: { common: en },
  pt: { common: pt },
  es: { common: es },
  fr: { common: fr },
  de: { common: de },
  ar: { common: ar },
  it: { common: it },
  ja: { common: ja },
  ko: { common: ko },
  nl: { common: nl },
  pl: { common: pl },
  ru: { common: ru },
  sv: { common: sv },
  tr: { common: tr },
  zh: { common: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
