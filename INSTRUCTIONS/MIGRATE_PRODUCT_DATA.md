# Migrating Product Data to Multilingual Format

This guide explains how to update existing product data in the database to support multiple languages.

## Current Situation

Your products are likely stored like this (old format):
```json
{
  "name": "Loose Ring Snaffle",
  "description": "High-quality stainless steel bit...",
  "category": "Bridles & Bits"
}
```

## Target Format

Products should be stored like this (new format):
```json
{
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
  }
}
```

## Option 1: Update via Admin Panel (Recommended for Few Products)

1. Go to Admin Panel → Products
2. Click "Edit" on a product
3. Update the form to include translations (when admin form is updated)
4. Save the product

**Note:** The admin form needs to be updated first to support multilingual input. See [MULTILINGUAL_CONTENT.md](./MULTILINGUAL_CONTENT.md) for implementation.

## Option 2: Update via Firebase Console

1. Go to Firebase Console → Firestore Database
2. Navigate to `products` collection
3. Open a product document
4. Update fields manually:

**For each translatable field:**
- Change from: `"name": "Product Name"`
- Change to: 
  ```json
  "name": {
    "en": "Product Name",
    "ar": "اسم المنتج",
    "he": "שם המוצר"
  }
  ```

**Fields to update:**
- `name`
- `description`
- `category`
- `subCategory`
- `technicalDetails`
- `additionalDetails`
- `warranty`
- `shippingInfo`

## Option 3: Migration Script (For Many Products)

Create a script to convert all products at once:

**File: `server/scripts/migrate-products.js`**

```javascript
import admin from "firebase-admin";
import serviceAccount from "../firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateProducts() {
  console.log("Starting product migration...");
  
  const productsRef = db.collection("products");
  const snapshot = await productsRef.get();
  
  let migrated = 0;
  let skipped = 0;
  
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500; // Firestore batch limit
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};
    let hasUpdates = false;
    
    // Convert name
    if (typeof data.name === 'string' && data.name.trim() !== '') {
      updates.name = {
        en: data.name,
        ar: "", // Add Arabic translation manually
        he: ""  // Add Hebrew translation manually
      };
      hasUpdates = true;
    }
    
    // Convert description
    if (typeof data.description === 'string' && data.description.trim() !== '') {
      updates.description = {
        en: data.description,
        ar: "", // Add Arabic translation manually
        he: ""  // Add Hebrew translation manually
      };
      hasUpdates = true;
    }
    
    // Convert category
    if (typeof data.category === 'string' && data.category.trim() !== '') {
      updates.category = {
        en: data.category,
        ar: "", // Add Arabic translation manually
        he: ""  // Add Hebrew translation manually
      };
      hasUpdates = true;
    }
    
    // Convert subCategory
    if (typeof data.subCategory === 'string' && data.subCategory.trim() !== '') {
      updates.subCategory = {
        en: data.subCategory,
        ar: "",
        he: ""
      };
      hasUpdates = true;
    }
    
    // Convert technicalDetails
    if (typeof data.technicalDetails === 'string' && data.technicalDetails.trim() !== '') {
      updates.technicalDetails = {
        en: data.technicalDetails,
        ar: "",
        he: ""
      };
      hasUpdates = true;
    }
    
    // Convert additionalDetails
    if (typeof data.additionalDetails === 'string' && data.additionalDetails.trim() !== '') {
      updates.additionalDetails = {
        en: data.additionalDetails,
        ar: "",
        he: ""
      };
      hasUpdates = true;
    }
    
    // Convert warranty
    if (typeof data.warranty === 'string' && data.warranty.trim() !== '') {
      updates.warranty = {
        en: data.warranty,
        ar: "",
        he: ""
      };
      hasUpdates = true;
    }
    
    // Convert shippingInfo
    if (typeof data.shippingInfo === 'string' && data.shippingInfo.trim() !== '') {
      updates.shippingInfo = {
        en: data.shippingInfo,
        ar: "",
        he: ""
      };
      hasUpdates = true;
    }
    
    if (hasUpdates) {
      batch.update(doc.ref, updates);
      batchCount++;
      migrated++;
      
      // Commit batch if it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`Migrated ${migrated} products...`);
        batchCount = 0;
      }
    } else {
      skipped++;
    }
  }
  
  // Commit remaining updates
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`\nMigration complete!`);
  console.log(`Migrated: ${migrated} products`);
  console.log(`Skipped: ${skipped} products (already in new format or empty)`);
  console.log(`\nNote: Arabic and Hebrew translations are empty. Add them manually via admin panel.`);
}

migrateProducts()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
```

**Run the script:**
```bash
cd server
node scripts/migrate-products.js
```

## Option 4: Update One Product for Testing

To test the translation system, update one product manually:

1. **Via Firebase Console:**
   - Open Firestore → `products` collection
   - Select a product
   - Update `name` field:
     ```json
     {
       "en": "Loose Ring Snaffle",
       "ar": "لجام حلقة فضفاضة",
       "he": "רסן טבעת רופפת"
     }
     ```
   - Update `description`, `category`, etc. similarly
   - Save

2. **Test the product page:**
   - Switch languages using AR | ENG | HE
   - Verify the product name/description changes

## Important Notes

### Backward Compatibility

The system supports both formats:
- **Old format (string):** `"name": "Product Name"` - Will display as-is
- **New format (object):** `"name": { "en": "...", "ar": "...", "he": "..." }` - Will display based on selected language

### Gradual Migration

You can migrate products gradually:
1. Start with a few products
2. Test translations work correctly
3. Continue migrating remaining products
4. Add translations as you go

### Adding Translations

After migrating to the new format:
1. Products will show English by default
2. Add Arabic and Hebrew translations via admin panel (when updated)
3. Or manually via Firebase Console

## Testing

After updating a product:

1. **Switch to Arabic (AR):**
   - Product name should show Arabic text
   - If empty, falls back to English

2. **Switch to Hebrew (HE):**
   - Product name should show Hebrew text
   - If empty, falls back to English

3. **Switch to English (ENG):**
   - Product name should show English text

## Troubleshooting

### Product Still Shows English in Arabic/Hebrew

**Cause:** Product data is still in old format (string)

**Solution:** Update product data to multilingual format

### Product Shows Empty

**Cause:** Translation for current language is missing

**Solution:** Add translation for that language, or it will fallback to English

### Component Not Updating

**Cause:** Component not using `useTranslatedContent` hook

**Solution:** Verify component uses the hook (already updated in ProductDetail.jsx)

## Next Steps

1. ✅ Component updated to use translations
2. ⏳ Update admin form to support multilingual input
3. ⏳ Migrate existing product data
4. ⏳ Add translations for products

See [MULTILINGUAL_CONTENT.md](./MULTILINGUAL_CONTENT.md) for complete implementation guide.

---

*Last updated: 2025*





