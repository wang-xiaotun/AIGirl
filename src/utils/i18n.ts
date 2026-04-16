import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import id from '../locales/id';
import en from '../locales/en';
import zh from '../locales/zh';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
  type: 'languageDetector' as const,
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      if (language) {
        callback(language);
        return;
      }
      callback('id'); // Default to id (Indonesian)
    } catch (error) {
      console.log('Error reading language', error);
      callback('id');
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(initReactI18next)
  .use(languageDetectorPlugin)
  .init({
    resources: {
      id: id,
      en: en,
      zh: zh,
    },
    fallbackLng: 'id',
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;
