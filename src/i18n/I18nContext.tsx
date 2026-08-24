import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Language, LanguageOption } from '../types';
import { pt } from './locales/pt';
import { en } from './locales/en';
import { I18nContextValue } from './types';

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  {
    code: 'pt',
    name: 'Português',
    nativeName: 'Português (MZ / PT)',
    flag: '🇲🇿',
    country: 'Moçambique / Portugal / CPLP',
    dateFormat: 'DD/MM/YYYY',
    description: 'Interface em Língua Portuguesa com terminologia fiscal e comercial local.',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (International)',
    flag: '🇬🇧',
    country: 'Global / Multi-currency',
    dateFormat: 'YYYY-MM-DD',
    description: 'Standard English interface designed for international retail & ERP workflows.',
  },
];

const dictionaries: Record<Language, any> = {
  pt,
  en,
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'erp_app_language';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'pt') return saved;
      // Auto-detect browser language if available
      const browserLang = navigator.language?.toLowerCase() || '';
      if (browserLang.startsWith('en')) return 'en';
      return 'pt';
    } catch {
      return 'pt';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.warn('Could not persist language to localStorage', e);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'pt' ? 'en' : 'pt'));
  }, [setLanguage]);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  /**
   * Translates a dot-notated key with optional interpolation params.
   * Example: t('settings.languageSection.toastChanged', { lang: 'English' })
   */
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeDict = dictionaries[language] || dictionaries.pt;
      const fallbackDict = dictionaries.pt;

      const getNested = (obj: any, path: string[]) => {
        let current = obj;
        for (const segment of path) {
          if (current === undefined || current === null) return undefined;
          current = current[segment];
        }
        return typeof current === 'string' ? current : undefined;
      };

      const path = key.split('.');
      let result = getNested(activeDict, path);

      // Fallback to PT if key is missing in active dictionary
      if (result === undefined && language !== 'pt') {
        result = getNested(fallbackDict, path);
      }

      // If still missing, return the raw key as safe fallback
      if (result === undefined) {
        return key;
      }

      // Interpolate parameters: {paramName}
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        }
      }

      return result;
    },
    [language]
  );

  const currentLanguageOption = useMemo(() => {
    return AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      languages: AVAILABLE_LANGUAGES,
      currentLanguageOption,
    }),
    [language, setLanguage, toggleLanguage, t, currentLanguageOption]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
