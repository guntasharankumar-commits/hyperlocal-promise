

## Fix: Promise Changing After Add-to-Cart

### Root Cause
In `Index.tsx` line 81-83, `livePromise` has two branches:
- **BROWSE**: reads from promise cache (TES-optimized) ✅
- **Everything else**: reads from `currentOrder.promiseMinutes` which is `undefined` during CHECKOUT, falling back to a raw `O2S + S2D + padding` calculation (no TES optimization) ❌

### Fix
**File: `src/pages/Index.tsx`** — Update the `livePromise` logic to also use the cached promise during `CHECKOUT` state:

```typescript
const livePromise = (currentOrder.state === 'BROWSE' || currentOrder.state === 'CHECKOUT')
  ? (cachedEntry?.best.promise ?? Math.ceil(calculateO2S(storeConfig) + liveS2D + personaConfig.promisePadding))
  : (currentOrder.promiseMinutes ?? Math.ceil(calculateO2S(storeConfig) + liveS2D + personaConfig.promisePadding));
```

This ensures the promise displayed at checkout is the same TES-optimized value the user saw while browsing — it only switches to `promiseMinutes` (the locked-in value) after the order is actually placed.

