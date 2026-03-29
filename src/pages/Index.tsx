import { useState, useCallback, useMemo } from 'react';
import StorefrontPanel from '@/components/StorefrontPanel';
import StoreOpsPanel from '@/components/StoreOpsPanel';
import {
  generateHexGrid,
  calculateS2D,
  calculateTES,
  selectBestRider,
  findRecoveryRider,
  getCachedPromise,
  getNextFulfillmentStatus,
  generateOrderId,
  RIDER_DATABASE,
  PERSONA_CONFIGS,
  initialOrder,
  OrderData,
  AgentLog,
  Rider,
  UserPersona,
  FulfillmentStatus,
} from '@/lib/simulation';

export default function Index() {
  const hexGrid = useMemo(() => generateHexGrid(), []);
  const [order, setOrder] = useState<OrderData>({ ...initialOrder });
  const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [riders, setRiders] = useState<Rider[]>(RIDER_DATABASE.map(r => ({ ...r })));
  const [pickingVariance] = useState(1.0);
  const [packerCongestion] = useState(30);

  const addLog = useCallback((agent: AgentLog['agent'], message: string, data?: Record<string, unknown>) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), agent, message, data }]);
  }, []);

  const selectedHexCell = hexGrid.find(h => h.id === order.selectedHex) || hexGrid[0];
  const liveS2D = calculateS2D(selectedHexCell);
  const personaConfig = PERSONA_CONFIGS[order.persona];

  // In BROWSE mode show cached promise, in CHECKOUT show actual (synced from backend)
  const livePromise = order.state === 'BROWSE'
    ? getCachedPromise(selectedHexCell, order.persona)
    : Math.ceil(liveS2D + 2 + pickingVariance + personaConfig.promisePadding);

  const handleSelectHex = useCallback((id: number) => {
    if (order.state !== 'BROWSE' && order.state !== 'CHECKOUT') return;
    setOrder(prev => ({ ...prev, selectedHex: id }));
    const hex = hexGrid.find(h => h.id === id)!;
    addLog('SYSTEM', `Customer moved to Hex ${hex.label}`, { s2d: calculateS2D(hex) });
  }, [order.state, hexGrid, addLog]);

  const handleSelectPersona = useCallback((persona: UserPersona) => {
    setOrder(prev => ({ ...prev, persona }));
    addLog('SYSTEM', `Persona changed to ${PERSONA_CONFIGS[persona].label}`);
  }, [addLog]);

  const handleAddToCart = useCallback(() => {
    setOrder(prev => ({ ...prev, state: 'CHECKOUT' }));
    addLog('SYSTEM', 'Items added to cart. Ready for checkout.');
  }, [addLog]);

  const handleCheckout = useCallback(() => {
    setOrder(prev => ({ ...prev, state: 'OPTIMIZING' }));
    addLog('PROMISE', '🔄 Initiating TES optimization loop...');

    setTimeout(() => {
      const bestRider = selectBestRider(riders, order.selectedHex);
      const tes = calculateTES(liveS2D, bestRider.rating, pickingVariance, packerCongestion, personaConfig.baseTESModifier);

      addLog('PROMISE', '✅ Optimization complete.', {
        optimalPromise: tes.optimalPromise,
        maxTES: tes.maxTES,
        riderSelected: bestRider.name,
      });

      addLog('ASSIGNMENT', `🏍️ Locking rider: ${bestRider.name} (${bestRider.archetype})`, {
        rating: bestRider.rating,
        speed: bestRider.speedFactor,
      });

      setRiders(prev => prev.map(r => r.id === bestRider.id ? { ...r, status: 'assigned' } : r));

      setOrder(prev => ({
        ...prev,
        id: generateOrderId(),
        state: 'FULFILLMENT',
        fulfillmentStatus: 'created',
        promiseMinutes: tes.optimalPromise,
        tes: tes.maxTES,
        assignedRider: bestRider,
        startTime: Date.now(),
      }));
    }, 1500);
  }, [riders, order.selectedHex, liveS2D, pickingVariance, packerCongestion, personaConfig, addLog]);

  const handleAdvanceStatus = useCallback((orderId: string) => {
    setOrder(prev => {
      if (prev.id !== orderId) return prev;
      const next = getNextFulfillmentStatus(prev.fulfillmentStatus);
      if (!next) return prev;

      addLog('SYSTEM', `Order ${orderId} status: ${prev.fulfillmentStatus} → ${next}`);

      if (next === 'delivered') {
        // Archive order
        setTimeout(() => {
          setPastOrders(p => [{ ...prev, fulfillmentStatus: 'delivered', state: 'DELIVERED' }, ...p]);
          setOrder({ ...initialOrder });
          setRiders(RIDER_DATABASE.map(r => ({ ...r })));
        }, 500);
        return { ...prev, fulfillmentStatus: next, state: 'DELIVERED' };
      }

      return { ...prev, fulfillmentStatus: next };
    });
  }, [addLog]);

  const handleAddDelay = useCallback((orderId: string, status: FulfillmentStatus, delaySec: number) => {
    setOrder(prev => {
      if (prev.id !== orderId) return prev;
      const existing = prev.delays[status] || 0;
      addLog('SYSTEM', `⚠️ Delay injected at ${status}: +${delaySec}s`, { orderId, status });

      // If delay causes picking to exceed threshold, trigger recovery
      if (status === 'picked' && !prev.delays.picked) {
        addLog('RECOVERY', '🔄 Recovery Protocol activated. Scanning active riders...');
        const recoveryRider = findRecoveryRider(riders, prev.assignedRider?.id);
        addLog('RECOVERY', `✅ Re-assigned to ${recoveryRider.name} (${recoveryRider.archetype})`, {
          localityAwareness: recoveryRider.localityAwareness,
        });
        return {
          ...prev,
          delays: { ...prev.delays, [status]: existing + delaySec },
          assignedRider: recoveryRider,
          state: 'FULFILLMENT' as const,
        };
      }

      return { ...prev, delays: { ...prev.delays, [status]: existing + delaySec } };
    });
  }, [riders, addLog]);

  const handleReset = useCallback(() => {
    if (order.id) {
      setPastOrders(p => [{ ...order }, ...p]);
    }
    setOrder({ ...initialOrder });
    setLogs([]);
    setRiders(RIDER_DATABASE.map(r => ({ ...r })));
  }, [order]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Title bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground tracking-tight flex items-center gap-2">
            <span className="text-neon">⚡</span> Q-Comm Fulfillment Control Tower
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Dark Store Logistics Simulation • Bengaluru</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {['PROMISE', 'ASSIGNMENT', 'RECOVERY'].map(agent => (
            <div key={agent} className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary">
              <div className={`w-1.5 h-1.5 rounded-full ${
                agent === 'PROMISE' ? 'bg-neon' : agent === 'ASSIGNMENT' ? 'bg-rider-blue' : 'bg-recovery-gold'
              }`} />
              <span className="text-[10px] font-mono text-muted-foreground">{agent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Left: Storefront */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Storefront</span>
          </div>
          <StorefrontPanel
            order={order}
            hexGrid={hexGrid}
            onSelectHex={handleSelectHex}
            onAddToCart={handleAddToCart}
            onCheckout={handleCheckout}
            onSelectPersona={handleSelectPersona}
            livePromise={livePromise}
          />
        </div>

        {/* Right: Store Operations */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-warn" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Store Operations</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <StoreOpsPanel
              currentOrder={order}
              pastOrders={pastOrders}
              riders={riders}
              hexGrid={hexGrid}
              onAddDelay={handleAddDelay}
              onAdvanceStatus={handleAdvanceStatus}
              onReset={handleReset}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
