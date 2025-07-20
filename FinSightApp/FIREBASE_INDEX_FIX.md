# Firebase Index Creation Guide

## Error Analysis
The query in your fraud alerts listener requires a composite index because it's using:
- `where('userId', '==', user.uid)` 
- `orderBy('createdAt', 'desc')`

This combination requires a composite index in Firestore.

## Solution 1: Create the Index (RECOMMENDED)

1. **Click this link to create the index automatically:**
   ```
   https://console.firebase.google.com/v1/r/project/finsight-9d1fd/firestore/indexes?create_composite=CIJwcm9qZWN0cy9maW5zaWdodC05ZDFmZC9kYXRhYmFzZXMvKGRIZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZnJhdWRBbGVydHMvaW5k
   ```

2. **Or manually create in Firebase Console:**
   - Go to: https://console.firebase.google.com/project/finsight-9d1fd/firestore/indexes
   - Click "Create Index"
   - Collection: `fraudAlerts`
   - Fields:
     - `userId` (Ascending)
     - `createdAt` (Descending)
   - Click "Create"

3. **Index will take 1-2 minutes to build**
   - You'll see "Building..." status
   - Once ready, the app will work normally

## Solution 2: Modified Query (Temporary Fix)

If you can't create the index immediately, here's a temporary workaround:

### Option A: Simple userId query (no ordering)
```javascript
const q = query(
  alertsRef, 
  where('userId', '==', userId),
  limit(10)
);
```

### Option B: Client-side sorting
```javascript
const q = query(
  alertsRef, 
  where('userId', '==', userId),
  limit(20) // Get more to sort on client
);

// Then sort in the onSnapshot callback:
const alerts = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .sort((a, b) => b.createdAt?.toDate?.() - a.createdAt?.toDate?.())
  .slice(0, 10); // Take top 10 after sorting
```

## Why This Happens
Firebase requires explicit indexes for:
- Queries with multiple filters
- Queries combining where() and orderBy() on different fields
- Complex queries for performance optimization

## Recommendation
**Create the index** - it's the proper solution and will make your queries fast and reliable.
