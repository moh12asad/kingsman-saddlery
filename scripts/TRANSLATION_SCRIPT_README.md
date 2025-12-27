# Translation Script Guide

This script automatically translates English content to Arabic and Hebrew for fields in your Firestore collections.

## Prerequisites

### 1. Install Google Cloud Translate Package

```bash
cd server
npm install @google-cloud/translate
```

### 2. Set Up Google Cloud Credentials

You have two options:

#### Option A: Service Account Key File (Recommended for local development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Enable the **Cloud Translation API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Translation API"
   - Click "Enable"

4. Create a service account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "translation-script")
   - Grant it the role: **Cloud Translation API User**

5. Create a key:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose JSON format
   - Save the file as `server/google-translate-key.json`

6. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/google-translate-key.json"
   ```

   Or on Windows:
   ```cmd
   set GOOGLE_APPLICATION_CREDENTIALS=path\to\google-translate-key.json
   ```

#### Option B: Use Existing Firebase Service Account

If you already have a Firebase service account with Translation API access, you can use it:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/firebase-service-account.json"
```

### 3. Enable Billing (Required)

⚠️ **Important**: Google Cloud Translation API requires billing to be enabled, even for the free tier.

- Go to [Google Cloud Console Billing](https://console.cloud.google.com/billing)
- Link a billing account to your project
- The free tier includes 500,000 characters per month

## Usage

### Basic Usage

```bash
# Dry run (see what would be translated without making changes)
node scripts/translate-fields.mjs --dry-run

# Actually translate (make sure you have a backup!)
node scripts/translate-fields.mjs
```

### Options

```bash
# Translate only products
node scripts/translate-fields.mjs --collection products

# Translate only categories
node scripts/translate-fields.mjs --collection categories

# Skip Arabic translation
node scripts/translate-fields.mjs --skip-ar

# Skip Hebrew translation
node scripts/translate-fields.mjs --skip-he

# Combine options
node scripts/translate-fields.mjs --collection products --skip-ar --dry-run
```

## What It Does

The script:

1. **Scans** all products and categories in your Firestore database
2. **Identifies** fields with English (`en`) but missing Arabic (`ar`) or Hebrew (`he`)
3. **Translates** the English text to the missing languages using Google Translate API
4. **Updates** the database with the new translations
5. **Preserves** existing translations (won't overwrite if they already exist)

### Fields Translated

**Products:**
- `name`
- `description`
- `technicalDetails`
- `additionalDetails`
- `warranty`
- `shippingInfo`
- `specifications` (all nested fields)

**Categories:**
- `name`
- `description`
- `subCategories[].name`

## Cost Estimation

Google Cloud Translation API pricing (as of 2024):
- **Free tier**: 500,000 characters per month
- **Paid tier**: $20 per 1 million characters

**Example:**
- 100 products with average 500 characters each = 50,000 characters
- 10 categories with average 200 characters each = 2,000 characters
- **Total**: ~52,000 characters (well within free tier)

## Safety Features

1. **Dry Run Mode**: Test without making changes
2. **Preserves Existing**: Won't overwrite existing translations
3. **Error Handling**: Continues even if individual translations fail
4. **Batch Processing**: Commits in batches to avoid overwhelming the database
5. **Rate Limiting**: Small delays between API calls to avoid rate limits

## Troubleshooting

### Error: "@google-cloud/translate package not found"
```bash
cd server
npm install @google-cloud/translate
```

### Error: "Failed to initialize Google Translate API"
- Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify the service account has "Cloud Translation API User" role
- Make sure Cloud Translation API is enabled in Google Cloud Console

### Error: "Billing not enabled"
- Enable billing in Google Cloud Console
- Even the free tier requires billing to be enabled

### Translations are poor quality
- Google Translate is good but not perfect
- Consider reviewing and editing translations manually after running the script
- For critical content, use professional translators

## Best Practices

1. **Always backup first**: Use the backup script before running translations
2. **Test with dry-run**: Always run with `--dry-run` first
3. **Start small**: Test with `--collection products` first
4. **Review translations**: Check a few translated items before running on all data
5. **Monitor costs**: Keep an eye on your Google Cloud billing

## Alternative: Manual Translation

If you prefer not to use automated translation:

1. Export your data (use Firestore export or a custom script)
2. Translate manually or use a translation service
3. Import the translated data back

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify all prerequisites are met
3. Check Google Cloud Console for API quotas and errors
4. Review the script output for specific field errors

