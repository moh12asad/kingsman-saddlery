# How to Add Translations

This guide explains how to add new text with multi-language support (English, Arabic, Hebrew) to the application.

## Overview

The application supports three languages:
- **English (en)** - Default language
- **Arabic (ar)** - Right-to-left (RTL)
- **Hebrew (he)** - Right-to-left (RTL)

All translations are stored in JSON files located in `client/src/translations/`.

## Step-by-Step Guide

### Step 1: Add Translation Keys

Open the translation files and add your new keys:

**File: `client/src/translations/en.json`**
```json
{
  "sectionName": {
    "yourKey": "Your English text here"
  }
}
```

**File: `client/src/translations/ar.json`**
```json
{
  "sectionName": {
    "yourKey": "النص العربي هنا"
  }
}
```

**File: `client/src/translations/he.json`**
```json
{
  "sectionName": {
    "yourKey": "הטקסט בעברית כאן"
  }
}
```

### Step 2: Use Translation in Component

1. **Import the hook:**
```jsx
import { useLanguage } from "../context/LanguageContext";
```

2. **Get the translation function:**
```jsx
const { t } = useLanguage();
```

3. **Use translations in your JSX:**
```jsx
<h1>{t("sectionName.yourKey")}</h1>
<button>{t("common.save")}</button>
```

### Step 3: Translation Key Structure

Organize translations by feature/section:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  },
  "product": {
    "addToCart": "Add to Cart",
    "buyNow": "Buy Now"
  },
  "admin": {
    "createProduct": "Create Product",
    "editProduct": "Edit Product"
  }
}
```

## Examples

### Example 1: Simple Text

**Translation Files:**
```json
// en.json
{
  "welcome": {
    "title": "Welcome to Kingsman Saddlery"
  }
}

// ar.json
{
  "welcome": {
    "title": "مرحباً بك في كينغزمان سادلري"
  }
}

// he.json
{
  "welcome": {
    "title": "ברוכים הבאים לקינגסמן סדלרי"
  }
}
```

**Component:**
```jsx
import { useLanguage } from "../context/LanguageContext";

function WelcomePage() {
  const { t } = useLanguage();
  
  return <h1>{t("welcome.title")}</h1>;
}
```

### Example 2: Button with Translation

**Translation Files:**
```json
{
  "product": {
    "addToFavorites": "Add to Favorites"
  }
}
```

**Component:**
```jsx
import { useLanguage } from "../context/LanguageContext";

function ProductCard() {
  const { t } = useLanguage();
  
  return (
    <button>
      {t("product.addToFavorites")}
    </button>
  );
}
```

### Example 3: Using Existing Common Translations

If a translation already exists in the `common` section, reuse it:

```jsx
// Instead of creating new keys, use existing ones:
<button>{t("common.save")}</button>
<button>{t("common.cancel")}</button>
<button>{t("common.delete")}</button>
<button>{t("common.edit")}</button>
```

## Best Practices

### 1. **Reuse Common Translations**
Check `common` section first before creating new keys:
- `common.save`, `common.cancel`, `common.delete`, `common.edit`
- `common.loading`, `common.error`, `common.back`, `common.next`

### 2. **Organize by Feature**
Group related translations together:
- `product.*` - Product-related text
- `cart.*` - Shopping cart text
- `admin.*` - Admin panel text
- `footer.*` - Footer content

### 3. **Use Descriptive Keys**
```json
// ✅ Good
"product.addToCart": "Add to Cart"
"product.buyNow": "Buy Now"

// ❌ Bad
"btn1": "Add to Cart"
"btn2": "Buy Now"
```

### 4. **Keep Keys Consistent**
Use the same key structure across all three language files.

### 5. **Handle Missing Translations**
The translation system will fallback to the key name if a translation is missing. Always add translations to all three files.

## Common Translation Sections

### Available Sections

- **`common`** - Common UI elements (buttons, labels, messages)
- **`navbar`** - Navigation bar content
- **`footer`** - Footer content
- **`shop`** - Shop page content
- **`product`** - Product pages
- **`cart`** - Shopping cart
- **`admin`** - Admin panel
- **`home`** - Home page

## RTL Support

Arabic and Hebrew are automatically handled as RTL languages. The `LanguageContext` automatically:
- Sets `dir="rtl"` on the HTML element
- Updates document direction
- Applies RTL CSS classes

No additional code needed - just add the translations!

## Testing Translations

1. Switch languages using the language selector (AR | ENG | HE) in the navbar
2. Verify all text changes correctly
3. Check RTL layout for Arabic and Hebrew
4. Ensure no text is missing (fallback to key name indicates missing translation)

## Troubleshooting

### Translation Not Showing
- Check that the key exists in all three language files
- Verify the key path is correct: `t("section.key")`
- Check browser console for errors

### Text Shows as Key Name
- Translation key is missing in the current language file
- Add the translation to the appropriate language file

### RTL Not Working
- Ensure language code is `ar` or `he` in `LanguageContext`
- Check that `SUPPORTED_LANGUAGES` includes the language with `dir: "rtl"`

## Quick Reference

**Translation Files Location:**
```
client/src/translations/
  ├── en.json (English)
  ├── ar.json (Arabic)
  └── he.json (Hebrew)
```

**Context Location:**
```
client/src/context/LanguageContext.jsx
```

**Usage Pattern:**
```jsx
import { useLanguage } from "../context/LanguageContext";

function MyComponent() {
  const { t } = useLanguage();
  return <div>{t("section.key")}</div>;
}
```

---

*For questions or issues, refer to the main README or contact the development team.*





