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
  const dropdownElementRef = useRef(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate dropdown position with proper UX constraints
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const buttonRect = buttonRef.current?.getBoundingClientRect();
        if (!buttonRect) return;

        const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
        const gap = 8;
        const minMarginFromViewport = 8; // Minimum margin from viewport edges
        const estimatedDropdownHeight = 160; // Approximate height for 3 options
        
        // Get actual dropdown height and width if available, otherwise use estimate
        let dropdownHeight = estimatedDropdownHeight;
        let dropdownWidth = 180; // Default min-width from CSS
        if (dropdownElementRef.current) {
          const dropdownRect = dropdownElementRef.current.getBoundingClientRect();
          dropdownHeight = dropdownRect.height || estimatedDropdownHeight;
          dropdownWidth = dropdownRect.width || 180;
        }

        // Calculate available space
        const spaceBelow = window.innerHeight - buttonRect.bottom - minMarginFromViewport;
        const spaceAbove = buttonRect.top - minMarginFromViewport;
        
        // Determine best position: prefer below, but use above if not enough space
        let topPosition;
        if (spaceBelow >= dropdownHeight) {
          // Position below button
          topPosition = buttonRect.bottom + gap;
        } else if (spaceAbove >= dropdownHeight) {
          // Position above button
          topPosition = buttonRect.top - dropdownHeight - gap;
        } else {
          // Not enough space either way - position below but constrain to viewport
          topPosition = Math.max(
            minMarginFromViewport,
            Math.min(
              buttonRect.bottom + gap,
              window.innerHeight - dropdownHeight - minMarginFromViewport
            )
          );
        }

        // Ensure dropdown never goes above viewport
        topPosition = Math.max(minMarginFromViewport, topPosition);
        
        // Ensure dropdown never goes below viewport
        const maxTop = window.innerHeight - dropdownHeight - minMarginFromViewport;
        topPosition = Math.min(topPosition, maxTop);

        if (isRTL) {
          // For RTL, position from left, aligning with button's left edge
          let leftPosition = buttonRect.left - 4;
          // Ensure dropdown doesn't overflow left edge
          if (leftPosition < minMarginFromViewport) {
            leftPosition = minMarginFromViewport;
          }
          // Ensure dropdown doesn't overflow right edge - adjust if needed
          const rightEdge = leftPosition + dropdownWidth;
          if (rightEdge > window.innerWidth - minMarginFromViewport) {
            leftPosition = window.innerWidth - dropdownWidth - minMarginFromViewport;
            // If still too wide, ensure minimum margin
            if (leftPosition < minMarginFromViewport) {
              leftPosition = minMarginFromViewport;
            }
          }
          setDropdownPosition({
            top: topPosition,
            left: leftPosition
          });
        } else {
          // For LTR, position from right, aligning with button's right edge
          let rightPosition = window.innerWidth - buttonRect.right - 4;
          // Ensure dropdown doesn't overflow right edge
          if (rightPosition < minMarginFromViewport) {
            rightPosition = minMarginFromViewport;
          }
          // Calculate where the dropdown's left edge would be
          const leftEdge = window.innerWidth - rightPosition - dropdownWidth;
          // Ensure dropdown doesn't overflow left edge - adjust if needed
          if (leftEdge < minMarginFromViewport) {
            rightPosition = window.innerWidth - dropdownWidth - minMarginFromViewport;
            // Ensure we still have minimum margin from right edge
            if (rightPosition < minMarginFromViewport) {
              rightPosition = minMarginFromViewport;
            }
          }
          setDropdownPosition({
            top: topPosition,
            right: rightPosition
          });
        }
      };

      // Initial position calculation
      updatePosition();
      
      // Recalculate after a brief delay to get actual dropdown dimensions
      const timeoutId = setTimeout(updatePosition, 0);
      
      // Also recalculate after a slightly longer delay to ensure dimensions are stable
      const timeoutId2 = setTimeout(updatePosition, 10);
      
      // Listen to scroll and resize events
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      document.addEventListener('scroll', updatePosition, true);
      document.documentElement.addEventListener('scroll', updatePosition, true);
      document.body.addEventListener('scroll', updatePosition, true);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutId2);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        document.removeEventListener('scroll', updatePosition, true);
        document.documentElement.removeEventListener('scroll', updatePosition, true);
        document.body.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Check if click is outside the button and dropdown
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        !event.target.closest('.language-switcher-dropdown')
      ) {
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
  }, [isOpen]);

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
      
      {isOpen && createPortal(
        <>
          {/* Backdrop to close dropdown */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: 'transparent',
              pointerEvents: 'auto'
            }}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu */}
          <div 
            ref={dropdownElementRef}
            className={`language-switcher-dropdown ${isMobile ? 'language-switcher-dropdown-mobile' : 'language-switcher-dropdown-desktop'}`}
            onClick={(e) => {
              // Allow clicks on buttons to work
              if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
              }
              e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              top: `${Math.max(12, dropdownPosition.top)}px`, // Add more top margin
              ...(dropdownPosition.right !== undefined 
                ? { right: `${dropdownPosition.right}px` }
                : { left: `${dropdownPosition.left || 0}px` }
              ),
              zIndex: 10000,
              isolation: 'isolate'
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

