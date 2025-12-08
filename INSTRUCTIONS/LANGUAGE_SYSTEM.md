# Language System Documentation

Complete documentation of the multi-language system implementation.

## Architecture

### Components

1. **LanguageContext** (`client/src/context/LanguageContext.jsx`)
   - Manages language state
   - Provides translation function `t()`
   - Handles RTL/LTR direction
   - Persists language preference

2. **LanguageSelector** (`client/src/components/LanguageSelector.jsx`)
   - UI component for language switching
   - Displays: AR | ENG | HE

3. **Translation Files** (`client/src/translations/`)
   - `en.json` - English translations
   - `ar.json` - Arabic translations
   - `he.json` - Hebrew translations

## Supported Languages

| Language | Code | Direction | Native Name |
|----------|------|-----------|-------------|
| English  | `en` | LTR       | English     |
| Arabic   | `ar` | RTL       | العربية     |
| Hebrew   | `he` | RTL       | עברית       |

## Language Detection

The system detects language in this order:

1. **LocalStorage** - Previously selected language
2. **Browser Language** - Detected from `navigator.language`
3. **Default** - Falls back to English (`en`)

## RTL Support

### Automatic Handling

When Arabic or Hebrew is selected:
- HTML `dir` attribute is set to `rtl`
- Document direction is updated
- CSS RTL classes are applied

### CSS Classes

```css
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="ltr"] {
  direction: ltr;
  text-align: left;
}
```

## Translation Function

### Basic Usage

```jsx
const { t } = useLanguage();
const text = t("section.key");
```

### Nested Keys

```jsx
// Translation structure:
{
  "product": {
    "details": {
      "title": "Product Details"
    }
  }
}

// Usage:
t("product.details.title")
```

### Parameters (Future)

For dynamic content, use placeholders:

```json
{
  "welcome": {
    "message": "Welcome, {{name}}!"
  }
}
```

```jsx
t("welcome.message", { name: "John" })
```

## Language Context API

### Hook: `useLanguage()`

Returns:
```typescript
{
  language: string;        // Current language code (en/ar/he)
  setLanguage: (lang: string) => void;  // Change language
  t: (key: string, params?: object) => string;  // Translation function
  isRTL: boolean;          // Is current language RTL?
  isLoading: boolean;      // Are translations loading?
}
```

### Example

```jsx
import { useLanguage } from "../context/LanguageContext";

function MyComponent() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  
  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <h1>{t("welcome.title")}</h1>
      <p>Current language: {language}</p>
      <button onClick={() => setLanguage("ar")}>
        Switch to Arabic
      </button>
    </div>
  );
}
```

## Language Selector Component

### Usage

```jsx
import LanguageSelector from "../components/LanguageSelector";

function Navbar() {
  return (
    <nav>
      <LanguageSelector />
      {/* Other nav items */}
    </nav>
  );
}
```

### Display Format

The selector displays languages horizontally:
```
AR | ENG | HE
```

Active language is highlighted.

## Translation File Structure

### Recommended Organization

```json
{
  "common": {
    "actions": "Common UI actions"
  },
  "navbar": {
    "navigation": "Navigation elements"
  },
  "product": {
    "productPages": "Product-related text"
  },
  "cart": {
    "shoppingCart": "Cart functionality"
  },
  "admin": {
    "adminPanel": "Admin interface"
  },
  "footer": {
    "footerContent": "Footer sections"
  }
}
```

## Adding New Languages

To add a new language:

1. **Add to SUPPORTED_LANGUAGES:**
```jsx
// In LanguageContext.jsx
export const SUPPORTED_LANGUAGES = {
  en: { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  he: { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl" },
  // Add new language:
  fr: { code: "fr", name: "French", nativeName: "Français", dir: "ltr" }
};
```

2. **Create Translation File:**
```
client/src/translations/fr.json
```

3. **Add Translations:**
Copy structure from `en.json` and translate all values.

## Performance Considerations

- Translations are loaded dynamically when language changes
- Loading state is managed to prevent flickering
- Translations are cached in component state
- No re-renders on language change unless components use `useLanguage()`

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- RTL support requires CSS3 support
- LocalStorage required for language persistence

## Troubleshooting

### Language Not Changing

1. Check `localStorage.getItem("language")`
2. Verify language code matches `SUPPORTED_LANGUAGES`
3. Check browser console for errors

### RTL Not Working

1. Verify `dir` attribute on HTML element
2. Check CSS for RTL rules
3. Ensure language code is correct (`ar` or `he`)

### Missing Translations

1. Check translation file exists
2. Verify key exists in all language files
3. Check key path is correct (use dot notation)

## Best Practices

1. **Always add to all three languages** - Don't leave translations missing
2. **Use descriptive keys** - Make keys self-documenting
3. **Organize by feature** - Group related translations
4. **Reuse common translations** - Check `common` section first
5. **Test all languages** - Verify RTL layout works correctly

## Related Documentation

- [How to Add Translations](./TRANSLATIONS.md) - Step-by-step guide
- [Feature Template](./TEMPLATE.md) - Documenting new features

---

*Last updated: 2025*





