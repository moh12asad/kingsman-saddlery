/**
 * Migration Script: Convert existing database content to translation format
 * 
 * This script converts existing single-language fields to translation objects
 * with format: { en: "...", ar: "...", he: "..." }
 * 
 * ⚠️  WARNING: This will modify your database!
 * 
 * Usage:
 *   node scripts/migrate-translations.mjs
 *   node scripts/migrate-translations.mjs --dry-run
 *   node scripts/migrate-translations.mjs --collection products
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
// Import from server directory where firebase-admin is installed
import('../server/lib/firebaseAdmin.js').then(async (module) => {
  const { db } = module;
  
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const collectionArg = args.find(arg => arg.startsWith('--collection='));
  const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  WARNING: This will modify your database!');
    console.log('   Make sure you have a backup before proceeding.\n');
  }

  console.log('🔄 Starting translation migration...\n');

  try {
    // Migrate products
    if (!targetCollection || targetCollection === 'products') {
      await migrateProducts(db, isDryRun);
    }

    // Migrate categories
    if (!targetCollection || targetCollection === 'categories') {
      await migrateCategories(db, isDryRun);
    }

    console.log('\n✅ Migration completed successfully!');
    if (isDryRun) {
      console.log('   Run without --dry-run to apply changes.');
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
});

/**
 * Convert string value to translation object
 */
function stringToTranslationObject(value) {
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
 * Migrate products collection
 */
async function migrateProducts(db, isDryRun) {
  console.log('📦 Migrating products...');
  
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log('   No products found.');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  // Use for...of loop instead of forEach to support async/await
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};
    let hasUpdates = false;

    // Fields to migrate
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
        // If it's already a translation object, skip
        if (typeof data[field] === 'object' && data[field] !== null && 
            !Array.isArray(data[field]) && 
            (data[field].en !== undefined || data[field].ar !== undefined || data[field].he !== undefined)) {
          continue; // Already migrated
        }
        
        // If it's a string, convert to translation object
        if (typeof data[field] === 'string') {
          updates[field] = stringToTranslationObject(data[field]);
          hasUpdates = true;
        }
      }
    }

    // Handle specifications
    if (data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications)) {
      const specUpdates = {};
      let hasSpecUpdates = false;

      for (const [key, value] of Object.entries(data.specifications)) {
        // Skip if already a translation object
        if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
            (value.en !== undefined || value.ar !== undefined || value.he !== undefined)) {
          continue;
        }
        
        // Convert string to translation object
        if (typeof value === 'string') {
          specUpdates[key] = stringToTranslationObject(value);
          hasSpecUpdates = true;
        }
      }

      if (hasSpecUpdates) {
        updates.specifications = { ...data.specifications, ...specUpdates };
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      if (!isDryRun) {
        const docRef = productsRef.doc(doc.id);
        batch.update(docRef, updates);
        batchCount++;
        
        // Firestore batches are limited to 500 operations
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✓ Migrated batch of ${batchCount} products`);
          batch = db.batch(); // Create new batch
          batchCount = 0;
        }
      }
      migrated++;
    } else {
      skipped++;
    }
  }

  // Commit remaining updates
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ Migrated final batch of ${batchCount} products`);
  }

  console.log(`   ✅ Products: ${migrated} migrated, ${skipped} already in correct format`);
}

/**
 * Migrate categories collection
 */
async function migrateCategories(db, isDryRun) {
  console.log('📁 Migrating categories...');
  
  const categoriesRef = db.collection('categories');
  const snapshot = await categoriesRef.get();
  
  if (snapshot.empty) {
    console.log('   No categories found.');
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  // Use for...of loop instead of forEach to support async/await
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};
    let hasUpdates = false;

    // Migrate name
    if (data.name !== undefined) {
      if (typeof data.name === 'string') {
        updates.name = stringToTranslationObject(data.name);
        hasUpdates = true;
      } else if (typeof data.name === 'object' && data.name !== null &&
                 !(data.name.en !== undefined || data.name.ar !== undefined || data.name.he !== undefined)) {
        // Not a translation object, skip
      }
    }

    // Migrate description
    if (data.description !== undefined) {
      if (typeof data.description === 'string') {
        updates.description = stringToTranslationObject(data.description);
        hasUpdates = true;
      }
    }

    // Migrate subcategories
    if (Array.isArray(data.subCategories)) {
      const updatedSubCats = data.subCategories.map(subCat => {
        if (subCat.name && typeof subCat.name === 'string') {
          return {
            ...subCat,
            name: stringToTranslationObject(subCat.name)
          };
        }
        return subCat;
      });
      
      // Check if any subcategories were updated
      const subCatsChanged = updatedSubCats.some((subCat, index) => {
        const original = data.subCategories[index];
        return original && original.name !== subCat.name;
      });
      
      if (subCatsChanged) {
        updates.subCategories = updatedSubCats;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      if (!isDryRun) {
        const docRef = categoriesRef.doc(doc.id);
        batch.update(docRef, updates);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✓ Migrated batch of ${batchCount} categories`);
          batch = db.batch(); // Create new batch
          batchCount = 0;
        }
      }
      migrated++;
    } else {
      skipped++;
    }
  }

  // Commit remaining updates
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ Migrated final batch of ${batchCount} categories`);
  }

  console.log(`   ✅ Categories: ${migrated} migrated, ${skipped} already in correct format`);
}

