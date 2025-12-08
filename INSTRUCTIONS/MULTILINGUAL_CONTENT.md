# Multilingual Content Management

Guide for handling translations of dynamic content like products, categories, and other database-stored content.

## Overview

Unlike static UI text (handled by translation files), dynamic content like product names, descriptions, and categories are stored in the database and need a different approach.

## Approaches

### Approach 1: Nested Object Structure (Recommended)

Store translations as nested objects in the database.

**Product Structure:**
```json
{
  "id": "product123",
  "name": {
    "en": "Loose Ring Snaffle",
    "ar": "لجام حلقة فضفاضة",
    "he": "רסן טבעת רופפת"
  },
  "description": {
    "en": "High-quality stainless steel bit...",
    "ar": "بت فولاذ مقاوم للصدأ عالي الجودة...",
    "he": "ביט פלדת אל חלד איכותית..."
  },
  "category": {
    "en": "Bridles & Bits",
    "ar": "اللجم والبت",
    "he": "רסנים וביטים"
  },
  "price": 29.00,
  "available": true
}
```

### Approach 2: Language-Specific Fields

Use separate fields for each language.

**Product Structure:**
```json
{
  "id": "product123",
  "name_en": "Loose Ring Snaffle",
  "name_ar": "لجام حلقة فضفاضة",
  "name_he": "רסן טבעת רופפת",
  "description_en": "High-quality...",
  "description_ar": "عالية الجودة...",
  "description_he": "איכותית...",
  "price": 29.00
}
```

**Note:** Approach 1 is recommended as it's cleaner and easier to maintain.

## Implementation

### Step 1: Create Translation Helper Function

Create a utility function to get translated content:

**File: `client/src/utils/getTranslatedContent.js`**

```jsx
/**
 * Gets translated content from a multilingual object
 * @param {object|string} content - Content object with language keys or plain string
 * @param {string} language - Current language code (en, ar, he)
 * @param {string} fallback - Fallback language (default: 'en')
 * @returns {string} Translated content or original if not an object
 */
export function getTranslatedContent(content, language = 'en', fallback = 'en') {
  // If content is a string, return as-is (backward compatibility)
  if (typeof content === 'string') {
    return content;
  }
  
  // If content is an object with language keys
  if (content && typeof content === 'object') {
    // Try current language first
    if (content[language]) {
      return content[language];
    }
    // Fallback to default language
    if (content[fallback]) {
      return content[fallback];
    }
    // Fallback to first available language
    const firstLang = Object.keys(content)[0];
    if (firstLang) {
      return content[firstLang];
    }
  }
  
  // Return empty string if no content found
  return '';
}
```

### Step 2: Create React Hook for Easy Access

**File: `client/src/hooks/useTranslatedContent.js`**

```jsx
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";

/**
 * Hook to get translated content from multilingual objects
 * @param {object|string} content - Content object or string
 * @returns {string} Translated content
 */
export function useTranslatedContent(content) {
  const { language } = useLanguage();
  return getTranslatedContent(content, language);
}
```

### Step 3: Update Components to Use Translations

**Example: Product Card Component**

```jsx
import { useTranslatedContent } from "../hooks/useTranslatedContent";

function ProductCard({ product }) {
  const name = useTranslatedContent(product.name);
  const description = useTranslatedContent(product.description);
  const category = useTranslatedContent(product.category);
  
  return (
    <div>
      <h3>{name}</h3>
      <p>{category}</p>
      <p>{description}</p>
    </div>
  );
}
```

**Or using the utility directly:**

```jsx
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";

function ProductCard({ product }) {
  const { language } = useLanguage();
  const name = getTranslatedContent(product.name, language);
  const description = getTranslatedContent(product.description, language);
  
  return (
    <div>
      <h3>{name}</h3>
      <p>{description}</p>
    </div>
  );
}
```

### Step 4: Update Admin Forms

**Example: Product Form with Multilingual Fields**

```jsx
import { useLanguage } from "../context/LanguageContext";

function ProductForm({ product, onChange }) {
  const { language } = useLanguage();
  const [translations, setTranslations] = useState({
    name: product?.name || { en: "", ar: "", he: "" },
    description: product?.description || { en: "", ar: "", he: "" },
    category: product?.category || { en: "", ar: "", he: "" }
  });
  
  const updateTranslation = (field, lang, value) => {
    setTranslations(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value
      }
    }));
  };
  
  return (
    <div>
      {/* Name Field */}
      <div>
        <label>Product Name</label>
        <div className="language-tabs">
          <button 
            className={language === 'en' ? 'active' : ''}
            onClick={() => setCurrentLang('en')}
          >
            English
          </button>
          <button 
            className={language === 'ar' ? 'active' : ''}
            onClick={() => setCurrentLang('ar')}
          >
            العربية
          </button>
          <button 
            className={language === 'he' ? 'active' : ''}
            onClick={() => setCurrentLang('he')}
          >
            עברית
          </button>
        </div>
        <input
          value={translations.name[currentLang] || ""}
          onChange={(e) => updateTranslation('name', currentLang, e.target.value)}
          placeholder={`Enter name in ${currentLang.toUpperCase()}`}
        />
      </div>
      
      {/* Description Field */}
      <div>
        <label>Description</label>
        <textarea
          value={translations.description[currentLang] || ""}
          onChange={(e) => updateTranslation('description', currentLang, e.target.value)}
          placeholder={`Enter description in ${currentLang.toUpperCase()}`}
        />
      </div>
      
      {/* Save translations */}
      <button onClick={() => onChange({ ...product, ...translations })}>
        Save
      </button>
    </div>
  );
}
```

