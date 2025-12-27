/**
 * Firestore Database Backup Script
 * 
 * This script creates a complete backup of your Firestore database
 * before running migrations or making major changes.
 * 
 * Usage:
 *   node scripts/backup-firestore.mjs
 *   node scripts/backup-firestore.mjs --output backups/backup-2024-01-15.json
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
import('../server/lib/firebaseAdmin.js').then(async (module) => {
  const { db } = module;
  
  // Get output path from command line or use default
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output') || args.indexOf('-o');
  const outputPath = outputIndex !== -1 && args[outputIndex + 1]
    ? resolve(args[outputIndex + 1])
    : resolve(__dirname, '../backups', `backup-${new Date().toISOString().split('T')[0]}.json`);

  // Ensure backup directory exists
  const backupDir = dirname(outputPath);
  if (!existsSync(backupDir)) {
    mkdir(backupDir, { recursive: true }).catch(console.error);
  }

  console.log('🔄 Starting Firestore backup...');
  console.log(`📁 Output: ${outputPath}\n`);

  backupFirestore(db, outputPath)
    .then(() => {
      console.log('\n✅ Backup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup failed:', error);
      process.exit(1);
    });
});

async function backupFirestore(db, outputPath) {
  const backup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };

  // List all collections
  const collections = await db.listCollections();
  console.log(`📚 Found ${collections.length} collections:\n`);

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    console.log(`  📦 Backing up: ${collectionName}...`);

    try {
      const snapshot = await collectionRef.get();
      const documents = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          data: sanitizeData(data) // Convert Firestore types to JSON-serializable
        });
      });

      backup.collections[collectionName] = documents;
      console.log(`     ✓ ${documents.length} documents backed up`);
    } catch (error) {
      console.error(`     ❌ Error backing up ${collectionName}:`, error.message);
      backup.collections[collectionName] = { error: error.message };
    }
  }

  // Write backup to file
  await writeFile(outputPath, JSON.stringify(backup, null, 2), 'utf8');
  
  // Calculate backup size
  const stats = await import('fs').then(fs => fs.promises.stat(outputPath));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n💾 Backup file size: ${sizeMB} MB`);
  console.log(`📊 Total collections: ${Object.keys(backup.collections).length}`);
  
  // Count total documents
  const totalDocs = Object.values(backup.collections).reduce((sum, docs) => {
    return sum + (Array.isArray(docs) ? docs.length : 0);
  }, 0);
  console.log(`📄 Total documents: ${totalDocs}`);
}

/**
 * Convert Firestore data types to JSON-serializable format
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Firestore Timestamp
  if (data.constructor && data.constructor.name === 'Timestamp') {
    return {
      _firestore_timestamp: true,
      seconds: data.seconds,
      nanoseconds: data.nanoseconds
    };
  }

  // Handle Date objects
  if (data instanceof Date) {
    return {
      _firestore_date: true,
      iso: data.toISOString()
    };
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }

  // Primitive types (string, number, boolean)
  return data;
}

