/**
 * Extract and Translate Script
 * 
 * This script extracts products and categories from backup,
 * translates them, and creates a translated JSON file ready for import.
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the backup file
const backupPath = resolve(__dirname, '../backups/backup-2025-12-27.json');
const backupData = JSON.parse(await readFile(backupPath, 'utf8'));

// Extract products and categories
const products = backupData.collections.products || [];
const categories = backupData.collections.categories || [];

console.log(`Found ${products.length} products and ${categories.length} categories`);

// Function to translate text (using a simple approach - you can replace with actual translation API)
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return '';
  }
  
  // This is a placeholder - in reality you'd use Google Translate API or ChatGPT
  // For now, we'll create the structure and you can fill in translations
  return text; // Placeholder - returns original text
}

// Process products
const translatedProducts = [];
for (const product of products) {
  const data = product.data;
  const translated = { ...data };
  
  // Fields to translate
  const fields = ['name', 'description', 'technicalDetails', 'additionalDetails', 'warranty', 'shippingInfo'];
  
  for (const field of fields) {
    if (data[field]) {
      if (typeof data[field] === 'string') {
        // Convert string to translation object
        translated[field] = {
          en: data[field],
          ar: '', // To be filled
          he: ''  // To be filled
        };
      } else if (typeof data[field] === 'object' && data[field] !== null) {
        // Already a translation object - ensure all languages exist
        translated[field] = {
          en: data[field].en || '',
          ar: data[field].ar || '',
          he: data[field].he || ''
        };
      }
    }
  }
  
  translatedProducts.push({
    id: product.id,
    data: translated
  });
}

// Process categories
const translatedCategories = [];
for (const category of categories) {
  const data = category.data;
  const translated = { ...data };
  
  // Translate name
  if (data.name) {
    if (typeof data.name === 'string') {
      translated.name = {
        en: data.name,
        ar: '',
        he: ''
      };
    } else if (typeof data.name === 'object' && data.name !== null) {
      translated.name = {
        en: data.name.en || '',
        ar: data.name.ar || '',
        he: data.name.he || ''
      };
    }
  }
  
  // Translate description
  if (data.description) {
    if (typeof data.description === 'string') {
      translated.description = {
        en: data.description,
        ar: '',
        he: ''
      };
    } else if (typeof data.description === 'object' && data.description !== null) {
      translated.description = {
        en: data.description.en || '',
        ar: data.description.ar || '',
        he: data.description.he || ''
      };
    }
  }
  
  // Translate subcategories
  if (Array.isArray(data.subCategories)) {
    translated.subCategories = data.subCategories.map(subCat => {
      if (subCat.name) {
        if (typeof subCat.name === 'string') {
          return {
            ...subCat,
            name: {
              en: subCat.name,
              ar: '',
              he: ''
            }
          };
        } else if (typeof subCat.name === 'object' && subCat.name !== null) {
          return {
            ...subCat,
            name: {
              en: subCat.name.en || '',
              ar: subCat.name.ar || '',
              he: subCat.name.he || ''
            }
          };
        }
      }
      return subCat;
    });
  }
  
  translatedCategories.push({
    id: category.id,
    data: translated
  });
}

// Create output structure
const output = {
  products: translatedProducts,
  categories: translatedCategories
};

// Write to file
const outputPath = resolve(__dirname, '../backups/extracted-for-translation.json');
await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Extracted data written to: ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`1. Send this file to ChatGPT for translation`);
console.log(`2. Use the import script to update your database`);

