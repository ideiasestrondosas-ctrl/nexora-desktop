import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/base.json';
import pt from './locales/pt/common.json';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import de from './locales/de/common.json';

const resources = {
  en: { common: en },
  pt: { common: pt },
  es: { common: es },
  fr: { common: fr },
  de: { common: de },
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
