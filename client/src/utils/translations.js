/**
 * Translation utility functions for frontend
 * Handles translation objects from the database
 */

const SUPPORTED_LANGUAGES = ['en', 'ar', 'he'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Get translated value from a translation object
 * @param {string|object} field - Either a string (backward compatibility) or translation object
 * @param {string} lang - Language code (en, ar, he)
 * @returns {string} Translated value or empty string
 */
export function getTranslated(field, lang = DEFAULT_LANGUAGE) {
  if (!field) return '';
  
  // If it's already a string (backward compatibility), return as-is
  if (typeof field === 'string') {
    return field;
  }
  
  // If it's a translation object
  if (typeof field === 'object' && field !== null) {
    // Try requested language first
    if (field[lang] !== undefined && field[lang] !== null && field[lang] !== '') {
      return field[lang];
    }
    
    // Fallback to English
    if (field.en !== undefined && field.en !== null && field.en !== '') {
      return field.en;
    }
    
    // Try any available language
    for (const supportedLang of SUPPORTED_LANGUAGES) {
      if (field[supportedLang] !== undefined && field[supportedLang] !== null && field[supportedLang] !== '') {
        return field[supportedLang];
      }
    }
  }
  
  return '';
}

/**
 * Get translated product with all translatable fields resolved
 * @param {object} product - Product object from database
 * @param {string} lang - Language code
 * @returns {object} Product with translated fields
 */
export function getTranslatedProduct(product, lang = DEFAULT_LANGUAGE) {
  if (!product) return product;
  
  const translated = { ...product };
  
  // Translate simple fields
  translated.name = getTranslated(product.name, lang);
  translated.description = getTranslated(product.description, lang);
  translated.technicalDetails = getTranslated(product.technicalDetails, lang);
  translated.additionalDetails = getTranslated(product.additionalDetails, lang);
  translated.warranty = getTranslated(product.warranty, lang);
  translated.shippingInfo = getTranslated(product.shippingInfo, lang);
  
  // Translate specifications object
  if (product.specifications && typeof product.specifications === 'object') {
    translated.specifications = {};
    for (const [key, value] of Object.entries(product.specifications)) {
      translated.specifications[key] = getTranslated(value, lang);
    }
  }
  
  return translated;
}

/**
 * Get translated category with all translatable fields resolved
 * @param {object} category - Category object from database
 * @param {string} lang - Language code
 * @returns {object} Category with translated fields
 */
export function getTranslatedCategory(category, lang = DEFAULT_LANGUAGE) {
  if (!category) return category;
  
  const translated = { ...category };
  
  translated.name = getTranslated(category.name, lang);
  translated.description = getTranslated(category.description, lang);
  
  // Translate subcategories
  if (Array.isArray(category.subCategories)) {
    translated.subCategories = category.subCategories.map(subCat => ({
      ...subCat,
      name: getTranslated(subCat.name, lang)
    }));
  }
  
  return translated;
}

/**
 * Check if a field is a translation object
 * @param {any} field - Field to check
 * @returns {boolean} True if field is a translation object
 */
export function isTranslationObject(field) {
  return (
    field !== null &&
    typeof field === 'object' &&
    !Array.isArray(field) &&
    (field.en !== undefined || field.ar !== undefined || field.he !== undefined)
  );
}

