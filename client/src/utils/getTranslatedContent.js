/**
 * Gets translated content from a multilingual object
 * 
 * Supports both old format (string) and new format (object with language keys)
 * for backward compatibility during migration.
 * 
 * @param {object|string} content - Content object with language keys or plain string
 * @param {string} language - Current language code (en, ar, he)
 * @param {string} fallback - Fallback language (default: 'en')
 * @returns {string} Translated content or original if not an object
 * 
 * @example
 * // New format (multilingual object)
 * getTranslatedContent({ en: "Hello", ar: "مرحبا", he: "שלום" }, "ar")
 * // Returns: "مرحبا"
 * 
 * // Old format (string - backward compatibility)
 * getTranslatedContent("Hello", "ar")
 * // Returns: "Hello"
 * 
 * // Missing translation falls back to English
 * getTranslatedContent({ en: "Hello", ar: "" }, "ar")
 * // Returns: "Hello"
 */
export function getTranslatedContent(content, language = 'en', fallback = 'en') {
  // If content is null or undefined, return empty string
  if (content == null) {
    return '';
  }
  
  // If content is a string, return as-is (backward compatibility)
  if (typeof content === 'string') {
    return content;
  }
  
  // If content is an object with language keys
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    // Try current language first
    if (content[language] && content[language].trim() !== '') {
      return content[language];
    }
    
    // Fallback to default language (usually English)
    if (content[fallback] && content[fallback].trim() !== '') {
      return content[fallback];
    }
    
    // Fallback to first available non-empty language
    for (const lang of Object.keys(content)) {
      const value = content[lang];
      if (value && typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
  }
  
  // Return empty string if no content found
  return '';
}

/**
 * Checks if content is multilingual (object format)
 * @param {any} content - Content to check
 * @returns {boolean} True if content is a multilingual object
 */
export function isMultilingual(content) {
  return (
    content != null &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    (content.en !== undefined || content.ar !== undefined || content.he !== undefined)
  );
}

/**
 * Gets all available languages for a multilingual content object
 * @param {object} content - Multilingual content object
 * @returns {string[]} Array of language codes that have content
 */
export function getAvailableLanguages(content) {
  if (!isMultilingual(content)) {
    return [];
  }
  
  return Object.keys(content).filter(lang => {
    const value = content[lang];
    return value && typeof value === 'string' && value.trim() !== '';
  });
}