## Database Schema Updates

### Products Collection

Update product documents to support multilingual fields:

```javascript
// When creating/updating a product
const productData = {
  name: {
    en: "Loose Ring Snaffle",
    ar: "لجام حلقة فضفاضة",
    he: "רסן טבעת רופפת"
  },
  description: {
    en: "High-quality stainless steel bit...",
    ar: "بت فولاذ مقاوم للصدأ عالي الجودة...",
    he: "ביט פלדת אל חלד איכותית..."
  },
  category: {
    en: "Bridles & Bits",
    ar: "اللجم والبت",
    he: "רסנים וביטים"
  },
  // Non-translatable fields remain the same
  price: 29.00,
  available: true,
  sale: false,
  // ... other fields
};
```

### Categories Collection

```javascript
const categoryData = {
  name: {
    en: "Bridles & Bits",
    ar: "اللجم والبت",
    he: "רסנים וביטים"
  },
  description: {
    en: "Quality bridles and bits...",
    ar: "لجم وبت عالية الجودة...",
    he: "רסנים וביטים איכותיים..."
  },
  image: "https://...",
  // ... other fields
};
```

## Migration Strategy

### Option 1: Gradual Migration (Recommended)

1. **Update utility functions** to handle both old (string) and new (object) formats
2. **Update admin forms** to support multilingual input
3. **Migrate existing data** gradually as products are edited
4. **Update display components** to use translation utilities

### Option 2: Bulk Migration

Create a migration script to convert all existing data:

```javascript
// Migration script (run once)
async function migrateProducts() {
  const products = await db.collection("products").get();
  
  const batch = db.batch();
  
  products.forEach(doc => {
    const data = doc.data();
    
    // Convert string fields to multilingual objects
    const updates = {};
    
    if (typeof data.name === 'string') {
      updates.name = { en: data.name, ar: "", he: "" };
    }
    
    if (typeof data.description === 'string') {
      updates.description = { en: data.description, ar: "", he: "" };
    }
    
    if (typeof data.category === 'string') {
      updates.category = { en: data.category, ar: "", he: "" };
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
    }
  });
  
  await batch.commit();
  console.log('Migration complete!');
}
```

## Best Practices

### 1. Always Provide Fallbacks

The `getTranslatedContent` function should:
- Try current language first
- Fallback to English
- Fallback to first available language
- Return empty string if nothing found

### 2. Validate Translations in Admin

When saving products, validate that at least English is provided:

```javascript
if (!product.name?.en || product.name.en.trim() === '') {
  throw new Error('Product name in English is required');
}
```

### 3. Search Considerations

For search functionality, you may want to:
- Index all language versions
- Search across all languages
- Return results in user's language

### 4. URL Slugs

If using URL slugs, consider:
- Using English slugs (most common)
- Or language-specific slugs with routing

## Example: Complete Product Display

```jsx
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedContent } from "../utils/getTranslatedContent";

function ProductDetail({ product }) {
  const { language } = useLanguage();
  
  // Get translated content
  const name = getTranslatedContent(product.name, language);
  const description = getTranslatedContent(product.description, language);
  const category = getTranslatedContent(product.category, language);
  const technicalDetails = getTranslatedContent(product.technicalDetails, language);
  const additionalDetails = getTranslatedContent(product.additionalDetails, language);
  
  return (
    <div>
      <h1>{name}</h1>
      <p className="category">{category}</p>
      <p className="description">{description}</p>
      {technicalDetails && (
        <div>
          <h3>Technical Details</h3>
          <p>{technicalDetails}</p>
        </div>
      )}
      {additionalDetails && (
        <div>
          <h3>Additional Details</h3>
          <p>{additionalDetails}</p>
        </div>
      )}
    </div>
  );
}
```

## Fields That Should Be Multilingual

### Products
- ✅ `name` - Product name
- ✅ `description` - Product description
- ✅ `category` - Category name
- ✅ `subCategory` - Sub-category name
- ✅ `technicalDetails` - Technical specifications
- ✅ `additionalDetails` - Additional information
- ✅ `warranty` - Warranty information
- ✅ `shippingInfo` - Shipping information
- ❌ `price` - Numbers don't need translation
- ❌ `sku` - SKU codes are universal
- ❌ `image` - Image URLs are universal
- ❌ `available` - Boolean values

### Categories
- ✅ `name` - Category name
- ✅ `description` - Category description
- ❌ `image` - Image URLs

### Brands
- ✅ `name` - Brand name
- ✅ `description` - Brand description

## Testing

1. **Create a product** with translations in all languages
2. **Switch languages** and verify content changes
3. **Test fallbacks** by removing a translation
4. **Verify admin forms** save correctly
5. **Check search** works across languages

## Related Documentation

- [How to Add Translations](./TRANSLATIONS.md) - Static UI translations
- [Language System](./LANGUAGE_SYSTEM.md) - Language context system
- [Quick Reference](./QUICK_REFERENCE.md) - Quick lookup guide

---

*Last updated: 2025*





