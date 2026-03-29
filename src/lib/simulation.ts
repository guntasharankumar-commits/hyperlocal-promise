// ---- User Personas ----
export type UserPersona = 'new' | 'low_tes' | 'med_tes' | 'high_tes';

export interface PersonaConfig {
  label: string;
  description: string;
  baseTESModifier: number;
  promisePadding: number;
}

export const PERSONA_CONFIGS: Record<UserPersona, PersonaConfig> = {
  new: { label: 'New User', description: 'First-time customer, conservative promise', baseTESModifier: 0, promisePadding: 2 },
  low_tes: { label: 'Low TES', description: 'History of issues, padded promise', baseTESModifier: -20, promisePadding: 3 },
  med_tes: { label: 'Med TES', description: 'Average customer experience', baseTESModifier: 10, promisePadding: 1 },
  high_tes: { label: 'High TES', description: 'Trusted customer, aggressive promise', baseTESModifier: 30, promisePadding: 0 },
};

// ---- Store Config (picking/packing) ----
export interface StoreConfig {
  avgPickingTime: number;   // minutes (1-10, default 3)
  pickingVariance: number;  // minutes (0-3, default 0.2)
  avgPackingTime: number;   // minutes (1-5, default 2)
  packingVariance: number;  // minutes (0-3, default 0.3)
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  avgPickingTime: 3,
  pickingVariance: 0.2,
  avgPackingTime: 2,
  packingVariance: 0.3,
};

// ---- O2S Calculation ----
export function calculateO2S(config: StoreConfig): number {
  return config.avgPickingTime + config.pickingVariance + config.avgPackingTime + config.packingVariance;
}

// ---- Rider Database ----
export interface Rider {
  id: string;
  name: string;
  archetype: string;
  rating: number;
  speedFactor: number;
  localityAwareness: number;
  status: 'idle' | 'assigned' | 'en-route' | 'delivering';
  hexPosition: number;
  ordersCompleted: Record<string, number>;
}

export const RIDER_DATABASE: Rider[] = [
  { id: 'R1', name: 'Arjun', archetype: 'The Pro', rating: 4.8, speedFactor: 1.0, localityAwareness: 9, status: 'idle', hexPosition: 2, ordersCompleted: { H0: 45, H1: 32, H2: 28, H3: 15, H4: 50, H5: 22, H6: 10, H7: 18, H8: 25, H9: 12 } },
  { id: 'R2', name: 'Vikram', archetype: 'The Speedster', rating: 3.6, speedFactor: 1.4, localityAwareness: 6, status: 'idle', hexPosition: 5, ordersCompleted: { H0: 12, H1: 8, H2: 55, H3: 3, H4: 20, H5: 60, H6: 18, H7: 5, H8: 30, H9: 15 } },
  { id: 'R3', name: 'Priya', archetype: 'The Rookie', rating: 3.2, speedFactor: 0.8, localityAwareness: 3, status: 'idle', hexPosition: 8, ordersCompleted: { H0: 2, H1: 1, H2: 3, H3: 0, H4: 5, H5: 2, H6: 8, H7: 1, H8: 4, H9: 0 } },
  { id: 'R4', name: 'Rahul', archetype: 'The Veteran', rating: 4.5, speedFactor: 0.95, localityAwareness: 8, status: 'idle', hexPosition: 4, ordersCompleted: { H0: 38, H1: 42, H2: 35, H3: 30, H4: 55, H5: 28, H6: 20, H7: 22, H8: 40, H9: 18 } },
  { id: 'R5', name: 'Meera', archetype: 'The Navigator', rating: 4.2, speedFactor: 1.1, localityAwareness: 10, status: 'idle', hexPosition: 1, ordersCompleted: { H0: 25, H1: 50, H2: 15, H3: 40, H4: 35, H5: 30, H6: 45, H7: 15, H8: 28, H9: 20 } },
];

// ---- Hex Grid (19 hexagons – 2 rings around center store) ----
export interface HexCell {
  id: number;
  col: number;
  row: number;
  baseS2DMinutes: number;
  variance: number;
  label: string;
  lat: number;
  lng: number;
}

