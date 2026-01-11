# Firestore Database Backup Guide

This guide explains how to create and restore backups of your Firestore database before running migrations or making major changes.

## Quick Start

### Create a Backup

```bash
# From project root
node scripts/backup-firestore.mjs

# Or specify custom output path
node scripts/backup-firestore.mjs --output backups/my-backup.json
```

### Restore from Backup

```bash
# Dry run (see what would be restored)
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json --dry-run

# Actual restore (requires confirmation)
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json
```

---

## Backup Methods

### Method 1: Using the Backup Script (Recommended)

**Pros:**
- ✅ Easy to use
- ✅ Complete backup of all collections
- ✅ Preserves Firestore data types (Timestamps, etc.)
- ✅ JSON format (human-readable)
- ✅ Can be version controlled (if needed)

**Steps:**

1. **Ensure you have the service account file:**
   - The script uses `server/firebase-service-account.json`
   - Or set environment variables (see `server/lib/firebaseAdmin.js`)

2. **Run the backup script:**
   ```bash
   cd /path/to/kingsman-saddlery
   node scripts/backup-firestore.mjs
   ```

3. **Backup will be saved to:**
   - Default: `backups/backup-YYYY-MM-DD.json`
   - Or custom path if specified with `--output`

4. **Verify the backup:**
   - Check the file size (should be > 0)
   - Open and verify it contains your collections
   - Check the timestamp in the backup file

**Example Output:**
```
🔄 Starting Firestore backup...
📁 Output: /path/to/backups/backup-2024-01-15.json

📚 Found 6 collections:

  📦 Backing up: products...
     ✓ 45 documents backed up
  📦 Backing up: categories...
     ✓ 12 documents backed up
  📦 Backing up: orders...
     ✓ 128 documents backed up
  📦 Backing up: users...
     ✓ 23 documents backed up
  📦 Backing up: settings...
     ✓ 1 documents backed up
  📦 Backing up: contact_submissions...
     ✓ 8 documents backed up

💾 Backup file size: 2.34 MB
📊 Total collections: 6
📄 Total documents: 217

✅ Backup completed successfully!
```

---

### Method 2: Firebase Console (Manual)

**Pros:**
- ✅ No code required
- ✅ Visual interface

**Cons:**
- ❌ Manual process
- ❌ Limited to exporting one collection at a time
- ❌ Doesn't preserve all Firestore types perfectly

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. For each collection:
   - Click on the collection
   - Click the three dots menu (⋮)
   - Select "Export collection"
   - Choose format (JSON or CSV)
   - Download the file

**Note:** This method is tedious for multiple collections and doesn't create a single backup file.

---

### Method 3: Google Cloud Console (gcloud CLI)

**Pros:**
- ✅ Official Google tool
- ✅ Can schedule automated backups
- ✅ Supports incremental backups

**Cons:**
- ❌ Requires gcloud CLI setup
- ❌ More complex configuration

**Steps:**

1. **Install gcloud CLI:**
   ```bash
   # Windows (using WSL or PowerShell)
   # Download from: https://cloud.google.com/sdk/docs/install
   
   # Or using package manager
   # Follow: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Export Firestore:**
   ```bash
   gcloud firestore export gs://YOUR_BUCKET_NAME/backup-$(date +%Y%m%d)
   ```

4. **Import Firestore (if needed):**
   ```bash
   gcloud firestore import gs://YOUR_BUCKET_NAME/backup-20240115
   ```

**Note:** This requires a Google Cloud Storage bucket. This is the most robust method for production environments.

---

## Backup File Structure

The backup script creates a JSON file with this structure:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "collections": {
    "products": [
      {
        "id": "product123",
        "data": {
          "name": "Saddle",
          "price": 299.99,
          "createdAt": {
            "_firestore_timestamp": true,
            "seconds": 1705312200,
            "nanoseconds": 0
          }
        }
      }
    ],
    "categories": [
      {
        "id": "cat456",
        "data": {
          "name": "Saddles",
          "description": "Premium saddles"
        }
      }
    ]
  }
}
```

