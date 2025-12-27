/**
 * Firestore Database Restore Script
 * 
 * This script restores a Firestore database from a backup file.
 * 
 * ⚠️  WARNING: This will overwrite existing data!
 * 
 * Usage:
 *   node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json
 *   node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json --dry-run
 */

import { Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
import('../server/lib/firebaseAdmin.js').then(async (module) => {
  const { db } = module;
  
  // Get backup path from command line
  const args = process.argv.slice(2);
  const backupIndex = args.indexOf('--backup') || args.indexOf('-b');
  const isDryRun = args.includes('--dry-run') || args.includes('--dryrun');
  
  if (backupIndex === -1 || !args[backupIndex + 1]) {
    console.error('❌ Please provide a backup file:');
    console.error('   node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json');
    process.exit(1);
  }

  const backupPath = resolve(args[backupIndex + 1]);

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('⚠️  WARNING: This will overwrite existing data!');
    const confirmed = await askConfirmation('Are you sure you want to proceed? (yes/no): ');
    if (!confirmed) {
      console.log('❌ Restore cancelled');
      process.exit(0);
    }
  }

  console.log(`\n🔄 Starting Firestore restore...`);
  console.log(`📁 Backup file: ${backupPath}\n`);

  restoreFirestore(db, backupPath, isDryRun)
    .then(() => {
      console.log('\n✅ Restore completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Restore failed:', error);
      process.exit(1);
    });
});

async function restoreFirestore(db, backupPath, isDryRun) {
  // Read backup file
  const backupContent = await readFile(backupPath, 'utf8');
  const backup = JSON.parse(backupContent);

  console.log(`📅 Backup timestamp: ${backup.timestamp}`);
  console.log(`📚 Collections to restore: ${Object.keys(backup.collections).length}\n`);

  for (const [collectionName, documents] of Object.entries(backup.collections)) {
    if (documents.error) {
      console.log(`  ⚠️  Skipping ${collectionName}: ${documents.error}`);
      continue;
    }

    console.log(`  📦 Restoring: ${collectionName}...`);

    if (isDryRun) {
      console.log(`     🔍 Would restore ${documents.length} documents`);
      continue;
    }

    const collectionRef = db.collection(collectionName);
    const batch = db.batch();
    let count = 0;

    for (const doc of documents) {
      const docRef = collectionRef.doc(doc.id);
      const data = desanitizeData(doc.data);
      batch.set(docRef, data, { merge: false });
      count++;

      // Firestore batches are limited to 500 operations
      if (count >= 500) {
        await batch.commit();
        console.log(`     ✓ Restored batch of ${count} documents`);
        count = 0;
      }
    }

    // Commit remaining documents
    if (count > 0) {
      await batch.commit();
      console.log(`     ✓ Restored final batch of ${count} documents`);
    }

    console.log(`     ✅ ${documents.length} documents restored`);
  }
}

/**
 * Convert JSON-serialized data back to Firestore types
 */
function desanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Firestore Timestamp
  if (data._firestore_timestamp) {
    return Timestamp.fromMillis(
      data.seconds * 1000 + data.nanoseconds / 1000000
    );
  }

  // Handle Date objects
  if (data._firestore_date) {
    return new Date(data.iso);
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => desanitizeData(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const desanitized = {};
    for (const [key, value] of Object.entries(data)) {
      desanitized[key] = desanitizeData(value);
    }
    return desanitized;
  }

  // Primitive types
  return data;
}

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

