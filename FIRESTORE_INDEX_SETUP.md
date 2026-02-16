# Firestore Index Setup for Failed Orders

## Issue

The failed order logging requires a Firestore composite index for rate limiting. If the index is missing, failed orders will still be logged (we made it optional), but you should create the index for proper rate limiting.

## Create the Index

### Option 1: Click the Link in Error Message

When you see the error, it includes a link to create the index:
```
https://console.firebase.google.com/v1/r/project/kingsman-saddlery-stg/firestore/indexes?create_composite=...
```

Click the link and it will automatically create the index.

### Option 2: Manual Creation

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kingsman-saddlery-stg`
3. Navigate to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. Configure:
   - **Collection ID:** `failed_orders`
   - **Fields to index:**
     - `userId` (Ascending)
     - `createdAt` (Ascending)
   - **Query scope:** Collection
6. Click **Create**

### Option 3: Using Firebase CLI

Create a file `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "failed_orders",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## What This Index Does

The index enables rate limiting queries that check:
- How many failed orders a user has submitted in the last 5 minutes
- Prevents spam/abuse of the failed order logging endpoint

## Current Behavior (Without Index)

- ✅ Failed orders are still logged
- Rate limiting is skipped (warning logged)
- All failed orders are logged successfully

## After Creating Index

- ✅ Rate limiting will work properly
- ✅ Prevents spam (max 5 failed orders per user per 5 minutes)
- ✅ No warnings in logs

## Verification

After creating the index, test by:
1. Submitting a failed order
2. Check server logs - should NOT see rate limiting warnings
3. Verify failed order is logged in Firestore