// Store location: 3P6V+GW Bengaluru ≈ 12.9352°N, 77.6120°E
export const STORE_LOCATION = { lat: 12.9352, lng: 77.6120 };

export function generateHexGrid(): HexCell[] {
  const hexes: HexCell[] = [];
  const offset = 0.006; // ~600m per hex spacing

  // Ring 0: Center (store)
  const positions: { dlat: number; dlng: number; ring: number }[] = [
    { dlat: 0, dlng: 0, ring: 0 }, // H0 - Center/Store
  ];

  // Ring 1: 6 hexagons
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    positions.push({
      dlat: offset * Math.cos(angle),
      dlng: offset * Math.sin(angle),
      ring: 1,
    });
  }

  // Ring 2: 12 hexagons
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    positions.push({
      dlat: 2 * offset * Math.cos(angle),
      dlng: 2 * offset * Math.sin(angle),
      ring: 2,
    });
    const midAngle = (Math.PI / 3) * i + Math.PI / 6;
    positions.push({
      dlat: Math.sqrt(3) * offset * Math.cos(midAngle),
      dlng: Math.sqrt(3) * offset * Math.sin(midAngle),
      ring: 2,
    });
  }

  positions.forEach((pos, i) => {
    const dist = Math.sqrt(pos.dlat ** 2 + pos.dlng ** 2) / offset;
    const baseTime = i === 0 ? 2 : 3 + dist * 3.5;
    hexes.push({
      id: i,
      col: i % 5,
      row: Math.floor(i / 5),
      baseS2DMinutes: Math.round(baseTime * 10) / 10,
      variance: Math.round((Math.random() * 2 - 0.5) * 10) / 10,
      label: `H${i}`,
      lat: STORE_LOCATION.lat + pos.dlat,
      lng: STORE_LOCATION.lng + pos.dlng,
    });
  });
  return hexes;
}

// ---- S2D Calculation ----
export function calculateS2D(hex: HexCell): number {
  return hex.baseS2DMinutes + hex.variance;
}

// ---- TES Calculation ----
export interface TESResult {
  optimalPromise: number;
  minTES: number;
  o2s: number;
  s2d: number;
  plannedD: number;
  breakdown: { promise: number; tes: number }[];
}

export function calculateTES(
  s2dMinutes: number,
  riderRating: number,
  storeConfig: StoreConfig,
  personaModifier: number = 0,
  actualO2S?: number, // used in recovery with actual elapsed O2S
): TESResult {
  const W1 = 1.2;
  const W2_base = 2.0;
  const W3 = 5.0;

  const o2s = actualO2S ?? calculateO2S(storeConfig);
  const D = o2s + s2dMinutes;
  const cost = storeConfig.pickingVariance * 0.5 + storeConfig.packingVariance * 0.3;

  const breakdown: { promise: number; tes: number }[] = [];
  let minTES = Infinity;
  let optimalPromise = 10;

  for (let P = 5; P <= 18; P++) {
    const W2 = P < D ? W2_base * Math.exp((D - P) * 0.5) : W2_base;
    const cushion = P - D;
    const tes =
      W1 * Math.pow(10 - P, 3) +
      W2 * cushion +
      W3 * (riderRating - 4) -
      cost +
      personaModifier;

    const rounded = Math.round(tes * 10) / 10;
    breakdown.push({ promise: P, tes: rounded });

    // Find minimum TES (most aggressive feasible promise)
    if (rounded < minTES && P >= Math.ceil(D)) {
      minTES = rounded;
      optimalPromise = P;
    }
  }

  // If no promise >= D was found, pick the one closest to D
  if (minTES === Infinity) {
    const closestToD = breakdown.reduce((best, cur) =>
      Math.abs(cur.promise - D) < Math.abs(best.promise - D) ? cur : best
    );
    optimalPromise = closestToD.promise;
    minTES = closestToD.tes;
  }

  return { optimalPromise, minTES, o2s: Math.round(o2s * 10) / 10, s2d: Math.round(s2dMinutes * 10) / 10, plannedD: Math.round(D * 10) / 10, breakdown };
}

