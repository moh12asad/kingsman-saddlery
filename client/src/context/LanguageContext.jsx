import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    // Update current language when i18n language changes
    setCurrentLanguage(i18n.language);
    
    // Update document direction for RTL languages
    const isRTL = i18n.language === 'ar' || i18n.language === 'he';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  const changeLanguage = async (lng) => {
    if (['en', 'ar', 'he'].includes(lng)) {
      await i18n.changeLanguage(lng);
      setCurrentLanguage(lng);
      try {
        localStorage.setItem('i18nextLng', lng);
      } catch (e) {
        console.error('Error saving language to localStorage:', e);
      }
    }
  };

  const isRTL = currentLanguage === 'ar' || currentLanguage === 'he';

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

