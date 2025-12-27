/**
 * Prepare Data for ChatGPT Translation
 * 
 * Extracts only the fields that need translation (missing Arabic or Hebrew)
 * and formats them in a clean structure for ChatGPT
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backupPath = resolve(__dirname, '../backups/backup-2025-12-27.json');
console.log('📖 Reading backup file...');
const backupData = JSON.parse(await readFile(backupPath, 'utf8'));

const products = backupData.collections.products || [];
const categories = backupData.collections.categories || [];

console.log(`Found ${products.length} products and ${categories.length} categories\n`);

// Helper to check if translation is needed
function needsTranslation(field) {
  if (!field) return false;
  if (typeof field === 'string') return field.trim() !== '';
  if (typeof field === 'object' && field !== null) {
    const en = field.en || '';
    const ar = field.ar || '';
    const he = field.he || '';
    // Needs translation if English exists but Arabic or Hebrew is missing
    return en.trim() !== '' && (ar.trim() === '' || he.trim() === '');
  }
  return false;
}

// Helper to get English text
function getEnglishText(field) {
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) return field.en || '';
  return '';
}

// Extract products that need translation
const productsToTranslate = [];
for (const product of products) {
  const data = product.data;
  const needs = {
    id: product.id,
    name: getEnglishText(data.name),
    fields: {}
  };
  let hasNeeds = false;

  const fields = ['name', 'description', 'technicalDetails', 'additionalDetails', 'warranty', 'shippingInfo'];
  
  for (const field of fields) {
    if (needsTranslation(data[field])) {
      needs.fields[field] = getEnglishText(data[field]);
      hasNeeds = true;
    }
  }

  // Check specifications
  if (data.specifications && typeof data.specifications === 'object' && !Array.isArray(data.specifications)) {
    const specNeeds = {};
    for (const [key, value] of Object.entries(data.specifications)) {
      if (needsTranslation(value)) {
        specNeeds[key] = getEnglishText(value);
        hasNeeds = true;
      }
    }
    if (Object.keys(specNeeds).length > 0) {
      needs.fields.specifications = specNeeds;
    }
  }

  if (hasNeeds) {
    productsToTranslate.push(needs);
  }
}

// Extract categories that need translation
const categoriesToTranslate = [];
for (const category of categories) {
  const data = category.data;
  const needs = {
    id: category.id,
    name: getEnglishText(data.name),
    fields: {}
  };
  let hasNeeds = false;

  if (needsTranslation(data.name)) {
    needs.fields.name = getEnglishText(data.name);
    hasNeeds = true;
  }

  if (needsTranslation(data.description)) {
    needs.fields.description = getEnglishText(data.description);
    hasNeeds = true;
  }

  // Check subcategories
  if (Array.isArray(data.subCategories)) {
    const subCatNeeds = [];
    for (const subCat of data.subCategories) {
      if (needsTranslation(subCat.name)) {
        subCatNeeds.push({
          name: getEnglishText(subCat.name)
        });
        hasNeeds = true;
      }
    }
    if (subCatNeeds.length > 0) {
      needs.fields.subCategories = subCatNeeds;
    }
  }

  if (hasNeeds) {
    categoriesToTranslate.push(needs);
  }
}

// Create clean structure for ChatGPT
const forTranslation = {
  products: productsToTranslate,
  categories: categoriesToTranslate
};

// Write to file
const outputPath = resolve(__dirname, '../backups/for-chatgpt-translation.json');
await writeFile(outputPath, JSON.stringify(forTranslation, null, 2), 'utf8');

console.log(`✅ Extracted ${productsToTranslate.length} products needing translation`);
console.log(`✅ Extracted ${categoriesToTranslate.length} categories needing translation`);
console.log(`\n📄 Output written to: ${outputPath}`);
console.log(`\n📋 Next steps:`);
console.log(`1. Open the file: ${outputPath}`);
console.log(`2. Copy the JSON content`);
console.log(`3. Send it to ChatGPT with the translation prompt`);
console.log(`4. Use the import script to update your database`);