---

## Restore Process

### Before Restoring

⚠️ **WARNING:** Restoring will overwrite existing data!

1. **Always test on a development database first**
2. **Create a new backup before restoring** (in case you need to rollback)
3. **Use dry-run mode first** to see what will be restored

### Restore Steps

1. **Dry run (recommended first):**
   ```bash
   node scripts/restore-firestore.js --backup backups/backup-2024-01-15.json --dry-run
   ```

2. **Actual restore:**
   ```bash
   node scripts/restore-firestore.js --backup backups/backup-2024-01-15.json
   ```
   - You'll be prompted to confirm
   - Type "yes" to proceed

3. **Verify the restore:**
   - Check Firebase Console
   - Verify collections and document counts
   - Test your application

---

## Best Practices

### 1. Regular Backups
- ✅ Create backups before major changes
- ✅ Create backups before migrations
- ✅ Schedule regular backups (daily/weekly)

### 2. Backup Storage
- ✅ Store backups in multiple locations
- ✅ Keep backups for at least 30 days
- ✅ Name backups with dates: `backup-2024-01-15.json`
- ✅ Don't commit backups to git (add to `.gitignore`)

### 3. Before Migration
- ✅ Create a backup with a descriptive name: `backup-before-translation-migration.json`
- ✅ Test migration on a copy of production data
- ✅ Verify backup is complete before starting migration

### 4. Backup Verification
- ✅ Check file size (should be reasonable)
- ✅ Open backup file and verify structure
- ✅ Count documents match your expectations
- ✅ Test restore on a development database

---

## Troubleshooting

### Error: "Service account not found"
**Solution:** Ensure `server/firebase-service-account.json` exists or set environment variables.

### Error: "Permission denied"
**Solution:** Check that your service account has Firestore read/write permissions.

### Backup file is empty
**Solution:** 
- Check that collections exist in Firestore
- Verify service account has proper permissions
- Check console for error messages

### Restore fails partway through
**Solution:**
- Check Firestore quotas/limits
- Verify backup file is not corrupted
- Try restoring collections individually
- Check Firebase Console for error details

### Backup is too large
**Solution:**
- Split backup by collection
- Use gcloud export for large databases
- Consider incremental backups

---

## Automated Backup Script

You can create a scheduled backup using cron (Linux/Mac) or Task Scheduler (Windows):

### Linux/Mac (cron)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/kingsman-saddlery && node scripts/backup-firestore.mjs --output backups/auto-backup-$(date +\%Y-\%m-\%d).json
```

### Windows (Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily, weekly, etc.)
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/backup-firestore.js --output backups/auto-backup-%date%.json`
7. Start in: `C:\Users\moh12\Dev\kingsman-saddlery`

---

## Pre-Migration Checklist

Before starting the translation migration:

- [ ] Create a full backup: `node scripts/backup-firestore.mjs --output backups/backup-before-translation-migration.json`
- [ ] Verify backup file size and content
- [ ] Test restore on development database
- [ ] Document current document counts per collection
- [ ] Ensure you have rollback plan
- [ ] Notify team members (if applicable)
- [ ] Schedule migration during low-traffic period (if production)

---

## Additional Resources

- [Firebase Firestore Export/Import](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [gcloud Firestore Documentation](https://cloud.google.com/sdk/gcloud/reference/firestore)
- [Firestore Backup Best Practices](https://firebase.google.com/docs/firestore/manage-data/export-import#best_practices)

---

## Quick Reference

```bash
# Create backup
node scripts/backup-firestore.mjs

# Create backup with custom name
node scripts/backup-firestore.mjs --output backups/pre-migration-backup.json

# Dry run restore
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json --dry-run

# Restore (with confirmation)
node scripts/restore-firestore.mjs --backup backups/backup-2024-01-15.json
```

