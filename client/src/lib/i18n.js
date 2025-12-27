import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en/translation.json';
import arTranslations from '../locales/ar/translation.json';
import heTranslations from '../locales/he/translation.json';

// Get saved language from localStorage or default to 'en'
const getSavedLanguage = () => {
  try {
    const saved = localStorage.getItem('i18nextLng');
    if (saved && ['en', 'ar', 'he'].includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading language from localStorage:', e);
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      ar: {
        translation: arTranslations
      },
      he: {
        translation: heTranslations
      }
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;

