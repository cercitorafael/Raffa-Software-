import { Language, LanguageOption } from '../types';
import { pt } from './locales/pt';

export type TranslationDictionary = typeof pt;

export interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
}
