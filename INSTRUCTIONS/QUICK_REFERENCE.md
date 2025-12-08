# Quick Reference Guide

Quick lookup for common tasks and patterns.

## Adding New Text with Translation

### 1. Add to Translation Files

**English** (`client/src/translations/en.json`):
```json
{
  "section": {
    "key": "English text"
  }
}
```

**Arabic** (`client/src/translations/ar.json`):
```json
{
  "section": {
    "key": "النص العربي"
  }
}
```

**Hebrew** (`client/src/translations/he.json`):
```json
{
  "section": {
    "key": "טקסט בעברית"
  }
}
```

### 2. Use in Component

```jsx
import { useLanguage } from "../context/LanguageContext";

function MyComponent() {
  const { t } = useLanguage();
  return <div>{t("section.key")}</div>;
}
```

## Common Translation Keys

### Buttons & Actions
- `common.save` - Save
- `common.cancel` - Cancel
- `common.delete` - Delete
- `common.edit` - Edit
- `common.add` - Add
- `common.close` - Close
- `common.submit` - Submit
- `common.back` - Back
- `common.next` - Next
- `common.previous` - Previous

### Product
- `product.addToCart` - Add to Cart
- `product.buyNow` - Buy Now
- `product.addToFavorites` - Add to Favorites
- `product.description` - Description
- `product.technicalDetails` - Technical Details
- `product.additionalDetails` - Additional Details

### Cart
- `cart.yourCart` - Your Cart
- `cart.continueShopping` - Continue Shopping
- `cart.proceedToCheckout` - Proceed to Checkout
- `cart.total` - Total

### Admin
- `admin.createProduct` - Create Product
- `admin.editProduct` - Edit Product
- `admin.deleteProduct` - Delete Product
- `admin.available` - Available
- `admin.unavailable` - Unavailable
- `admin.onSale` - On Sale

## File Locations

```
client/src/
  ├── translations/
  │   ├── en.json (English)
  │   ├── ar.json (Arabic)
  │   └── he.json (Hebrew)
  ├── context/
  │   └── LanguageContext.jsx
  └── components/
      └── LanguageSelector.jsx
```

## Language Codes

- `en` - English (LTR)
- `ar` - Arabic (RTL)
- `he` - Hebrew (RTL)

## Common Patterns

### Button with Translation
```jsx
<button>{t("common.save")}</button>
```

### Heading with Translation
```jsx
<h1>{t("section.title")}</h1>
```

### Conditional Translation
```jsx
{isLoading ? t("common.loading") : t("common.done")}
```

### RTL-Aware Component
```jsx
const { t, isRTL } = useLanguage();
<div dir={isRTL ? "rtl" : "ltr"}>
  {t("section.text")}
</div>
```

## Translation Sections

| Section | Purpose |
|---------|---------|
| `common` | Shared UI elements |
| `navbar` | Navigation bar |
| `footer` | Footer content |
| `shop` | Shop page |
| `product` | Product pages |
| `cart` | Shopping cart |
| `admin` | Admin panel |
| `home` | Home page |

## Checklist for New Translations

- [ ] Added key to `en.json`
- [ ] Added key to `ar.json`
- [ ] Added key to `he.json`
- [ ] Used `t()` function in component
- [ ] Tested in all three languages
- [ ] Verified RTL layout (for Arabic/Hebrew)

## Multilingual Content (Products, Categories)

### Using Translated Content

```jsx
import { useTranslatedContent } from "../hooks/useTranslatedContent";

function ProductCard({ product }) {
  const name = useTranslatedContent(product.name);
  const description = useTranslatedContent(product.description);
  
  return (
    <div>
      <h3>{name}</h3>
      <p>{description}</p>
    </div>
  );
}
```

### Database Structure

```json
{
  "name": {
    "en": "Product Name",
    "ar": "اسم المنتج",
    "he": "שם המוצר"
  },
  "description": {
    "en": "Description...",
    "ar": "الوصف...",
    "he": "תיאור..."
  }
}
```

**See [MULTILINGUAL_CONTENT.md](./MULTILINGUAL_CONTENT.md) for complete guide.**

## Need Help?

- **Static UI Text**: See [TRANSLATIONS.md](./TRANSLATIONS.md)
- **Dynamic Content**: See [MULTILINGUAL_CONTENT.md](./MULTILINGUAL_CONTENT.md)
- **System Documentation**: See [LANGUAGE_SYSTEM.md](./LANGUAGE_SYSTEM.md)
- **Feature Template**: See [TEMPLATE.md](./TEMPLATE.md)

---

*Quick reference - for detailed instructions, see other documentation files.*

