import { useState, useCallback, useMemo } from 'react';
import StorefrontPanel from '@/components/StorefrontPanel';
import StoreOpsPanel from '@/components/StoreOpsPanel';
import ControlTowerPanel from '@/components/ControlTowerPanel';
import {
  generateHexGrid,
  calculateS2D,
  calculateTES,
  calculateO2S,
  selectBestRider,
  findRecoveryRider,
  getCachedPromise,
  getNextFulfillmentStatus,
  generateOrderId,
  RIDER_DATABASE,
  PERSONA_CONFIGS,
  DEFAULT_STORE_CONFIG,
  initialOrder,
  OrderData,
  AgentLog,
  AgentPipelineStep,
  Rider,
  UserPersona,
  FulfillmentStatus,
  StoreConfig,
} from '@/lib/simulation';

export default function Index() {
  const hexGrid = useMemo(() => generateHexGrid(), []);
  const [activeOrders, setActiveOrders] = useState<OrderData[]>([{ ...initialOrder }]);
  const [currentOrderIndex, setCurrentOrderIndex] = useState(0);
  const [pastOrders, setPastOrders] = useState<OrderData[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [pipelineSteps, setPipelineSteps] = useState<AgentPipelineStep[]>([]);
  const [riders, setRiders] = useState<Rider[]>(RIDER_DATABASE.map(r => ({ ...r })));
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({ ...DEFAULT_STORE_CONFIG });
  const [cacheVersion, setCacheVersion] = useState(0);
  const invalidateCache = useCallback(() => setCacheVersion(v => v + 1), []);

  const currentOrder = activeOrders[currentOrderIndex] || activeOrders[0] || { ...initialOrder };

  const addLog = useCallback((agent: AgentLog['agent'], message: string, data?: Record<string, unknown>) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), agent, message, data }]);
  }, []);

  const updateCurrentOrder = useCallback((updater: (prev: OrderData) => OrderData) => {
    setActiveOrders(prev => prev.map((o, i) => i === currentOrderIndex ? updater(o) : o));
  }, [currentOrderIndex]);

  const updateOrderById = useCallback((orderId: string, updater: (prev: OrderData) => OrderData) => {
    setActiveOrders(prev => prev.map(o => o.id === orderId ? updater(o) : o));
  }, []);

  const selectedHexCell = hexGrid.find(h => h.id === currentOrder.selectedHex) || hexGrid[0];
  const liveS2D = calculateS2D(selectedHexCell);
  const personaConfig = PERSONA_CONFIGS[currentOrder.persona];

  const livePromise = currentOrder.state === 'BROWSE'
    ? getCachedPromise(selectedHexCell, currentOrder.persona, storeConfig)
    : Math.ceil(calculateO2S(storeConfig) + liveS2D + personaConfig.promisePadding);

  const handleSelectHex = useCallback((id: number) => {
    if (currentOrder.state !== 'BROWSE' && currentOrder.state !== 'CHECKOUT') return;
    updateCurrentOrder(prev => ({ ...prev, selectedHex: id }));
    const hex = hexGrid.find(h => h.id === id)!;
    addLog('SYSTEM', `Customer moved to Hex ${hex.label}`, { s2d: calculateS2D(hex) });
  }, [currentOrder.state, hexGrid, addLog, updateCurrentOrder]);

  const handleSelectPersona = useCallback((persona: UserPersona) => {
    updateCurrentOrder(prev => ({ ...prev, persona }));
    addLog('SYSTEM', `Persona changed to ${PERSONA_CONFIGS[persona].label}`);
  }, [addLog, updateCurrentOrder]);

  const handleAddToCart = useCallback(() => {
    updateCurrentOrder(prev => ({ ...prev, state: 'CHECKOUT' }));
    addLog('SYSTEM', 'Items added to cart. Ready for checkout.');
  }, [addLog, updateCurrentOrder]);

  const handleCheckout = useCallback(() => {
    updateCurrentOrder(prev => ({ ...prev, state: 'OPTIMIZING' }));

    setPipelineSteps([
      { agent: 'DATABASE', label: 'Database Lookup', status: 'running' },
      { agent: 'PROMISE', label: 'TES Optimization', status: 'pending' },
      { agent: 'ASSIGNMENT', label: 'Rider Assignment', status: 'pending' },
    ]);

    addLog('DATABASE', '🔍 Looking up customer history & store health...');

    setTimeout(() => {
      const o2s = calculateO2S(storeConfig);
      setPipelineSteps(prev => prev.map(s =>
        s.agent === 'DATABASE' ? { ...s, status: 'done' as const, output: { persona: currentOrder.persona, storeHealth: 'normal', o2s: Math.round(o2s * 10) / 10, storeConfig } } :
        s.agent === 'PROMISE' ? { ...s, status: 'running' as const } : s
      ));
      addLog('DATABASE', '✅ Customer data loaded.', { persona: currentOrder.persona, o2s });
      addLog('PROMISE', '🔄 Calculating TES for P=5..18 with O2S + S2D...');

      setTimeout(() => {
        const { rider: bestRider, tes } = selectBestRider(riders, currentOrder.selectedHex, liveS2D, storeConfig, personaConfig.baseTESModifier);

        // Log full breakdown
        addLog('PROMISE', `📊 TES breakdown (O2S=${tes.o2s}m, S2D=${tes.s2d}m, D=${tes.plannedD}m):`, {
          breakdown: tes.breakdown,
          optimalPromise: tes.optimalPromise,
          minTES: tes.minTES,
        });

        setPipelineSteps(prev => prev.map(s =>
          s.agent === 'PROMISE' ? { ...s, status: 'done' as const, output: { optimalPromise: tes.optimalPromise, minTES: tes.minTES, o2s: tes.o2s, s2d: tes.s2d, plannedD: tes.plannedD } } :
          s.agent === 'ASSIGNMENT' ? { ...s, status: 'running' as const } : s
        ));

        addLog('PROMISE', `✅ Promise = ${tes.optimalPromise}m (min TES: ${tes.minTES})`);

        setTimeout(() => {
          setPipelineSteps(prev => prev.map(s =>
            s.agent === 'ASSIGNMENT' ? { ...s, status: 'done' as const, output: { rider: bestRider.name, archetype: bestRider.archetype, rating: bestRider.rating, reason: 'Max TES rider' } } : s
          ));

          addLog('ASSIGNMENT', `🏍️ Locked rider: ${bestRider.name} (${bestRider.archetype}) — best TES`, {
            rating: bestRider.rating, speed: bestRider.speedFactor,
          });

          setRiders(prev => prev.map(r => r.id === bestRider.id ? { ...r, status: 'assigned' } : r));

          updateCurrentOrder(prev => ({
            ...prev,
            id: generateOrderId(),
            state: 'FULFILLMENT',
            fulfillmentStatus: 'created',
            promiseMinutes: tes.optimalPromise,
            tes: tes.minTES,
            assignedRider: bestRider,
            startTime: Date.now(),
          }));

          invalidateCache();
        }, 600);
      }, 800);
    }, 600);
  }, [riders, currentOrder.selectedHex, currentOrder.persona, liveS2D, storeConfig, personaConfig, addLog, updateCurrentOrder, invalidateCache]);

  const handleAdvanceStatus = useCallback((orderId: string) => {
    updateOrderById(orderId, (prev) => {
      const next = getNextFulfillmentStatus(prev.fulfillmentStatus);
      if (!next) return prev;

      addLog('SYSTEM', `Order ${orderId} status: ${prev.fulfillmentStatus} → ${next}`);

      if (next === 'delivered') {
        setTimeout(() => {
          setActiveOrders(orders => orders.filter(o => o.id !== orderId));
          setPastOrders(p => [{ ...prev, fulfillmentStatus: 'delivered', state: 'DELIVERED' }, ...p]);
          if (prev.assignedRider) {
            setRiders(r => r.map(rider => rider.id === prev.assignedRider!.id ? { ...rider, status: 'idle' } : rider));
          }
        }, 500);
        return { ...prev, fulfillmentStatus: next, state: 'DELIVERED' };
      }

      return { ...prev, fulfillmentStatus: next };
    });
  }, [addLog, updateOrderById]);

  const handleAddDelay = useCallback((orderId: string, status: FulfillmentStatus, delaySec: number) => {
    updateOrderById(orderId, (prev) => {
      const existing = prev.delays[status] || 0;
      addLog('SYSTEM', `⚠️ Delay injected at ${status}: +${delaySec}s`, { orderId, status });

      if (status === 'picked' && !prev.delays.picked) {
        addLog('RECOVERY', '🔄 Recovery Protocol activated — recalculating with actual O2S.');

        // Use actual elapsed O2S
        const elapsedMs = prev.startTime ? Date.now() - prev.startTime : 0;
        const actualO2S = elapsedMs / 60000; // convert to minutes
        
        const hex = hexGrid.find(h => h.id === prev.selectedHex)!;
        const s2d = calculateS2D(hex);
        const recoveryTes = calculateTES(s2d, prev.assignedRider?.rating || 4, storeConfig, PERSONA_CONFIGS[prev.persona].baseTESModifier, actualO2S);

        addLog('RECOVERY', `📊 Recovery TES recalc (actual O2S=${Math.round(actualO2S * 10) / 10}m)`, {
          newPromise: recoveryTes.optimalPromise,
          newTES: recoveryTes.minTES,
        });

        const recoveryRider = findRecoveryRider(riders, prev.assignedRider?.id);
        addLog('RECOVERY', `✅ Re-assigned to ${recoveryRider.name}`, { localityAwareness: recoveryRider.localityAwareness });

        setPipelineSteps(p => [...p, {
          agent: 'RECOVERY',
          label: 'Recovery Protocol',
          status: 'done' as const,
          output: { newRider: recoveryRider.name, reason: 'Picking delay', actualO2S: Math.round(actualO2S * 10) / 10, newPromise: recoveryTes.optimalPromise },
        }]);

        return {
          ...prev,
          delays: { ...prev.delays, [status]: existing + delaySec },
          assignedRider: recoveryRider,
          promiseMinutes: recoveryTes.optimalPromise,
          tes: recoveryTes.minTES,
          state: 'FULFILLMENT' as const,
        };
      }

      return { ...prev, delays: { ...prev.delays, [status]: existing + delaySec } };
    });
  }, [riders, hexGrid, storeConfig, addLog, updateOrderById]);

  const handleNewOrder = useCallback(() => {
    setActiveOrders(prev => [...prev, { ...initialOrder }]);
    setCurrentOrderIndex(prev => activeOrders.length);
    setPipelineSteps([]);
  }, [activeOrders.length]);

  const handleSelectActiveOrder = useCallback((orderId: string) => {
    const idx = activeOrders.findIndex(o => o.id === orderId);
    if (idx >= 0) setCurrentOrderIndex(idx);
  }, [activeOrders]);

  const handleReset = useCallback(() => {
    activeOrders.forEach(o => {
      if (o.id) setPastOrders(p => [{ ...o }, ...p]);
    });
    setActiveOrders([{ ...initialOrder }]);
    setCurrentOrderIndex(0);
    setLogs([]);
    setPipelineSteps([]);
    setRiders(RIDER_DATABASE.map(r => ({ ...r })));
  }, [activeOrders]);

  return (
    <div className="min-h-screen bg-background p-3">
      {/* Title bar */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
            <span className="text-neon">⚡</span> Q-Comm Control Tower
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground">Dark Store Logistics Simulation • Bengaluru</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {['PROMISE', 'ASSIGNMENT', 'RECOVERY', 'DATABASE'].map(agent => (
            <div key={agent} className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary">
              <div className={`w-1.5 h-1.5 rounded-full ${
                agent === 'PROMISE' ? 'bg-neon' :
                agent === 'ASSIGNMENT' ? 'bg-rider-blue' :
                agent === 'RECOVERY' ? 'bg-recovery-gold' :
                'bg-purple-400'
              }`} />
              <span className="text-[9px] font-mono text-muted-foreground">{agent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr] gap-4" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Left: Storefront */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-neon" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Storefront</span>
          </div>
          <div className="flex-1 min-h-0">
            <StorefrontPanel
              currentOrder={currentOrder}
              activeOrders={activeOrders}
              hexGrid={hexGrid}
              onSelectHex={handleSelectHex}
              onAddToCart={handleAddToCart}
              onCheckout={handleCheckout}
              onSelectPersona={handleSelectPersona}
              onNewOrder={handleNewOrder}
              onSelectActiveOrder={handleSelectActiveOrder}
              livePromise={livePromise}
            />
          </div>
        </div>

        {/* Center: Control Tower */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-rider-blue" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Control Tower</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto terminal-scrollbar">
            <ControlTowerPanel
              logs={logs}
              pipelineSteps={pipelineSteps}
              selectedOrder={currentOrder}
            />
          </div>
        </div>

        {/* Right: Store Operations */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-warn" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Store Operations</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 overflow-hidden">
            <StoreOpsPanel
              activeOrders={activeOrders}
              pastOrders={pastOrders}
              riders={riders}
              hexGrid={hexGrid}
              storeConfig={storeConfig}
              onStoreConfigChange={setStoreConfig}
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
