import { useEffect } from 'react';
import i18n from '@/i18n';
import { useSettingsStore } from '@/store/settings';

/**
 * Sincroniza o idioma do Zustand/settings com o i18next.
 * Deve ser chamado uma vez no componente raiz (App.tsx).
 */
export function useLanguageSync() {
  const language = useSettingsStore((state) => state.language);

  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }
  }, [language]);
}