// ---- Cached Promise (for Browse mode per hex) ----
export function getCachedPromise(hex: HexCell, persona: UserPersona, storeConfig: StoreConfig = DEFAULT_STORE_CONFIG): number {
  const config = PERSONA_CONFIGS[persona];
  const s2d = calculateS2D(hex);
  const o2s = calculateO2S(storeConfig);
  return Math.ceil(o2s + s2d + config.promisePadding);
}

// ---- Order State Machine ----
export type OrderState = 'BROWSE' | 'CHECKOUT' | 'OPTIMIZING' | 'FULFILLMENT' | 'RECOVERY' | 'DELIVERED';
export type FulfillmentStatus = 'created' | 'picked' | 'packed' | 'handover' | 'intransit' | 'delivered';

export interface OrderData {
  id: string;
  state: OrderState;
  fulfillmentStatus: FulfillmentStatus;
  promiseMinutes: number | null;
  actualMinutes: number | null;
  assignedRider: Rider | null;
  selectedHex: number;
  tes: number;
  startTime: number | null;
  persona: UserPersona;
  delays: Partial<Record<FulfillmentStatus, number>>;
}

export const initialOrder: OrderData = {
  id: '',
  state: 'BROWSE',
  fulfillmentStatus: 'created',
  promiseMinutes: null,
  actualMinutes: null,
  assignedRider: null,
  selectedHex: 0,
  tes: 0,
  startTime: null,
  persona: 'new',
  delays: {},
};

// ---- Agent Log Types ----
export interface AgentLog {
  timestamp: number;
  agent: 'PROMISE' | 'ASSIGNMENT' | 'RECOVERY' | 'SYSTEM' | 'DATABASE';
  message: string;
  data?: Record<string, unknown>;
}

// ---- Agent Pipeline Step ----
export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentPipelineStep {
  agent: AgentLog['agent'];
  label: string;
  status: AgentStepStatus;
  startedAt?: number;
  completedAt?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

// ---- Recovery: find best rider by locality ----
export function findRecoveryRider(riders: Rider[], excludeId?: string): Rider {
  const available = riders.filter(r => r.id !== excludeId);
  return available.sort((a, b) => b.localityAwareness - a.localityAwareness)[0];
}

export function selectBestRider(
  riders: Rider[],
  hexId: number,
  s2dMinutes: number,
  storeConfig: StoreConfig,
  personaModifier: number = 0,
): { rider: Rider; tes: TESResult } {
  const idle = riders.filter(r => r.status === 'idle');
  if (idle.length === 0) {
    const fallback = riders[0];
    return { rider: fallback, tes: calculateTES(s2dMinutes, fallback.rating, storeConfig, personaModifier) };
  }

  let bestRider = idle[0];
  let bestTes = calculateTES(s2dMinutes, idle[0].rating, storeConfig, personaModifier);

  for (const r of idle) {
    const tes = calculateTES(s2dMinutes, r.rating, storeConfig, personaModifier);
    // Choose rider that yields minimum TES (most aggressive optimal promise)
    if (tes.minTES < bestTes.minTES) {
      bestRider = r;
      bestTes = tes;
    }
  }

  return { rider: bestRider, tes: bestTes };
}

// ---- Fulfillment status progression ----
export const FULFILLMENT_STEPS: FulfillmentStatus[] = ['created', 'picked', 'packed', 'handover', 'intransit', 'delivered'];

export function getNextFulfillmentStatus(current: FulfillmentStatus): FulfillmentStatus | null {
  const idx = FULFILLMENT_STEPS.indexOf(current);
  if (idx < FULFILLMENT_STEPS.length - 1) return FULFILLMENT_STEPS[idx + 1];
  return null;
}

export function generateOrderId(): string {
  return `ORD-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// Store hex ID (center of grid)
export const STORE_HEX_ID = 0;
