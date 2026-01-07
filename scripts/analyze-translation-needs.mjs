/**
 * Analysis Script: Count characters that need translation
 * 
 * This script analyzes your Firestore database to determine:
 * - How many characters need to be translated
 * - Which fields are missing translations
 * - Estimated cost for translation
 * 
 * Usage:
 *   node scripts/analyze-translation-needs.mjs
 *   node scripts/analyze-translation-needs.mjs --collection products
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
import('../server/lib/firebaseAdmin.js').then(async (module) => {
  const { db } = module;
  
  const args = process.argv.slice(2);
  const collectionArg = args.find(arg => arg.startsWith('--collection='));
  const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;
  
  console.log('📊 Analyzing translation needs...\n');

  try {
    const stats = {
      products: {
        totalDocs: 0,
        needsAr: 0,
        needsHe: 0,
        arChars: 0,
        heChars: 0,
        fields: {},
        productsNeedingTranslation: []
      },
      categories: {
        totalDocs: 0,
        needsAr: 0,
        needsHe: 0,
        arChars: 0,
        heChars: 0,
        fields: {},
        categoriesNeedingTranslation: []
      }
    };

    // Analyze products
    if (!targetCollection || targetCollection === 'products') {
      await analyzeProducts(db, stats.products);
    }

    // Analyze categories
    if (!targetCollection || targetCollection === 'categories') {
      await analyzeCategories(db, stats.categories);
    }

    // Print results
    printResults(stats);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
});

/**
 * Analyze products collection
 */
