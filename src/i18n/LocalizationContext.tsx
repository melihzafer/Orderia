import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Translation } from './languages';

export type Language = 'tr' | 'bg' | 'en';
export type Currency = 'TRY' | 'BGN' | 'EUR';

export interface CurrencyConfig {
  symbol: string;
  code: string;
  name: string;
  locale: string;
}

export const currencies: Record<Currency, CurrencyConfig> = {
  TRY: {
    symbol: '₺',
    code: 'TRY',
    name: 'Turkish Lira',
    locale: 'tr-TR'
  },
  BGN: {
    symbol: 'лв',
    code: 'BGN', 
    name: 'Bulgarian Lev',
    locale: 'bg-BG'
  },
  EUR: {
    symbol: '€',
    code: 'EUR',
    name: 'Euro',
    locale: 'en-EU'
  }
};

interface LocalizationContextType {
  language: Language;
  currency: Currency;
  t: Translation;
  currencyConfig: CurrencyConfig;
  setLanguage: (lang: Language) => Promise<void>;
  setCurrency: (curr: Currency) => Promise<void>;
  formatPrice: (priceInCents: number) => string;
  formatDate: (timestamp: number) => string;
  formatDateTime: (timestamp: number) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const LANGUAGE_KEY = '@orderia_language';
const CURRENCY_KEY = '@orderia_currency';

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');
  const [currency, setCurrencyState] = useState<Currency>('TRY');

  const t = translations[language];
  const currencyConfig = currencies[currency];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      const savedCurrency = await AsyncStorage.getItem(CURRENCY_KEY);
      
      if (savedLanguage && savedLanguage in translations) {
        setLanguageState(savedLanguage as Language);
      }
      
      if (savedCurrency && savedCurrency in currencies) {
        setCurrencyState(savedCurrency as Currency);
      }
    } catch (error) {
      console.error('Error loading localization settings:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const setCurrency = async (curr: Currency) => {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, curr);
      setCurrencyState(curr);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const formatPrice = (priceInCents: number): string => {
    const price = priceInCents / 100;
    return `${currencyConfig.symbol}${price.toFixed(2)}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(currencyConfig.locale);
  };

  const formatDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString(currencyConfig.locale);
  };

  const value: LocalizationContextType = {
    language,
    currency,
    t,
    currencyConfig,
    setLanguage,
    setCurrency,
    formatPrice,
    formatDate,
    formatDateTime,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}
