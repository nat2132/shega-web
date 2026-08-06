'use client';

import { useState, createContext, useContext, ReactNode, ReactElement } from 'react';
import enTranslations from '@/lib/translations/en.json';
import amTranslations from '@/lib/translations/am.json';
import omTranslations from '@/lib/translations/om.json';
import tiTranslations from '@/lib/translations/ti.json';

type TranslationValue = string | string[] | { [key: string]: TranslationValue };

const translations: Record<string, Record<string, TranslationValue>> = {
  en: enTranslations as unknown as Record<string, TranslationValue>,
  am: amTranslations as unknown as Record<string, TranslationValue>,
  om: omTranslations as unknown as Record<string, TranslationValue>,
  ti: tiTranslations as unknown as Record<string, TranslationValue>,
};

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => TranslationValue;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useTranslations() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
}

function getNestedValue(obj: Record<string, TranslationValue>, path: string): TranslationValue {
  const keys = path.split('.');
  let current: TranslationValue = obj;
  for (const key of keys) {
    if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
      current = (current as Record<string, TranslationValue>)[key];
    } else {
      return path;
    }
  }
  return current || path;
}

export function LanguageProvider({ children }: { children: ReactNode }): ReactElement {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('shega-language');
    return saved && translations[saved] ? saved : 'en';
  });

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('shega-language', lang);
  };

  const t = (key: string): TranslationValue => {
    const langTranslations = translations[language] || translations['en'];
    return getNestedValue(langTranslations, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}