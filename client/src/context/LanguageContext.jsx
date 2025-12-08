import { createContext, useContext, useState, useEffect, useMemo } from "react";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
  isRTL: false,
});

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  he: { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl" },
};

// Load translations dynamically
async function loadTranslations(lang) {
  try {
    const translations = await import(`../translations/${lang}.json`);
    return translations.default;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // Fallback to English if translation file doesn't exist
    if (lang !== "en") {
      const fallback = await import(`../translations/en.json`);
      return fallback.default;
    }
    return {};
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Get saved language from localStorage or detect from browser
    const saved = localStorage.getItem("language");
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      return saved;
    }
    // Detect from browser
    const browserLang = navigator.language.split("-")[0];
    if (SUPPORTED_LANGUAGES[browserLang]) {
      return browserLang;
    }
    return "en"; // Default to English
  });

  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    async function loadLang() {
      setIsLoading(true);
      const loadedTranslations = await loadTranslations(language);
      setTranslations(loadedTranslations);
      setIsLoading(false);
    }
    loadLang();
  }, [language]);

  // Update document direction and language attribute
  useEffect(() => {
    const langConfig = SUPPORTED_LANGUAGES[language];
    if (langConfig) {
      document.documentElement.lang = language;
      document.documentElement.dir = langConfig.dir;
      document.body.setAttribute("dir", langConfig.dir);
    }
  }, [language]);

  // Translation function
  const t = useMemo(() => {
    return (key, params = {}) => {
      if (isLoading) return key;
      
      const keys = key.split(".");
      let value = translations;
      
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key; // Return key if translation not found
        }
      }
      
      // Replace parameters if provided
      if (typeof value === "string" && Object.keys(params).length > 0) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? params[paramKey] : match;
        });
      }
      
      return typeof value === "string" ? value : key;
    };
  }, [translations, isLoading]);

  const setLanguage = (lang) => {
    if (SUPPORTED_LANGUAGES[lang]) {
      setLanguageState(lang);
      localStorage.setItem("language", lang);
    }
  };

  const isRTL = useMemo(() => {
    return SUPPORTED_LANGUAGES[language]?.dir === "rtl";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isRTL,
      isLoading,
    }),
    [language, t, isRTL, isLoading]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}





