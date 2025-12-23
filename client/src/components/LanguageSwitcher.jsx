import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { FaGlobe } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
];

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0, left: undefined });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dropdown position on mobile
  useEffect(() => {
    if (isOpen && isMobile && buttonRef.current) {
      const updatePosition = () => {
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        if (buttonRect) {
          const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
          if (isRTL) {
            setDropdownPosition({
              top: buttonRect.bottom + 8,
              left: buttonRect.left
            });
          } else {
            setDropdownPosition({
              top: buttonRect.bottom + 8,
              right: window.innerWidth - buttonRect.right
            });
          }
        }
      };

      updatePosition();
      
      // Listen to scroll on window, document, and all scrollable containers
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      document.addEventListener('scroll', updatePosition, true);
      document.documentElement.addEventListener('scroll', updatePosition, true);
      document.body.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        document.removeEventListener('scroll', updatePosition, true);
        document.documentElement.removeEventListener('scroll', updatePosition, true);
        document.body.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, isMobile]);

  // Close dropdown when clicking outside (only for desktop)
  useEffect(() => {
    if (isMobile) return; // Don't add click outside handler for mobile (backdrop handles it)
    
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate closure
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, isMobile]);

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (e, langCode) => {
    e.preventDefault();
    e.stopPropagation();
    handleLanguageChange(langCode);
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const dropdownContent = (
    <div className="language-switcher-dropdown" onClick={(e) => e.stopPropagation()}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          className={`language-switcher-option ${currentLanguage === lang.code ? 'active' : ''}`}
          onClick={(e) => handleOptionClick(e, lang.code)}
          type="button"
        >
          <span className="language-switcher-native">{lang.nativeName}</span>
          <span className="language-switcher-name">{lang.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="language-switcher-button"
        onClick={handleButtonClick}
        aria-label="Change language"
        aria-expanded={isOpen}
        type="button"
      >
        <FaGlobe />
        <span className="language-switcher-text">{currentLang.nativeName}</span>
      </button>
      
      {isOpen && !isMobile && dropdownContent}
      
      {isOpen && isMobile && createPortal(
        <>
          {/* Backdrop to close dropdown */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1010,
              backgroundColor: 'transparent'
            }}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div 
            className="language-switcher-dropdown language-switcher-dropdown-mobile"
            onClick={(e) => {
              // Allow clicks on buttons to work
              if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
              }
              e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              ...(dropdownPosition.right !== undefined 
                ? { right: `${dropdownPosition.right}px` }
                : { left: `${dropdownPosition.left}px` }
              ),
              zIndex: 1011
            }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`language-switcher-option ${currentLanguage === lang.code ? 'active' : ''}`}
                onClick={(e) => handleOptionClick(e, lang.code)}
                type="button"
              >
                <span className="language-switcher-native">{lang.nativeName}</span>
                <span className="language-switcher-name">{lang.name}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