async function analyzeProducts(db, stats) {
  console.log('📦 Analyzing products...');
  
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  if (snapshot.empty) {
    console.log('   No products found.');
    return;
  }

  stats.totalDocs = snapshot.docs.length;
  stats.productsNeedingTranslation = [];

  const translatableFields = [
    'name',
    'description',
    'technicalDetails',
    'additionalDetails',
    'warranty',
    'shippingInfo'
  ];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsAr = false;
    let needsHe = false;
    let docArChars = 0;
    let docHeChars = 0;
    const missingFields = {
      ar: [],
      he: []
    };

    // Get product name for display
    const productName = typeof data.name === 'object' && data.name !== null 
      ? (data.name.en || data.name.ar || data.name.he || 'Unnamed Product')
      : (data.name || 'Unnamed Product');

    for (const field of translatableFields) {
      if (data[field] !== undefined) {
        if (typeof data[field] === 'object' && data[field] !== null && !Array.isArray(data[field])) {
          const fieldData = data[field];
          const enText = fieldData.en || '';
          const arText = fieldData.ar || '';
          const heText = fieldData.he || '';

          if (enText && enText.trim() !== '') {
            const enChars = enText.length;
            
            if (!arText || arText.trim() === '') {
              needsAr = true;
              docArChars += enChars;
              missingFields.ar.push({ field, chars: enChars });
              
              if (!stats.fields[field]) {
                stats.fields[field] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields[field].arChars += enChars;
              stats.fields[field].count++;
            }

            if (!heText || heText.trim() === '') {
              needsHe = true;
              docHeChars += enChars;
              missingFields.he.push({ field, chars: enChars });
              
              if (!stats.fields[field]) {
                stats.fields[field] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields[field].heChars += enChars;
            }
          }
        }
      }
    }

    // Handle specifications
    if (data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications)) {
      for (const [key, value] of Object.entries(data.specifications)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const specEnText = value.en || '';
          const specArText = value.ar || '';
          const specHeText = value.he || '';

          if (specEnText && specEnText.trim() !== '') {
            const specEnChars = specEnText.length;
            
            if (!specArText || specArText.trim() === '') {
              needsAr = true;
              docArChars += specEnChars;
              missingFields.ar.push({ field: `specifications.${key}`, chars: specEnChars });
              
              if (!stats.fields['specifications']) {
                stats.fields['specifications'] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields['specifications'].arChars += specEnChars;
              stats.fields['specifications'].count++;
            }

            if (!specHeText || specHeText.trim() === '') {
              needsHe = true;
              docHeChars += specEnChars;
              missingFields.he.push({ field: `specifications.${key}`, chars: specEnChars });
              
              if (!stats.fields['specifications']) {
                stats.fields['specifications'] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields['specifications'].heChars += specEnChars;
            }
          }
        }
      }
    }

    if (needsAr || needsHe) {
      stats.productsNeedingTranslation.push({
        id: doc.id,
        name: productName,
        arChars: docArChars,
        heChars: docHeChars,
        totalChars: docArChars + docHeChars,
        missingFields: missingFields
      });
    }

    if (needsAr) {
      stats.needsAr++;
      stats.arChars += docArChars;
    }

    if (needsHe) {
      stats.needsHe++;
      stats.heChars += docHeChars;
    }
  }

  console.log(`   ✓ Analyzed ${stats.totalDocs} products`);
}

/**
 * Analyze categories collection
 */
async function analyzeCategories(db, stats) {
  console.log('📁 Analyzing categories...');
  
  const categoriesRef = db.collection('categories');
  const snapshot = await categoriesRef.get();
  
  if (snapshot.empty) {
    console.log('   No categories found.');
    return;
  }

  stats.totalDocs = snapshot.docs.length;
  stats.categoriesNeedingTranslation = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsAr = false;
    let needsHe = false;
    let docArChars = 0;
    let docHeChars = 0;
    const missingFields = {
      ar: [],
      he: []
    };

    // Get category name for display
    const categoryName = typeof data.name === 'object' && data.name !== null 
      ? (data.name.en || data.name.ar || data.name.he || 'Unnamed Category')
      : (data.name || 'Unnamed Category');

    // Analyze name
    if (data.name && typeof data.name === 'object' && data.name !== null) {
      const nameEn = data.name.en || '';
      const nameAr = data.name.ar || '';
      const nameHe = data.name.he || '';

      if (nameEn && nameEn.trim() !== '') {
        const nameChars = nameEn.length;
        
        if (!nameAr || nameAr.trim() === '') {
          needsAr = true;
          docArChars += nameChars;
          missingFields.ar.push({ field: 'name', chars: nameChars });
          
          if (!stats.fields['name']) {
            stats.fields['name'] = { arChars: 0, heChars: 0, count: 0 };
          }
          stats.fields['name'].arChars += nameChars;
          stats.fields['name'].count++;
        }

        if (!nameHe || nameHe.trim() === '') {
          needsHe = true;
          docHeChars += nameChars;
          missingFields.he.push({ field: 'name', chars: nameChars });
          
          if (!stats.fields['name']) {
            stats.fields['name'] = { arChars: 0, heChars: 0, count: 0 };
          }
          stats.fields['name'].heChars += nameChars;
        }
      }
    }

    // Analyze description
    if (data.description && typeof data.description === 'object' && data.description !== null) {
      const descEn = data.description.en || '';
      const descAr = data.description.ar || '';
      const descHe = data.description.he || '';

      if (descEn && descEn.trim() !== '') {
        const descChars = descEn.length;
        
        if (!descAr || descAr.trim() === '') {
          needsAr = true;
          docArChars += descChars;
          missingFields.ar.push({ field: 'description', chars: descChars });
          
          if (!stats.fields['description']) {
            stats.fields['description'] = { arChars: 0, heChars: 0, count: 0 };
          }
          stats.fields['description'].arChars += descChars;
          stats.fields['description'].count++;
        }

        if (!descHe || descHe.trim() === '') {
          needsHe = true;
          docHeChars += descChars;
          missingFields.he.push({ field: 'description', chars: descChars });
          
          if (!stats.fields['description']) {
            stats.fields['description'] = { arChars: 0, heChars: 0, count: 0 };
          }
          stats.fields['description'].heChars += descChars;
        }
      }
    }

    // Analyze subcategories
    if (Array.isArray(data.subCategories)) {
      for (const subCat of data.subCategories) {
        if (subCat.name && typeof subCat.name === 'object' && subCat.name !== null) {
          const subNameEn = subCat.name.en || '';
          const subNameAr = subCat.name.ar || '';
          const subNameHe = subCat.name.he || '';

          if (subNameEn && subNameEn.trim() !== '') {
            const subNameChars = subNameEn.length;
            
            if (!subNameAr || subNameAr.trim() === '') {
              needsAr = true;
              docArChars += subNameChars;
              missingFields.ar.push({ field: 'subCategories.name', chars: subNameChars });
              
              if (!stats.fields['subCategories.name']) {
                stats.fields['subCategories.name'] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields['subCategories.name'].arChars += subNameChars;
              stats.fields['subCategories.name'].count++;
            }

            if (!subNameHe || subNameHe.trim() === '') {
              needsHe = true;
              docHeChars += subNameChars;
              missingFields.he.push({ field: 'subCategories.name', chars: subNameChars });
              
              if (!stats.fields['subCategories.name']) {
                stats.fields['subCategories.name'] = { arChars: 0, heChars: 0, count: 0 };
              }
              stats.fields['subCategories.name'].heChars += subNameChars;
            }
          }
        }
      }
    }

    if (needsAr || needsHe) {
      stats.categoriesNeedingTranslation.push({
        id: doc.id,
        name: categoryName,
        arChars: docArChars,
        heChars: docHeChars,
        totalChars: docArChars + docHeChars,
        missingFields: missingFields
      });
    }

    if (needsAr) {
      stats.needsAr++;
      stats.arChars += docArChars;
    }

    if (needsHe) {
      stats.needsHe++;
      stats.heChars += docHeChars;
    }
  }

  console.log(`   ✓ Analyzed ${stats.totalDocs} categories`);
}

/**
 * Print analysis results
 */
function printResults(stats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSLATION ANALYSIS RESULTS');
  console.log('='.repeat(60) + '\n');

  let totalArChars = 0;
  let totalHeChars = 0;
  let totalDocs = 0;

  // Products
  if (stats.products.totalDocs > 0) {
    console.log('📦 PRODUCTS:');
    console.log(`   Total products: ${stats.products.totalDocs}`);
    console.log(`   Need Arabic: ${stats.products.needsAr} products`);
    console.log(`   Need Hebrew: ${stats.products.needsHe} products`);
    console.log(`   Arabic characters: ${stats.products.arChars.toLocaleString()}`);
    console.log(`   Hebrew characters: ${stats.products.heChars.toLocaleString()}`);
    
    // Show individual products needing translation
    if (stats.products.productsNeedingTranslation && stats.products.productsNeedingTranslation.length > 0) {
      console.log('\n   📋 Products needing translation:');
      console.log('   ' + '-'.repeat(70));
      
      // Sort by total characters (descending)
      const sortedProducts = [...stats.products.productsNeedingTranslation].sort((a, b) => b.totalChars - a.totalChars);
      
      sortedProducts.forEach((product, index) => {
        console.log(`\n   ${index + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`      Total characters to translate: ${product.totalChars.toLocaleString()}`);
        
        if (product.arChars > 0) {
          console.log(`      Arabic: ${product.arChars.toLocaleString()} chars`);
          if (product.missingFields.ar.length > 0) {
            const fieldsList = product.missingFields.ar.map(f => `${f.field} (${f.chars} chars)`).join(', ');
            console.log(`        Missing in: ${fieldsList}`);
          }
        }
        
        if (product.heChars > 0) {
          console.log(`      Hebrew: ${product.heChars.toLocaleString()} chars`);
          if (product.missingFields.he.length > 0) {
            const fieldsList = product.missingFields.he.map(f => `${f.field} (${f.chars} chars)`).join(', ');
            console.log(`        Missing in: ${fieldsList}`);
          }
        }
      });
      
      console.log('\n   ' + '-'.repeat(70));
    }
    
    if (Object.keys(stats.products.fields).length > 0) {
      console.log('\n   📊 Summary by field:');
      for (const [field, fieldStats] of Object.entries(stats.products.fields)) {
        console.log(`     ${field}:`);
        console.log(`       Arabic: ${fieldStats.arChars.toLocaleString()} chars (${fieldStats.count} fields)`);
        console.log(`       Hebrew: ${fieldStats.heChars.toLocaleString()} chars`);
      }
    }
    
    totalArChars += stats.products.arChars;
    totalHeChars += stats.products.heChars;
    totalDocs += stats.products.totalDocs;
    console.log('');
  }

  // Categories
  if (stats.categories.totalDocs > 0) {
    console.log('📁 CATEGORIES:');
    console.log(`   Total categories: ${stats.categories.totalDocs}`);
    console.log(`   Need Arabic: ${stats.categories.needsAr} categories`);
    console.log(`   Need Hebrew: ${stats.categories.needsHe} categories`);
    console.log(`   Arabic characters: ${stats.categories.arChars.toLocaleString()}`);
    console.log(`   Hebrew characters: ${stats.categories.heChars.toLocaleString()}`);
    
    // Show individual categories needing translation
    if (stats.categories.categoriesNeedingTranslation && stats.categories.categoriesNeedingTranslation.length > 0) {
      console.log('\n   📋 Categories needing translation:');
      console.log('   ' + '-'.repeat(70));
      
      // Sort by total characters (descending)
      const sortedCategories = [...stats.categories.categoriesNeedingTranslation].sort((a, b) => b.totalChars - a.totalChars);
      
      sortedCategories.forEach((category, index) => {
        console.log(`\n   ${index + 1}. ${category.name} (ID: ${category.id})`);
        console.log(`      Total characters to translate: ${category.totalChars.toLocaleString()}`);
        
        if (category.arChars > 0) {
          console.log(`      Arabic: ${category.arChars.toLocaleString()} chars`);
          if (category.missingFields.ar.length > 0) {
            const fieldsList = category.missingFields.ar.map(f => `${f.field} (${f.chars} chars)`).join(', ');
            console.log(`        Missing in: ${fieldsList}`);
          }
        }
        
        if (category.heChars > 0) {
          console.log(`      Hebrew: ${category.heChars.toLocaleString()} chars`);
          if (category.missingFields.he.length > 0) {
            const fieldsList = category.missingFields.he.map(f => `${f.field} (${f.chars} chars)`).join(', ');
            console.log(`        Missing in: ${fieldsList}`);
          }
        }
      });
      
      console.log('\n   ' + '-'.repeat(70));
    }
    
    if (Object.keys(stats.categories.fields).length > 0) {
      console.log('\n   📊 Summary by field:');
      for (const [field, fieldStats] of Object.entries(stats.categories.fields)) {
        console.log(`     ${field}:`);
        console.log(`       Arabic: ${fieldStats.arChars.toLocaleString()} chars (${fieldStats.count} fields)`);
        console.log(`       Hebrew: ${fieldStats.heChars.toLocaleString()} chars`);
      }
    }
    
    totalArChars += stats.categories.arChars;
    totalHeChars += stats.categories.heChars;
    totalDocs += stats.categories.totalDocs;
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`   Total documents: ${totalDocs}`);
  console.log(`   Total Arabic characters needed: ${totalArChars.toLocaleString()}`);
  console.log(`   Total Hebrew characters needed: ${totalHeChars.toLocaleString()}`);
  console.log(`   Total characters to translate: ${(totalArChars + totalHeChars).toLocaleString()}`);
  console.log('');

  // Cost estimation
  const totalChars = totalArChars + totalHeChars;
  const freeTier = 500000; // 500k chars per month
  const costPerMillion = 20; // $20 per million characters

  console.log('💰 COST ESTIMATION:');
  console.log('='.repeat(60));
  
  if (totalChars <= freeTier) {
    console.log(`   ✅ Within FREE tier (${freeTier.toLocaleString()} chars/month)`);
    console.log(`   Cost: $0.00`);
    console.log(`   Remaining free tier: ${(freeTier - totalChars).toLocaleString()} characters`);
  } else {
    const paidChars = totalChars - freeTier;
    const cost = (paidChars / 1000000) * costPerMillion;
    console.log(`   ⚠️  Exceeds free tier`);
    console.log(`   Free tier covers: ${freeTier.toLocaleString()} characters`);
    console.log(`   Paid characters: ${paidChars.toLocaleString()}`);
    console.log(`   Estimated cost: $${cost.toFixed(2)}`);
  }
  
  console.log('');
  console.log('💡 TIP: Google Translate API pricing:');
  console.log(`   - Free tier: ${freeTier.toLocaleString()} characters/month`);
  console.log(`   - Paid: $${costPerMillion} per 1 million characters`);
  console.log('');
}

