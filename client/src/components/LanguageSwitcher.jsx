import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
];

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        className="language-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        type="button"
      >
        <FaGlobe />
        <span className="language-switcher-text">{currentLang.nativeName}</span>
      </button>
      
      {isOpen && (
        <div className="language-switcher-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-switcher-option ${currentLanguage === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              type="button"
            >
              <span className="language-switcher-native">{lang.nativeName}</span>
              <span className="language-switcher-name">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

