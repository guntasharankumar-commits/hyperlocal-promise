import { useState, useCallback, useMemo } from 'react';
import ConsumerPanel from '@/components/ConsumerPanel';
import BrainPanel from '@/components/BrainPanel';
import {
  generateHexGrid,
  calculateS2D,
  calculateTES,
  selectBestRider,
  findRecoveryRider,
  RIDER_DATABASE,
  initialOrder,
  OrderData,
  AgentLog,
  Rider,
} from '@/lib/simulation';

export default function Index() {
  const hexGrid = useMemo(() => generateHexGrid(), []);
  const [order, setOrder] = useState<OrderData>({ ...initialOrder });
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [riders, setRiders] = useState<Rider[]>(RIDER_DATABASE.map(r => ({ ...r })));
  const [pickingVariance, setPickingVariance] = useState(1.0);
  const [packerCongestion, setPackerCongestion] = useState(30);

  const addLog = useCallback((agent: AgentLog['agent'], message: string, data?: Record<string, unknown>) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), agent, message, data }]);
  }, []);

  const selectedHexCell = hexGrid.find(h => h.id === order.selectedHex) || hexGrid[4];
  const liveS2D = calculateS2D(selectedHexCell);
  const livePromise = Math.ceil(liveS2D + 2 + pickingVariance);

  const handleSelectHex = useCallback((id: number) => {
    if (order.state !== 'BROWSE' && order.state !== 'CHECKOUT') return;
    setOrder(prev => ({ ...prev, selectedHex: id }));
    const hex = hexGrid.find(h => h.id === id)!;
    addLog('SYSTEM', `Customer moved to Hex ${hex.label}`, { s2d: calculateS2D(hex), baseTime: hex.baseS2DMinutes });
  }, [order.state, hexGrid, addLog]);

  const handleAddToCart = useCallback(() => {
    setOrder(prev => ({ ...prev, state: 'CHECKOUT' }));
    addLog('SYSTEM', 'Items added to cart. Ready for checkout.', { state: 'CHECKOUT', hex: selectedHexCell.label });
  }, [addLog, selectedHexCell]);

  const handleCheckout = useCallback(() => {
    setOrder(prev => ({ ...prev, state: 'OPTIMIZING' }));
    addLog('PROMISE', '🔄 Initiating TES optimization loop...', { iterating: 'P=[8..15]' });

    setTimeout(() => {
      const bestRider = selectBestRider(riders, order.selectedHex);
      const tes = calculateTES(liveS2D, bestRider.rating, pickingVariance, packerCongestion);

      addLog('PROMISE', '✅ Optimization complete.', {
        optimalPromise: tes.optimalPromise,
        maxTES: tes.maxTES,
        riderSelected: bestRider.name,
        breakdown: tes.breakdown.slice(0, 3),
      });

      addLog('ASSIGNMENT', `🏍️ Locking rider: ${bestRider.name} (${bestRider.archetype})`, {
        rating: bestRider.rating,
        speed: bestRider.speedFactor,
        locality: bestRider.localityAwareness,
      });

      setRiders(prev => prev.map(r => r.id === bestRider.id ? { ...r, status: 'assigned' } : r));

      setOrder(prev => ({
        ...prev,
        state: 'FULFILLMENT',
        promiseMinutes: tes.optimalPromise,
        tes: tes.maxTES,
        assignedRider: bestRider,
        startTime: Date.now(),
      }));
    }, 1500);
  }, [riders, order.selectedHex, liveS2D, pickingVariance, packerCongestion, addLog]);

  const handleSimulateDelay = useCallback(() => {
    if (order.state !== 'FULFILLMENT') return;

    addLog('SYSTEM', '⚠️ ALERT: Picking delay detected! Actual > Planned + 1.5σ', {
      trigger: 'Picking_Time exceeded threshold',
      sigma: pickingVariance,
    });

    setOrder(prev => ({ ...prev, state: 'RECOVERY' }));

    addLog('RECOVERY', '🔄 Recovery Protocol activated. Scanning active riders...', {
      strategy: 'Prioritize Locality Awareness to shave 2-3 min off S2D',
    });

    setTimeout(() => {
      const recoveryRider = findRecoveryRider(riders, order.assignedRider?.id);
      const newTes = calculateTES(liveS2D, recoveryRider.rating, pickingVariance * 0.7, packerCongestion);

      addLog('RECOVERY', `✅ Re-assigned to ${recoveryRider.name} (${recoveryRider.archetype})`, {
        localityAwareness: recoveryRider.localityAwareness,
        newTES: newTes.maxTES,
        timeSaved: '~2.5 min',
      });

      setOrder(prev => ({
        ...prev,
        state: 'FULFILLMENT',
        assignedRider: recoveryRider,
        tes: newTes.maxTES,
      }));
    }, 1200);
  }, [order, riders, liveS2D, pickingVariance, packerCongestion, addLog]);

  const handleReset = useCallback(() => {
    setOrder({ ...initialOrder });
    setLogs([]);
    setRiders(RIDER_DATABASE.map(r => ({ ...r })));
    setPickingVariance(1.0);
    setPackerCongestion(30);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Title bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground tracking-tight flex items-center gap-2">
            <span className="text-neon">⚡</span> Q-Comm Fulfillment Control Tower
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Dark Store Logistics Simulation • Agentic Promise Engine</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Left: Consumer App */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Consumer App</span>
          </div>
          <ConsumerPanel
            order={order}
            hexGrid={hexGrid}
            onSelectHex={handleSelectHex}
            onAddToCart={handleAddToCart}
            onCheckout={handleCheckout}
            livePromise={livePromise}
          />
        </div>

        {/* Right: Brain */}
        <div>
          <BrainPanel
            order={order}
            logs={logs}
            pickingVariance={pickingVariance}
            packerCongestion={packerCongestion}
            onPickingVarianceChange={setPickingVariance}
            onPackerCongestionChange={setPackerCongestion}
            onSimulateDelay={handleSimulateDelay}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
