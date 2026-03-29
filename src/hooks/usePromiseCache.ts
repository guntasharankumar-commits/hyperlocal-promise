import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HexCell,
  Rider,
  StoreConfig,
  UserPersona,
  PERSONA_CONFIGS,
  calculateS2D,
  selectBestRider,
  AgentLog,
} from '@/lib/simulation';

export type PromiseCacheEntry = {
  promise: number;
  tes: number;
  riderId: string;
  riderName: string;
};

export type PromiseCacheTop3 = {
  best: PromiseCacheEntry;
  alternatives: { promise: number; tes: number }[];
};

export type PromiseCache = Record<string, PromiseCacheTop3>; // key: `${persona}-${hexId}`

const REFRESH_INTERVAL_SEC = 300; // 5 minutes

export function getCacheKey(persona: UserPersona, hexId: number): string {
  return `${persona}-${hexId}`;
}

function computeFullCache(
  hexGrid: HexCell[],
  riders: Rider[],
  storeConfig: StoreConfig,
): PromiseCache {
  const cache: PromiseCache = {};
  const personas: UserPersona[] = ['new', 'low_tes', 'med_tes', 'high_tes'];

  for (const persona of personas) {
    const config = PERSONA_CONFIGS[persona];
    for (const hex of hexGrid) {
      const s2d = calculateS2D(hex);
      const { rider, tes } = selectBestRider(riders, hex.id, s2d, storeConfig, config.baseTESModifier);
      
      // Get top 3 promises sorted by TES descending
      const sorted = [...tes.breakdown].sort((a, b) => b.tes - a.tes);
      const alternatives = sorted.slice(1, 3).map(e => ({ promise: e.promise, tes: e.tes }));

      cache[getCacheKey(persona, hex.id)] = {
        best: {
          promise: tes.optimalPromise,
          tes: tes.maxTES,
          riderId: rider.id,
          riderName: rider.name,
        },
        alternatives,
      };
    }
  }

  return cache;
}

export interface UsePromiseCacheReturn {
  cache: PromiseCache;
  secondsUntilRefresh: number;
  lastRefreshTime: number;
  triggerReason: string | null;
  forceRefresh: (reason: string) => void;
}

export function usePromiseCache(
  hexGrid: HexCell[],
  riders: Rider[],
  storeConfig: StoreConfig,
  addLog: (agent: AgentLog['agent'], message: string, data?: Record<string, unknown>) => void,
  onRefresh?: (reason: string) => void,
): UsePromiseCacheReturn {
  const [cache, setCache] = useState<PromiseCache>({});
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SEC);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [triggerReason, setTriggerReason] = useState<string | null>(null);
  const prevRiderStatusRef = useRef<string>('');
  const prevStoreConfigRef = useRef<string>('');
  const initializedRef = useRef(false);

  const doRefresh = useCallback((reason: string) => {
    const newCache = computeFullCache(hexGrid, riders, storeConfig);
    setCache(newCache);
    setLastRefreshTime(Date.now());
    setSecondsUntilRefresh(REFRESH_INTERVAL_SEC);
    setTriggerReason(reason);

    const personas: UserPersona[] = ['new', 'low_tes', 'med_tes', 'high_tes'];
    
    // Build full matrix for logging
    const matrix: Record<string, Record<string, string>> = {};
    for (const hex of hexGrid) {
      const hexLabel = `H${hex.id}`;
      matrix[hexLabel] = {};
      for (const p of personas) {
        const entry = newCache[getCacheKey(p, hex.id)];
        matrix[hexLabel][PERSONA_CONFIGS[p].label] = `${entry?.best.promise}m (TES: ${entry?.best.tes})`;
      }
    }

    addLog('DATABASE', `🔄 Promise cache refreshed — ${reason}`, {
      totalEntries: Object.keys(newCache).length,
      combinations: `${personas.length} personas × ${hexGrid.length} hexes`,
      nextRefreshIn: `${REFRESH_INTERVAL_SEC}s`,
    });

    addLog('PROMISE', `📊 Full promise matrix (${Object.keys(newCache).length} entries):`, {
      matrix,
    });

    onRefresh?.(reason);
  }, [hexGrid, riders, storeConfig, addLog, onRefresh]);

  // Initial computation
  useEffect(() => {
    if (!initializedRef.current && hexGrid.length > 0) {
      initializedRef.current = true;
      doRefresh('Initial computation');
    }
  }, [hexGrid.length, doRefresh]);

  // Trigger 1: 5-minute interval countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          doRefresh('Scheduled 5-min refresh');
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [doRefresh]);

  // Trigger 2: Rider becomes free (status changes to idle)
  useEffect(() => {
    const currentStatus = riders.map(r => `${r.id}:${r.status}`).join(',');
    if (prevRiderStatusRef.current && prevRiderStatusRef.current !== currentStatus) {
      const prevStatuses = Object.fromEntries(
        prevRiderStatusRef.current.split(',').map(s => s.split(':'))
      );
      const freedRiders = riders.filter(r => r.status === 'idle' && prevStatuses[r.id] !== 'idle');
      if (freedRiders.length > 0) {
        const names = freedRiders.map(r => r.name).join(', ');
        doRefresh(`Rider freed: ${names}`);
      }
    }
    prevRiderStatusRef.current = currentStatus;
  }, [riders, doRefresh]);

  // Trigger 3: Store config changes
  useEffect(() => {
    const configStr = JSON.stringify(storeConfig);
    if (prevStoreConfigRef.current && prevStoreConfigRef.current !== configStr) {
      doRefresh('Store config updated');
    }
    prevStoreConfigRef.current = configStr;
  }, [storeConfig, doRefresh]);

  const forceRefresh = useCallback((reason: string) => {
    doRefresh(reason);
  }, [doRefresh]);

  return { cache, secondsUntilRefresh, lastRefreshTime, triggerReason, forceRefresh };
}
