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
}

export const RIDER_DATABASE: Rider[] = [
  { id: 'R1', name: 'Arjun', archetype: 'The Pro', rating: 4.8, speedFactor: 1.0, localityAwareness: 9, status: 'idle', hexPosition: 2 },
  { id: 'R2', name: 'Vikram', archetype: 'The Speedster', rating: 3.6, speedFactor: 1.4, localityAwareness: 6, status: 'idle', hexPosition: 5 },
  { id: 'R3', name: 'Priya', archetype: 'The Rookie', rating: 3.2, speedFactor: 0.8, localityAwareness: 3, status: 'idle', hexPosition: 8 },
  { id: 'R4', name: 'Rahul', archetype: 'The Veteran', rating: 4.5, speedFactor: 0.95, localityAwareness: 8, status: 'idle', hexPosition: 4 },
  { id: 'R5', name: 'Meera', archetype: 'The Navigator', rating: 4.2, speedFactor: 1.1, localityAwareness: 10, status: 'idle', hexPosition: 1 },
];

// ---- Hex Grid ----
export interface HexCell {
  id: number;
  col: number;
  row: number;
  baseS2DMinutes: number;
  variance: number;
  label: string;
}

export function generateHexGrid(): HexCell[] {
  const hexes: HexCell[] = [];
  const labels = ['A1','A2','A3','B1','B2','B3','C1','C2','C3'];
  let id = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const dist = Math.sqrt((col - 1) ** 2 + (row - 1) ** 2);
      const baseTime = 3 + dist * 4;
      hexes.push({
        id: id,
        col,
        row,
        baseS2DMinutes: Math.round(baseTime * 10) / 10,
        variance: Math.round((Math.random() * 2 - 0.5) * 10) / 10,
        label: labels[id],
      });
      id++;
    }
  }
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
  packerCongestion: number
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
      cost;

    breakdown.push({ promise: P, tes: Math.round(tes * 10) / 10 });
    if (tes > maxTES) {
      maxTES = tes;
      optimalPromise = P;
    }
  }

  return { optimalPromise, maxTES: Math.round(maxTES * 10) / 10, breakdown };
}

// ---- Order State Machine ----
export type OrderState = 'BROWSE' | 'CHECKOUT' | 'OPTIMIZING' | 'FULFILLMENT' | 'RECOVERY' | 'DELIVERED';

export interface OrderData {
  state: OrderState;
  promiseMinutes: number | null;
  actualMinutes: number | null;
  assignedRider: Rider | null;
  selectedHex: number;
  tes: number;
  startTime: number | null;
}

export const initialOrder: OrderData = {
  state: 'BROWSE',
  promiseMinutes: null,
  actualMinutes: null,
  assignedRider: null,
  selectedHex: 4,
  tes: 0,
  startTime: null,
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
  // Weigh rating and proximity
  return riders
    .filter(r => r.status === 'idle')
    .sort((a, b) => {
      const scoreA = a.rating * 2 + a.speedFactor * 3 - Math.abs(a.hexPosition - hexId) * 0.5;
      const scoreB = b.rating * 2 + b.speedFactor * 3 - Math.abs(b.hexPosition - hexId) * 0.5;
      return scoreB - scoreA;
    })[0] || riders[0];
}
