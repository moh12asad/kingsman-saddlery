/**
 * Translation Script: Auto-translate English content to Arabic and Hebrew
 * 
 * This script translates fields in products and categories collections
 * that have English (en) but are missing Arabic (ar) or Hebrew (he) translations.
 * 
 * ⚠️  WARNING: This will modify your database!
 * 
 * Prerequisites:
 *   1. Install @google-cloud/translate: npm install @google-cloud/translate
 *   2. Set up Google Cloud credentials (see README)
 *   3. Enable Cloud Translation API in Google Cloud Console
 * 
 * Usage:
 *   node scripts/translate-fields.mjs
 *   node scripts/translate-fields.mjs --dry-run
 *   node scripts/translate-fields.mjs --collection products
 *   node scripts/translate-fields.mjs --skip-ar  # Skip Arabic translation
 *   node scripts/translate-fields.mjs --skip-he  # Skip Hebrew translation
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if @google-cloud/translate is installed
let translate;
try {
  const translateModule = await import('@google-cloud/translate');
  translate = translateModule.v2.Translate;
} catch (err) {
  console.error('❌ @google-cloud/translate package not found!');
  console.error('   Please install it: npm install @google-cloud/translate');
  console.error('   Or use: cd server && npm install @google-cloud/translate');
  process.exit(1);
}

// Initialize Firebase Admin
import('../server/lib/firebaseAdmin.js').then(async (module) => {
  const { db } = module;
  
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('--dryrun');
  const skipAr = args.includes('--skip-ar');
  const skipHe = args.includes('--skip-he');
  const collectionArg = args.find(arg => arg.startsWith('--collection='));
  const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;
  
  // Initialize Google Translate
  let translateClient;
  try {
    translateClient = new translate();
    console.log('✓ Google Translate API initialized\n');
  } catch (err) {
    console.error('❌ Failed to initialize Google Translate API:', err.message);
    console.error('   Make sure you have:');
    console.error('   1. Set up Google Cloud credentials (GOOGLE_APPLICATION_CREDENTIALS)');
    console.error('   2. Enabled Cloud Translation API in Google Cloud Console');
    console.error('   3. Installed @google-cloud/translate package');
    process.exit(1);
  }
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  WARNING: This will modify your database!');
    console.log('   Make sure you have a backup before proceeding.\n');
  }

  console.log('🌐 Starting translation process...\n');
  console.log(`   Languages to translate: ${skipAr ? '' : 'Arabic '}${skipHe ? '' : 'Hebrew'}\n`);

  try {
    // Translate products
    if (!targetCollection || targetCollection === 'products') {
      await translateProducts(db, translateClient, isDryRun, skipAr, skipHe);
    }

    // Translate categories
    if (!targetCollection || targetCollection === 'categories') {
      await translateCategories(db, translateClient, isDryRun, skipAr, skipHe);
    }

    console.log('\n✅ Translation completed successfully!');
    if (isDryRun) {
      console.log('   Run without --dry-run to apply changes.');
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Translation failed:', error);
    process.exit(1);
  }
});

/**
 * Translate a text using Google Translate API
 */
async function translateText(text, targetLang, translateClient) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return '';
  }

  try {
    const [translation] = await translateClient.translate(text, targetLang);
    return translation;
  } catch (error) {
    console.error(`   ⚠️  Translation error (${targetLang}):`, error.message);
    return ''; // Return empty string on error
  }
}

/**
 * Translate products collection
 */
