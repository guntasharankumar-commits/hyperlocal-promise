// ---- User Personas ----
export type UserPersona = 'new' | 'low_tes' | 'med_tes' | 'high_tes';

export interface PersonaConfig {
  label: string;
  description: string;
  baseTESModifier: number;
  promisePadding: number; // extra minutes added to promise for safety
}

export const PERSONA_CONFIGS: Record<UserPersona, PersonaConfig> = {
  new: { label: 'New User', description: 'First-time customer, conservative promise', baseTESModifier: 0, promisePadding: 2 },
  low_tes: { label: 'Low TES', description: 'History of issues, padded promise', baseTESModifier: -20, promisePadding: 3 },
  med_tes: { label: 'Med TES', description: 'Average customer experience', baseTESModifier: 10, promisePadding: 1 },
  high_tes: { label: 'High TES', description: 'Trusted customer, aggressive promise', baseTESModifier: 30, promisePadding: 0 },
};

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
  ordersCompleted: Record<string, number>; // hexLabel -> count
}

export const RIDER_DATABASE: Rider[] = [
  { id: 'R1', name: 'Arjun', archetype: 'The Pro', rating: 4.8, speedFactor: 1.0, localityAwareness: 9, status: 'idle', hexPosition: 2, ordersCompleted: { H0: 45, H1: 32, H2: 28, H3: 15, H4: 50, H5: 22, H6: 10 } },
  { id: 'R2', name: 'Vikram', archetype: 'The Speedster', rating: 3.6, speedFactor: 1.4, localityAwareness: 6, status: 'idle', hexPosition: 5, ordersCompleted: { H0: 12, H1: 8, H2: 55, H3: 3, H4: 20, H5: 60, H6: 18 } },
  { id: 'R3', name: 'Priya', archetype: 'The Rookie', rating: 3.2, speedFactor: 0.8, localityAwareness: 3, status: 'idle', hexPosition: 8, ordersCompleted: { H0: 2, H1: 1, H2: 3, H3: 0, H4: 5, H5: 2, H6: 8 } },
  { id: 'R4', name: 'Rahul', archetype: 'The Veteran', rating: 4.5, speedFactor: 0.95, localityAwareness: 8, status: 'idle', hexPosition: 4, ordersCompleted: { H0: 38, H1: 42, H2: 35, H3: 30, H4: 55, H5: 28, H6: 20 } },
  { id: 'R5', name: 'Meera', archetype: 'The Navigator', rating: 4.2, speedFactor: 1.1, localityAwareness: 10, status: 'idle', hexPosition: 1, ordersCompleted: { H0: 25, H1: 50, H2: 15, H3: 40, H4: 35, H5: 30, H6: 45 } },
];

// ---- Hex Grid ----
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
  const labels = ['H0','H1','H2','H3','H4','H5','H6'];
  
  // Generate a ring of hexagons around the store
  // Center hex is the store (H4)
  // Using ~0.008 degree offset (~800m) for hex spacing
  const offset = 0.008;
  const positions = [
    { col: 0, row: 0, dlat: offset, dlng: 0 },         // H0 - North
    { col: 1, row: 0, dlat: offset/2, dlng: offset },   // H1 - NE
    { col: 2, row: 0, dlat: -offset/2, dlng: offset },  // H2 - SE
    { col: 0, row: 1, dlat: -offset, dlng: 0 },         // H3 - South
    { col: 1, row: 1, dlat: 0, dlng: 0 },               // H4 - Center (Store)
    { col: 2, row: 1, dlat: offset/2, dlng: -offset },  // H5 - NW
    { col: 0, row: 2, dlat: -offset/2, dlng: -offset }, // H6 - SW
  ];

  positions.forEach((pos, i) => {
    const dist = Math.sqrt(pos.dlat ** 2 + pos.dlng ** 2) / offset;
    const baseTime = i === 4 ? 2 : 3 + dist * 4;
    hexes.push({
      id: i,
      col: pos.col,
      row: pos.row,
      baseS2DMinutes: Math.round(baseTime * 10) / 10,
      variance: Math.round((Math.random() * 2 - 0.5) * 10) / 10,
      label: labels[i],
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
  maxTES: number;
  breakdown: { promise: number; tes: number }[];
}

export function calculateTES(
  s2dMinutes: number,
  riderRating: number,
  pickingVariance: number,
  packerCongestion: number,
  personaModifier: number = 0
): TESResult {
  const W1 = 1.2;
  const W2_base = 2.0;
  const W3 = 5.0;
  const cost = pickingVariance * 0.5 + packerCongestion * 0.3;
  const D = s2dMinutes + 2 + pickingVariance;

  const breakdown: { promise: number; tes: number }[] = [];
  let maxTES = -Infinity;
  let optimalPromise = 10;

  for (let P = 8; P <= 15; P++) {
    const W2 = P < D ? W2_base * Math.exp((D - P) * 0.5) : W2_base;
    const cushion = P - D;
    const tes =
      W1 * Math.pow(10 - P, 3) +
      W2 * cushion +
      W3 * (riderRating - 4) -
      cost +
      personaModifier;

    breakdown.push({ promise: P, tes: Math.round(tes * 10) / 10 });
    if (tes > maxTES) {
      maxTES = tes;
      optimalPromise = P;
    }
  }

  return { optimalPromise, maxTES: Math.round(maxTES * 10) / 10, breakdown };
}

// ---- Cached Promise (for Browse mode per hex) ----
export function getCachedPromise(hex: HexCell, persona: UserPersona): number {
  const config = PERSONA_CONFIGS[persona];
  const s2d = calculateS2D(hex);
  return Math.ceil(s2d + 2 + 1.0 + config.promisePadding); // base picking variance = 1.0
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
  delays: Partial<Record<FulfillmentStatus, number>>; // delay in seconds per status
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
  agent: 'PROMISE' | 'ASSIGNMENT' | 'RECOVERY' | 'SYSTEM';
  message: string;
  data?: Record<string, unknown>;
}

// ---- Recovery: find best rider by locality ----
export function findRecoveryRider(riders: Rider[], excludeId?: string): Rider {
  const available = riders.filter(r => r.id !== excludeId);
  return available.sort((a, b) => b.localityAwareness - a.localityAwareness)[0];
}

export function selectBestRider(riders: Rider[], hexId: number): Rider {
  return riders
    .filter(r => r.status === 'idle')
    .sort((a, b) => {
      const scoreA = a.rating * 2 + a.speedFactor * 3 - Math.abs(a.hexPosition - hexId) * 0.5;
      const scoreB = b.rating * 2 + b.speedFactor * 3 - Math.abs(b.hexPosition - hexId) * 0.5;
      return scoreB - scoreA;
    })[0] || riders[0];
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
