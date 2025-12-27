# Database Scripts

This directory contains utility scripts for managing the Firestore database.

## Available Scripts

### Backup Script
Creates a complete backup of your Firestore database.

```bash
# Create backup with default name (backup-YYYY-MM-DD.json)
node scripts/backup-firestore.mjs

# Create backup with custom name
node scripts/backup-firestore.mjs --output backups/pre-migration-backup.json
```

**Output:** JSON file containing all collections and documents

### Restore Script
Restores the database from a backup file.

⚠️ **WARNING:** This will overwrite existing data!

```bash
# Dry run (see what would be restored, no changes made)
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json --dry-run

# Actual restore (requires confirmation)
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json
```

## Requirements

- Node.js installed
- Firebase Admin SDK configured
- Service account file: `server/firebase-service-account.json`
- Or environment variables set (see `server/lib/firebaseAdmin.js`)

## Backup File Location

Backups are saved to the `backups/` directory (created automatically if it doesn't exist).

**Note:** The `backups/` directory is in `.gitignore` - backups are not committed to version control.

### Migration Script
Converts existing database content to translation format.

⚠️ **WARNING:** This will modify your database!

```bash
# IMPORTANT: Run from server directory (where firebase-admin is installed)
cd server

# Dry run (see what would change, no modifications)
node ../scripts/migrate-translations.mjs --dry-run

# Actual migration
node ../scripts/migrate-translations.mjs

# Migrate only products
node ../scripts/migrate-translations.mjs --collection=products

# Migrate only categories
node ../scripts/migrate-translations.mjs --collection=categories
```

**Note:** The script must be run from the `server/` directory because `firebase-admin` is installed there.

## Before Migration

Always create a backup before running database migrations:

```bash
node scripts/backup-firestore.mjs --output backups/backup-before-translation-migration.json
```

For more details, see [DATABASE_BACKUP_GUIDE.md](../DATABASE_BACKUP_GUIDE.md)

