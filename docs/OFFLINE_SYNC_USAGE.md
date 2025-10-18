# Offline Sync & Conflict Resolution Usage Guide

This guide shows how to use the offline sync and conflict resolution features in the Sierra Painting app.

## Features

- ✅ **Firestore Offline Persistence**: Multi-tab support with IndexedDB
- ✅ **Service Worker Caching**: Workbox with NetworkFirst and CacheFirst strategies
- ✅ **Version-Based Conflict Resolution**: Automatic conflict detection and resolution
- ✅ **Offline Queue**: Failed operations queued and retried when online
- ✅ **Offline Indicator**: Visual feedback when connection is lost

## Architecture

### Offline Persistence

**Auth Persistence** (`src/lib/firebase.ts`):

```typescript
// Automatically enabled:
// 1. Try IndexedDB (best)
// 2. Fallback to localStorage
// 3. Last resort: in-memory (not persistent)
```

**Firestore Persistence** (`src/lib/firebase.ts`):

```typescript
// Automatically enabled on app startup:
// 1. Try multi-tab persistence (best)
// 2. Fallback to single-tab if multiple tabs detected
// 3. Log error if browser doesn't support offline
```

**Service Worker** (`vite.config.ts` + `src/main.tsx`):

- Auto-updates on new versions
- Caches Firebase Storage (CacheFirst, 30 days)
- Caches Firestore API (NetworkFirst, 24 hours)
- Prompts user to reload on new content

### Conflict Resolution

Version-based optimistic locking prevents data loss when multiple users or offline tabs edit the same document.

**How it works:**

1. Each document has a `version` field (starts at 0)
2. On update, check current version matches expected version
3. If versions differ, a conflict occurred
4. Apply resolution strategy (last-write-wins, server-wins, client-wins, merge, manual)
5. Increment version and save

## Usage Examples

### 1. Basic Version-Aware Mutation

```typescript
import { useMutation } from '@tanstack/react-query';
import { createVersionAwareMutationOptions } from '@/lib/mutation-utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { doc } from 'firebase/firestore';

function useUpdateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation(
    createVersionAwareMutationOptions({
      db,
      getDocRef: (variables: { invoiceId: string }) => doc(db, 'invoices', variables.invoiceId),

      mapData: (variables: UpdateInvoiceVariables) => ({
        status: variables.status,
        amountPaid: variables.amountPaid,
        notes: variables.notes,
      }),

      userId: user!.uid,
      conflictStrategy: 'last-write-wins', // Auto-resolve conflicts
      maxRetries: 3,
      queryClient,
      invalidateKeys: [['invoices']],

      onSuccess: (result) => {
        toast.success('Invoice updated successfully');
      },

      onConflict: (result) => {
        // Called if conflict can't be auto-resolved
        toast.error(getConflictMessage(result.conflict!));
      },
    }),
  );
}
```

### 2. Manual Conflict Resolution

```typescript
import { ConflictStrategy } from '@/lib/conflict-resolution';

function useUpdateJob() {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<Conflict<Job> | null>(null);

  return useMutation(
    createVersionAwareMutationOptions({
      db,
      getDocRef: (variables) => doc(db, 'jobs', variables.jobId),
      mapData: (variables) => ({ ...variables.updates }),
      userId: user!.uid,
      conflictStrategy: 'manual', // Require user choice
      queryClient,

      onConflict: (result) => {
        // Show dialog for user to choose
        setConflictData(result.conflict!);
        setShowConflictDialog(true);
      },
    })
  );
}

// In your component:
<ConflictResolutionDialog
  open={showConflictDialog}
  conflict={conflictData}
  onResolve={(strategy: ConflictStrategy) => {
    const resolved = resolveConflict(conflictData!, strategy, user.uid);
    // Re-submit with resolved data
    updateJob.mutate(resolved);
    setShowConflictDialog(false);
  }}
/>
```

### 3. Using Offline Manager

```typescript
import { useOfflineStatus, useNetworkQuality } from '@/lib/offline';

function MyComponent() {
  const { status, isOnline, isOffline, queueSize } = useOfflineStatus();
  const networkQuality = useNetworkQuality();

  if (isOffline) {
    return (
      <Alert>
        <WifiOff className="h-4 w-4" />
        <AlertTitle>You're offline</AlertTitle>
        <AlertDescription>
          Changes will sync when connection is restored.
          {queueSize > 0 && ` ${queueSize} changes queued.`}
        </AlertDescription>
      </Alert>
    );
  }

  if (networkQuality?.effectiveType === '2g') {
    return <Alert variant="warning">Slow connection detected</Alert>;
  }

  return <div>Your online content</div>;
}
```

