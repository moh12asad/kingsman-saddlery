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
      // Only update if the new value is non-empty, or if there's no existing value
      // This preserves existing translations when admin leaves a field empty in the form
      if (updates[lang] !== '') {
        // Non-empty update: use the new value
        merged[lang] = updates[lang];
      } else if (merged[lang] === undefined || merged[lang] === '') {
        // Empty update and no existing value: set to empty
        merged[lang] = '';
      }
      // If update is empty but existing has a value, preserve the existing value (don't overwrite)
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
  
  // Handle categoryPairs: new format (array of {category, subCategory} objects)
  // Also support backward compatibility with old formats
  if (Array.isArray(product.categoryPairs) && product.categoryPairs.length > 0) {
    translated.categoryPairs = product.categoryPairs;
    // Extract categories and subCategories arrays for backward compatibility
    translated.categories = product.categoryPairs.map(p => p.category).filter(Boolean);
    translated.subCategories = product.categoryPairs.map(p => p.subCategory).filter(Boolean);
    translated.category = translated.categories[0] || '';
    translated.subCategory = translated.subCategories[0] || '';
  } else if (Array.isArray(product.categories)) {
    // Old format: separate arrays
    translated.categories = product.categories;
    translated.subCategories = Array.isArray(product.subCategories) ? product.subCategories : [];
    translated.category = product.categories[0] || '';
    translated.subCategory = translated.subCategories[0] || '';
    // Convert to categoryPairs for consistency
    translated.categoryPairs = product.categories.map((cat, idx) => ({
      category: cat,
      subCategory: translated.subCategories[idx] || ""
    }));
  } else if (product.category) {
    // Oldest format: single category string
    translated.category = product.category;
    translated.categories = [product.category];
    translated.subCategory = product.subCategory || '';
    translated.subCategories = product.subCategory ? [product.subCategory] : [];
    translated.categoryPairs = [{
      category: product.category,
      subCategory: product.subCategory || ""
    }];
  } else {
    translated.category = '';
    translated.categories = [];
    translated.subCategory = '';
    translated.subCategories = [];
    translated.categoryPairs = [];
  }
  
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
  
  // Ensure category image is always a string (not a translation object)
  // Images should be the same for all languages, so always use the same image regardless of language
  if (category.image !== undefined) {
    if (typeof category.image === 'string') {
      translated.image = category.image;
    } else if (typeof category.image === 'object' && category.image !== null) {
      // If it's a translation object, use English as default (or first available)
      // This ensures the same image is shown for all languages
      translated.image = category.image.en || 
                         category.image.ar || 
                         category.image.he ||
                         category.image[lang] ||
                         Object.values(category.image).find(val => typeof val === 'string' && val.trim() !== '') ||
                         '';
    } else {
      translated.image = String(category.image || '');
    }
  }
  
  // Translate subcategories
  if (Array.isArray(category.subCategories)) {
    translated.subCategories = category.subCategories.map(subCat => {
      const translatedSubCat = {
        ...subCat,
        name: getTranslatedField(subCat.name, lang)
      };
      
      // Ensure subcategory image is always a string (not a translation object)
      // Images should be the same for all languages, so always use the same image regardless of language
      if (subCat.image !== undefined) {
        if (typeof subCat.image === 'string') {
          translatedSubCat.image = subCat.image;
        } else if (typeof subCat.image === 'object' && subCat.image !== null) {
          // If it's a translation object, use English as default (or first available)
          // This ensures the same image is shown for all languages
          translatedSubCat.image = subCat.image.en || 
                                    subCat.image.ar || 
                                    subCat.image.he ||
                                    subCat.image[lang] ||
                                    Object.values(subCat.image).find(val => typeof val === 'string' && val.trim() !== '') ||
                                    '';
        } else {
          translatedSubCat.image = String(subCat.image || '');
        }
      }
      
      return translatedSubCat;
    });
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
  
  // Ensure image is always a string (not a translation object)
  // Images should be the same for all languages, so always use the same image regardless of language
  if (slide.image !== undefined) {
    if (typeof slide.image === 'string') {
      translated.image = slide.image;
    } else if (typeof slide.image === 'object' && slide.image !== null) {
      // If it's a translation object, use English as default (or first available)
      // This ensures the same image is shown for all languages
      translated.image = slide.image.en || 
                         slide.image.ar || 
                         slide.image.he ||
                         slide.image[lang] ||
                         Object.values(slide.image).find(val => typeof val === 'string' && val.trim() !== '') ||
                         '';
    } else {
      translated.image = String(slide.image || '');
    }
  }
  
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
  
  // Ensure image is always a string (not a translation object)
  // Images should be the same for all languages, so always use the same image regardless of language
  if (ad.image !== undefined) {
    if (typeof ad.image === 'string') {
      translated.image = ad.image;
    } else if (typeof ad.image === 'object' && ad.image !== null) {
      // If it's a translation object, use English as default (or first available)
      // This ensures the same image is shown for all languages
      translated.image = ad.image.en || 
                         ad.image.ar || 
                         ad.image.he ||
                         ad.image[lang] ||
                         Object.values(ad.image).find(val => typeof val === 'string' && val.trim() !== '') ||
                         '';
    } else {
      translated.image = String(ad.image || '');
    }
  }
  
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

