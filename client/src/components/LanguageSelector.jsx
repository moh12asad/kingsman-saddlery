import { useLanguage, SUPPORTED_LANGUAGES } from "../context/LanguageContext";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  // Language display names
  const languageLabels = {
    ar: "AR",
    en: "ENG",
    he: "HE"
  };

  // Order: AR | ENG | HE
  const languageOrder = ["ar", "en", "he"];

  return (
    <div className="language-selector">
      {languageOrder.map((langCode, index) => {
        const isActive = language === langCode;
        return (
          <span key={langCode}>
            <button
              onClick={() => setLanguage(langCode)}
              className={`language-btn ${isActive ? "active" : ""}`}
              type="button"
              aria-label={`Switch to ${SUPPORTED_LANGUAGES[langCode]?.name}`}
            >
              {languageLabels[langCode]}
            </button>
            {index < languageOrder.length - 1 && (
              <span className="language-separator">|</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