### 4. Adding Version Field to Schema

Update your Zod schemas to include version:

```typescript
// src/schemas/invoice-schema.ts
export const invoiceSchema = z.object({
  // ... existing fields
  version: z.number().default(0),
  updatedAt: z.date().optional(),
  updatedBy: z.string().optional(),
});
```

Update TypeScript types:

```typescript
// src/types/index.ts
import { VersionedDocument } from '@/lib/conflict-resolution';

export interface Invoice extends VersionedDocument {
  id: string;
  invoiceNumber: string;
  // ... other fields
}
```

### 5. Initialize Versioned Documents

When creating new documents:

```typescript
import { initializeVersionedDocument } from '@/lib/conflict-resolution';

const newInvoice = initializeVersionedDocument(
  {
    invoiceNumber: 'INV-001',
    customerId: 'customer-123',
    // ... other fields
  },
  user.uid,
);

await addDoc(collection(db, 'invoices'), newInvoice);
```

## Conflict Resolution Strategies

### `last-write-wins` (Default, Recommended)

- Compares timestamps
- Most recent update wins
- Good for most use cases

### `server-wins`

- Server version always takes precedence
- Use when server has authoritative data
- Example: Calculated totals, system-generated fields

### `client-wins`

- Client version always takes precedence
- Use when user intent is most important
- Example: User preferences, draft content

### `merge`

- Field-level merge
- Takes non-null values from both versions
- Use when changes affect different fields
- Risk: May create inconsistent state

### `manual`

- Requires user intervention
- Shows conflict dialog
- Use for critical data
- Example: Financial records, contracts

## Testing Offline Functionality

### Test Offline Persistence

1. **Open DevTools** → Application → Service Workers
2. Check "Offline" checkbox
3. Navigate app - should work from cache
4. Make changes - should queue
5. Uncheck "Offline" - queued changes sync

### Test Multi-Tab Conflicts

1. Open app in **two browser tabs**
2. Edit same invoice in both tabs
3. Save in Tab 1 (version: 0 → 1)
4. Save in Tab 2 (detects conflict: expected v0, got v1)
5. Conflict auto-resolved using strategy
6. Both tabs show consistent data after sync

### Test Service Worker Updates

1. Make code change and rebuild
2. Service worker detects new version
3. User sees "New content available" prompt
4. Clicking "Reload" updates app

### Test Network Quality Detection

```typescript
// In browser console:
const manager = window.offlineManager;
manager.getStatus(); // 'online' | 'offline' | 'unstable'
manager.getQueueSize(); // Number of queued operations
```

## Best Practices

1. **Always use version field** for editable documents
2. **Choose appropriate strategy** based on data criticality
3. **Show offline indicator** in UI (already integrated in AppLayout)
4. **Test with multiple tabs** to verify conflict handling
5. **Handle onConflict** callback for manual strategy
6. **Monitor queue size** and show user pending changes
7. **Test with slow networks** (DevTools → Network → Slow 3G)

## Troubleshooting

### "Persistence failed" errors

**Cause**: Multiple tabs or unsupported browser

**Solution**:

- Close other tabs
- Use supported browser (Chrome, Firefox, Safari)
- Check console for specific error

### Conflicts not resolving

**Cause**: Manual strategy requires user intervention

**Solution**: Implement conflict dialog or switch to auto-resolution strategy

### Queued changes not syncing

**Cause**: Network still offline or operations failed

**Solution**:

```typescript
// Check queue and retry manually
const manager = getOfflineManager();
const queueSize = manager.getQueueSize();
// Operations retry automatically when online
```

### Service worker not updating

**Cause**: Browser cache or SW stuck

**Solution**:

1. DevTools → Application → Service Workers → Unregister
2. Hard refresh (Ctrl+Shift+R)
3. Clear site data

## Migration Guide

### Add Version Field to Existing Documents

```typescript
// One-time migration script
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateDocuments() {
  const snapshot = await getDocs(collection(db, 'invoices'));

  for (const docSnap of snapshot.docs) {
    if (!docSnap.data().version) {
      await updateDoc(doc(db, 'invoices', docSnap.id), {
        version: 0,
        updatedAt: serverTimestamp(),
      });
    }
  }
}
```

## References

- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Workbox Caching Strategies](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)
- [Optimistic Locking Pattern](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [PWA Offline Patterns](https://web.dev/offline-cookbook/)