async function translateProducts(db, translateClient, isDryRun, skipAr, skipHe) {
  console.log('📦 Translating products...');
  
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log('   No products found.');
    return;
  }

  let translated = 0;
  let skipped = 0;
  let errors = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;
  const totalDocs = snapshot.docs.length;
  let processed = 0;

  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const updates = {};
    let hasUpdates = false;

    // Fields to translate
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
        // Check if it's a translation object
        if (typeof data[field] === 'object' && data[field] !== null && 
            !Array.isArray(data[field])) {
          const fieldData = data[field];
          const fieldUpdates = { ...fieldData };
          let fieldChanged = false;

          // Check if English exists
          const enText = fieldData.en || '';
          
          if (enText && enText.trim() !== '') {
            // Translate to Arabic if missing
            if (!skipAr && (!fieldData.ar || fieldData.ar.trim() === '')) {
              console.log(`   [${processed}/${totalDocs}] Translating ${doc.id}.${field} → Arabic...`);
              const arText = await translateText(enText, 'ar', translateClient);
              if (arText) {
                fieldUpdates.ar = arText;
                fieldChanged = true;
              }
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Translate to Hebrew if missing
            if (!skipHe && (!fieldData.he || fieldData.he.trim() === '')) {
              console.log(`   [${processed}/${totalDocs}] Translating ${doc.id}.${field} → Hebrew...`);
              const heText = await translateText(enText, 'he', translateClient);
              if (heText) {
                fieldUpdates.he = heText;
                fieldChanged = true;
              }
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          if (fieldChanged) {
            updates[field] = fieldUpdates;
            hasUpdates = true;
          }
        }
      }
    }

    // Handle specifications
    if (data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications)) {
      const specUpdates = { ...data.specifications };
      let hasSpecUpdates = false;

      for (const [key, value] of Object.entries(data.specifications)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const specFieldData = value;
          const specFieldUpdates = { ...specFieldData };
          let specFieldChanged = false;

          const enText = specFieldData.en || '';
          
          if (enText && enText.trim() !== '') {
            if (!skipAr && (!specFieldData.ar || specFieldData.ar.trim() === '')) {
              const arText = await translateText(enText, 'ar', translateClient);
              if (arText) {
                specFieldUpdates.ar = arText;
                specFieldChanged = true;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!skipHe && (!specFieldData.he || specFieldData.he.trim() === '')) {
              const heText = await translateText(enText, 'he', translateClient);
              if (heText) {
                specFieldUpdates.he = heText;
                specFieldChanged = true;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          if (specFieldChanged) {
            specUpdates[key] = specFieldUpdates;
            hasSpecUpdates = true;
          }
        }
      }

      if (hasSpecUpdates) {
        updates.specifications = specUpdates;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      if (!isDryRun) {
        const docRef = productsRef.doc(doc.id);
        batch.update(docRef, updates);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`   ✓ Committed batch of ${batchCount} products`);
          batch = db.batch();
          batchCount = 0;
        }
      }
      translated++;
    } else {
      skipped++;
    }
  }

  // Commit remaining updates
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ Committed final batch of ${batchCount} products`);
  }

  console.log(`   ✅ Products: ${translated} translated, ${skipped} already complete, ${errors} errors`);
}

/**
 * Translate categories collection
 */
async function translateCategories(db, translateClient, isDryRun, skipAr, skipHe) {
  console.log('📁 Translating categories...');
  
  const categoriesRef = db.collection('categories');
  const snapshot = await categoriesRef.get();
  
  if (snapshot.empty) {
    console.log('   No categories found.');
    return;
  }

  let translated = 0;
  let skipped = 0;
  let errors = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;
  const totalDocs = snapshot.docs.length;
  let processed = 0;

  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const updates = {};
    let hasUpdates = false;

    // Translate name
    if (data.name && typeof data.name === 'object' && data.name !== null) {
      const nameData = data.name;
      const nameUpdates = { ...nameData };
      let nameChanged = false;

      const enText = nameData.en || '';
      
      if (enText && enText.trim() !== '') {
        if (!skipAr && (!nameData.ar || nameData.ar.trim() === '')) {
          console.log(`   [${processed}/${totalDocs}] Translating category ${doc.id}.name → Arabic...`);
          const arText = await translateText(enText, 'ar', translateClient);
          if (arText) {
            nameUpdates.ar = arText;
            nameChanged = true;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!skipHe && (!nameData.he || nameData.he.trim() === '')) {
          console.log(`   [${processed}/${totalDocs}] Translating category ${doc.id}.name → Hebrew...`);
          const heText = await translateText(enText, 'he', translateClient);
          if (heText) {
            nameUpdates.he = heText;
            nameChanged = true;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (nameChanged) {
        updates.name = nameUpdates;
        hasUpdates = true;
      }
    }

    // Translate description
    if (data.description && typeof data.description === 'object' && data.description !== null) {
      const descData = data.description;
      const descUpdates = { ...descData };
      let descChanged = false;

      const enText = descData.en || '';
      
      if (enText && enText.trim() !== '') {
        if (!skipAr && (!descData.ar || descData.ar.trim() === '')) {
          console.log(`   [${processed}/${totalDocs}] Translating category ${doc.id}.description → Arabic...`);
          const arText = await translateText(enText, 'ar', translateClient);
          if (arText) {
            descUpdates.ar = arText;
            descChanged = true;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!skipHe && (!descData.he || descData.he.trim() === '')) {
          console.log(`   [${processed}/${totalDocs}] Translating category ${doc.id}.description → Hebrew...`);
          const heText = await translateText(enText, 'he', translateClient);
          if (heText) {
            descUpdates.he = heText;
            descChanged = true;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (descChanged) {
        updates.description = descUpdates;
        hasUpdates = true;
      }
    }

    // Translate subcategories
    if (Array.isArray(data.subCategories)) {
      const updatedSubCats = [];
      let subCatsChanged = false;

      for (const subCat of data.subCategories) {
        if (subCat.name && typeof subCat.name === 'object' && subCat.name !== null) {
          const subNameData = subCat.name;
          const subNameUpdates = { ...subNameData };
          let subNameChanged = false;

          const enText = subNameData.en || '';
          
          if (enText && enText.trim() !== '') {
            if (!skipAr && (!subNameData.ar || subNameData.ar.trim() === '')) {
              const arText = await translateText(enText, 'ar', translateClient);
              if (arText) {
                subNameUpdates.ar = arText;
                subNameChanged = true;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!skipHe && (!subNameData.he || subNameData.he.trim() === '')) {
              const heText = await translateText(enText, 'he', translateClient);
              if (heText) {
                subNameUpdates.he = heText;
                subNameChanged = true;
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          if (subNameChanged) {
            updatedSubCats.push({
              ...subCat,
              name: subNameUpdates
            });
            subCatsChanged = true;
          } else {
            updatedSubCats.push(subCat);
          }
        } else {
          updatedSubCats.push(subCat);
        }
      }

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
          console.log(`   ✓ Committed batch of ${batchCount} categories`);
          batch = db.batch();
          batchCount = 0;
        }
      }
      translated++;
    } else {
      skipped++;
    }
  }

  // Commit remaining updates
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ Committed final batch of ${batchCount} categories`);
  }

  console.log(`   ✅ Categories: ${translated} translated, ${skipped} already complete, ${errors} errors`);
}

