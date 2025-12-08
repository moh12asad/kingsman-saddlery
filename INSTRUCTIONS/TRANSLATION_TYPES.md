# Translation Types Overview

Understanding the difference between static UI translations and dynamic content translations.

## Two Types of Translations

### 1. Static UI Translations (Translation Files)

**What:** UI elements, buttons, labels, messages that don't change based on data.

**Where:** Stored in JSON files (`client/src/translations/`)

**Examples:**
- Button labels: "Save", "Cancel", "Delete"
- Page titles: "My Favorites", "Shopping Cart"
- Messages: "Loading...", "No products found"
- Navigation: "Shop", "About", "Contact"

**How to Use:**
```jsx
import { useLanguage } from "../context/LanguageContext";

function MyComponent() {
  const { t } = useLanguage();
  return <button>{t("common.save")}</button>;
}
```

**Documentation:** See [TRANSLATIONS.md](./TRANSLATIONS.md)

---

### 2. Dynamic Content Translations (Database)

**What:** Content that comes from the database: product names, descriptions, categories, etc.

**Where:** Stored in Firestore database as multilingual objects

**Examples:**
- Product names: "Loose Ring Snaffle"
- Product descriptions: "High-quality stainless steel..."
- Category names: "Bridles & Bits"
- Brand names: "Kingsman"

**How to Use:**
```jsx
import { useTranslatedContent } from "../hooks/useTranslatedContent";

function ProductCard({ product }) {
  const name = useTranslatedContent(product.name);
  return <h3>{name}</h3>;
}
```

**Documentation:** See [MULTILINGUAL_CONTENT.md](./MULTILINGUAL_CONTENT.md)

---

## Quick Decision Guide

**Use Static Translations (JSON files) when:**
- ✅ Text is part of the UI/interface
- ✅ Text doesn't come from database
- ✅ Text is the same across all instances
- ✅ Examples: "Add to Cart", "Sign In", "Loading..."

**Use Dynamic Translations (Database) when:**
- ✅ Content is user/admin created
- ✅ Content comes from database
- ✅ Content varies per item
- ✅ Examples: Product names, descriptions, category names

## Examples

### Example 1: Product Page

```jsx
import { useLanguage } from "../context/LanguageContext";
import { useTranslatedContent } from "../hooks/useTranslatedContent";

function ProductPage({ product }) {
  const { t } = useLanguage(); // For static UI
  const name = useTranslatedContent(product.name); // For dynamic content
  const description = useTranslatedContent(product.description); // For dynamic content
  
  return (
    <div>
      {/* Static UI translation */}
      <h1>{t("product.description")}</h1>
      
      {/* Dynamic content translation */}
      <h2>{name}</h2>
      <p>{description}</p>
      
      {/* Static UI translation */}
      <button>{t("product.addToCart")}</button>
    </div>
  );
}
```

### Example 2: Category List

```jsx
import { useLanguage } from "../context/LanguageContext";
import { useTranslatedContent } from "../hooks/useTranslatedContent";

function CategoryList({ categories }) {
  const { t } = useLanguage();
  
  return (
    <div>
      {/* Static UI translation */}
      <h2>{t("shop.shopByCategory")}</h2>
      
      {/* Dynamic content translations */}
      {categories.map(category => {
        const name = useTranslatedContent(category.name);
        return <div key={category.id}>{name}</div>;
      })}
    </div>
  );
}
```

## Migration Path

### Current State
- Products have single-language fields: `name`, `description`, `category`
- These are stored as strings in the database

### Target State
- Products have multilingual fields: `name: { en, ar, he }`
- Utility functions handle both old and new formats (backward compatible)

### Steps
1. ✅ Utility functions created (backward compatible)
2. ⏳ Update admin forms to support multilingual input
3. ⏳ Migrate existing data (gradual or bulk)
4. ⏳ Update display components to use utilities

## Summary Table

| Aspect | Static UI | Dynamic Content |
|--------|-----------|----------------|
| **Storage** | JSON files | Database |
| **Location** | `translations/*.json` | Firestore collections |
| **Hook** | `useLanguage()` → `t()` | `useTranslatedContent()` |
| **Example** | `t("common.save")` | `useTranslatedContent(product.name)` |
| **When to use** | UI elements | Database content |
| **Who manages** | Developers | Admins/Content creators |

## Related Documentation

- [Static UI Translations](./TRANSLATIONS.md) - How to add UI text translations
- [Dynamic Content Translations](./MULTILINGUAL_CONTENT.md) - How to handle product/category translations
- [Language System](./LANGUAGE_SYSTEM.md) - Complete system architecture
- [Quick Reference](./QUICK_REFERENCE.md) - Quick lookup guide

---

*Last updated: 2025*





