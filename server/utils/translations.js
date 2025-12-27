/**
 * Translation utility functions for backend
 * Handles translation objects in the format: { en: "...", ar: "...", he: "..." }
 */

const SUPPORTED_LANGUAGES = ['en', 'ar', 'he'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Get translated value from a translation object
 * @param {string|object} field - Either a string (backward compatibility) or translation object
 * @param {string} lang - Language code (en, ar, he)
 * @param {string} fallback - Fallback language if translation not found
 * @returns {string} Translated value or empty string
 */
export function getTranslatedField(field, lang = DEFAULT_LANGUAGE, fallback = DEFAULT_LANGUAGE) {
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
    
    // Try fallback language
    if (fallback && field[fallback] !== undefined && field[fallback] !== null && field[fallback] !== '') {
      return field[fallback];
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
 * Convert a string value to a translation object (all languages set to the same value)
 * Used during migration
 * @param {string} value - String value to convert
 * @returns {object} Translation object with all languages set to the value
 */
export function stringToTranslationObject(value) {
  if (!value || typeof value !== 'string') {
    return {
      en: '',
      ar: '',
      he: ''
    };
  }
  
  return {
    en: value,
    ar: value, // Will be translated later
    he: value  // Will be translated later
  };
}

/**
 * Validate that a translation object has all required languages
 * @param {object} translations - Translation object to validate
 * @param {boolean} allowPartial - If true, allow missing languages (default: false)
 * @returns {object} { valid: boolean, missing: string[] }
 */
export function validateTranslations(translations, allowPartial = false) {
  if (!translations || typeof translations !== 'object') {
    return { valid: false, missing: SUPPORTED_LANGUAGES };
  }
  
  const missing = SUPPORTED_LANGUAGES.filter(lang => {
    const value = translations[lang];
    return value === undefined || value === null || value === '';
  });
  
  if (allowPartial) {
    return { valid: true, missing };
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Merge translation updates into existing translations
 * @param {object} existing - Existing translation object
 * @param {object} updates - Updates to merge (can be partial)
 * @returns {object} Merged translation object
 */
export function mergeTranslations(existing = {}, updates = {}) {
  const merged = { ...existing };
  
  for (const lang of SUPPORTED_LANGUAGES) {
    if (updates[lang] !== undefined) {
      merged[lang] = updates[lang];
    } else if (!merged[lang]) {
      // If language doesn't exist in existing, initialize with empty string
      merged[lang] = merged[lang] || '';
    }
  }
  
  return merged;
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
  translated.name = getTranslatedField(product.name, lang);
  translated.description = getTranslatedField(product.description, lang);
  translated.technicalDetails = getTranslatedField(product.technicalDetails, lang);
  translated.additionalDetails = getTranslatedField(product.additionalDetails, lang);
  translated.warranty = getTranslatedField(product.warranty, lang);
  translated.shippingInfo = getTranslatedField(product.shippingInfo, lang);
  
  // Translate specifications object
  if (product.specifications && typeof product.specifications === 'object') {
    translated.specifications = {};
    for (const [key, value] of Object.entries(product.specifications)) {
      translated.specifications[key] = getTranslatedField(value, lang);
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
  
  translated.name = getTranslatedField(category.name, lang);
  translated.description = getTranslatedField(category.description, lang);
  
  // Translate subcategories
  if (Array.isArray(category.subCategories)) {
    translated.subCategories = category.subCategories.map(subCat => ({
      ...subCat,
      name: getTranslatedField(subCat.name, lang)
    }));
  }
  
  return translated;
}

/**
 * Prepare product data for storage (convert string inputs to translation objects)
 * @param {object} data - Product data from request
 * @returns {object} Product data ready for storage
 */
export function prepareProductForStorage(data) {
  const prepared = { ...data };
  
  // Convert translatable fields
  const translatableFields = [
    'name',
    'description',
    'technicalDetails',
    'additionalDetails',
    'warranty',
    'shippingInfo'
  ];
  
  for (const field of translatableFields) {
    if (data[field] !== undefined) {
      // If it's already a translation object, keep it
      if (typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field])) {
        prepared[field] = data[field];
      } else if (typeof data[field] === 'string') {
        // Convert string to translation object
        prepared[field] = stringToTranslationObject(data[field]);
      }
    }
  }
  
  // Handle specifications
  if (data.specifications && typeof data.specifications === 'object') {
    const translatedSpecs = {};
    for (const [key, value] of Object.entries(data.specifications)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        translatedSpecs[key] = value; // Already a translation object
      } else if (typeof value === 'string') {
        translatedSpecs[key] = stringToTranslationObject(value);
      } else {
        translatedSpecs[key] = value; // Keep as-is (number, boolean, etc.)
      }
    }
    prepared.specifications = translatedSpecs;
  }
  
  return prepared;
}

/**
 * Prepare category data for storage
 * @param {object} data - Category data from request
 * @returns {object} Category data ready for storage
 */
export function prepareCategoryForStorage(data) {
  const prepared = { ...data };
  
  // Convert name and description
  if (data.name !== undefined) {
    if (typeof data.name === 'object' && data.name !== null) {
      prepared.name = data.name;
    } else if (typeof data.name === 'string') {
      prepared.name = stringToTranslationObject(data.name);
    }
  }
  
  if (data.description !== undefined) {
    if (typeof data.description === 'object' && data.description !== null) {
      prepared.description = data.description;
    } else if (typeof data.description === 'string') {
      prepared.description = stringToTranslationObject(data.description);
    }
  }
  
  // Handle subcategories
  if (Array.isArray(data.subCategories)) {
    prepared.subCategories = data.subCategories.map(subCat => {
      const preparedSubCat = { ...subCat };
      if (subCat.name !== undefined) {
        if (typeof subCat.name === 'object' && subCat.name !== null) {
          preparedSubCat.name = subCat.name;
        } else if (typeof subCat.name === 'string') {
          preparedSubCat.name = stringToTranslationObject(subCat.name);
        }
      }
      return preparedSubCat;
    });
  }
  
  return prepared;
}

/**
 * Get translated hero slide with all translatable fields resolved
 * @param {object} slide - Hero slide object from database
 * @param {string} lang - Language code
 * @returns {object} Hero slide with translated fields
 */
export function getTranslatedHeroSlide(slide, lang = DEFAULT_LANGUAGE) {
  if (!slide) return slide;
  
  const translated = { ...slide };
  
  translated.title = getTranslatedField(slide.title, lang);
  translated.subtitle = getTranslatedField(slide.subtitle, lang);
  translated.button1 = getTranslatedField(slide.button1, lang);
  translated.button2 = getTranslatedField(slide.button2, lang);
  
  return translated;
}

/**
 * Get translated ad with all translatable fields resolved
 * @param {object} ad - Ad object from database
 * @param {string} lang - Language code
 * @returns {object} Ad with translated fields
 */
export function getTranslatedAd(ad, lang = DEFAULT_LANGUAGE) {
  if (!ad) return ad;
  
  const translated = { ...ad };
  
  translated.title = getTranslatedField(ad.title, lang);
  translated.subtitle = getTranslatedField(ad.subtitle, lang);
  
  return translated;
}

/**
 * Prepare hero slide data for storage
 * @param {object} data - Hero slide data from request
 * @returns {object} Hero slide data ready for storage
 */
export function prepareHeroSlideForStorage(data) {
  const prepared = { ...data };
  
  const translatableFields = ['title', 'subtitle', 'button1', 'button2'];
  
  for (const field of translatableFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field])) {
        prepared[field] = data[field];
      } else if (typeof data[field] === 'string') {
        prepared[field] = stringToTranslationObject(data[field]);
      }
    }
  }
  
  return prepared;
}

/**
 * Prepare ad data for storage
 * @param {object} data - Ad data from request
 * @returns {object} Ad data ready for storage
 */
export function prepareAdForStorage(data) {
  const prepared = { ...data };
  
  const translatableFields = ['title', 'subtitle'];
  
  for (const field of translatableFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field])) {
        prepared[field] = data[field];
      } else if (typeof data[field] === 'string') {
        prepared[field] = stringToTranslationObject(data[field]);
      }
    }
  }
  
  return prepared;
}

