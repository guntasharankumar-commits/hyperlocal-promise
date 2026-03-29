import { OrderData, Rider, FULFILLMENT_STEPS, FulfillmentStatus, HexCell, StoreConfig } from '@/lib/simulation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Package, Star, Plus, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface StoreOpsPanelProps {
  activeOrders: OrderData[];
  pastOrders: OrderData[];
  riders: Rider[];
  hexGrid: HexCell[];
  storeConfig: StoreConfig;
  onStoreConfigChange: (config: StoreConfig) => void;
  onAddDelay: (orderId: string, status: FulfillmentStatus, delaySec: number) => void;
  onAdvanceStatus: (orderId: string) => void;
  onReset: () => void;
}

const statusColors: Record<FulfillmentStatus, string> = {
  created: 'bg-muted-foreground',
  picked: 'bg-amber-warn',
  packed: 'bg-amber-warn',
  handover: 'bg-rider-blue',
  intransit: 'bg-rider-blue',
  delivered: 'bg-neon',
};

export default function StoreOpsPanel({
  activeOrders,
  pastOrders,
  riders,
  hexGrid,
  storeConfig,
  onStoreConfigChange,
  onAddDelay,
  onAdvanceStatus,
  onReset,
}: StoreOpsPanelProps) {
  const [configOpen, setConfigOpen] = useState(true);
  const [draftConfig, setDraftConfig] = useState<StoreConfig>({ ...storeConfig });
  const allOrders = [...activeOrders.filter(o => o.id), ...pastOrders];
  const liveOrders = activeOrders.filter(o => o.id && o.state !== 'DELIVERED');
  const idleRiders = riders.filter(r => r.status === 'idle');
  const activeRiders = riders.filter(r => r.status !== 'idle');

  const isDirty = JSON.stringify(draftConfig) !== JSON.stringify(storeConfig);

  const updateDraft = (key: keyof StoreConfig, value: number) => {
    setDraftConfig(prev => ({ ...prev, [key]: value }));
  };

  const confirmConfig = () => {
    onStoreConfigChange(draftConfig);
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-neon" />
          <h2 className="font-display font-bold text-foreground text-xs tracking-wide uppercase">Store Ops</h2>
        </div>
        <Button onClick={onReset} variant="outline" size="sm" className="font-mono text-[10px] h-7">
          RESET ALL
        </Button>
      </div>

      {/* Store Config — Collapsible separate section */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <div className="bg-secondary/30 border border-border rounded-lg">
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 cursor-pointer">
            {configOpen ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
            <Settings size={14} className="text-neon" />
            <span className="text-xs font-display font-bold text-foreground">Store Config</span>
            <span className="text-[9px] font-mono text-muted-foreground ml-auto">
              O2S: {(draftConfig.avgPickingTime + draftConfig.pickingVariance + draftConfig.avgPackingTime + draftConfig.packingVariance).toFixed(1)}m
              {isDirty && <span className="text-recovery-gold ml-1">• unsaved</span>}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-2.5 pb-2.5 space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Avg Picking Time</span>
                  <span className="text-[10px] font-mono font-bold text-foreground">{draftConfig.avgPickingTime} min</span>
                </div>
                <Slider value={[draftConfig.avgPickingTime]} onValueChange={([v]) => updateDraft('avgPickingTime', v)} min={1} max={10} step={0.5} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Picking Variance</span>
                  <span className="text-[10px] font-mono font-bold text-foreground">{draftConfig.pickingVariance} min</span>
                </div>
                <Slider value={[draftConfig.pickingVariance]} onValueChange={([v]) => updateDraft('pickingVariance', v)} min={0} max={3} step={0.1} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Avg Packing Time</span>
                  <span className="text-[10px] font-mono font-bold text-foreground">{draftConfig.avgPackingTime} min</span>
                </div>
                <Slider value={[draftConfig.avgPackingTime]} onValueChange={([v]) => updateDraft('avgPackingTime', v)} min={1} max={5} step={0.5} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground">Packing Variance</span>
                  <span className="text-[10px] font-mono font-bold text-foreground">{draftConfig.packingVariance} min</span>
                </div>
                <Slider value={[draftConfig.packingVariance]} onValueChange={([v]) => updateDraft('packingVariance', v)} min={0} max={3} step={0.1} />
              </div>
              <div className="bg-secondary rounded-lg p-2">
                <div className="text-[10px] font-mono text-muted-foreground mb-0.5">Computed O2S</div>
                <div className="text-lg font-mono font-bold text-neon">
                  {(draftConfig.avgPickingTime + draftConfig.pickingVariance + draftConfig.avgPackingTime + draftConfig.packingVariance).toFixed(1)} min
                </div>
                <div className="text-[9px] font-mono text-muted-foreground">
                  Pick({draftConfig.avgPickingTime}) + PV({draftConfig.pickingVariance}) + Pack({draftConfig.avgPackingTime}) + PKV({draftConfig.packingVariance})
                </div>
              </div>
              <Button
                onClick={confirmConfig}
                disabled={!isDirty}
                className="w-full gap-2 font-mono text-[10px] h-8 bg-neon text-primary-foreground hover:bg-neon/90 disabled:opacity-40"
                size="sm"
              >
                <Settings size={12} /> Confirm Config Changes
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Order & Rider Management — 3 tabs */}
      <Tabs defaultValue="orders" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="orders" className="flex-1 text-[10px] font-mono">Orders ({allOrders.length})</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1 text-[10px] font-mono">Pipeline ({liveOrders.length})</TabsTrigger>
          <TabsTrigger value="riders" className="flex-1 text-[10px] font-mono">Riders ({riders.length})</TabsTrigger>
        </TabsList>

        {/* Order List */}
        <TabsContent value="orders" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-1.5">
          {allOrders.length === 0 && (
            <div className="text-center py-6 text-muted-foreground font-mono text-xs">No orders yet</div>
          )}
          {allOrders.map((order, i) => (
            <div key={order.id || i} className={`bg-card border rounded-lg p-2.5 ${order.state !== 'DELIVERED' ? 'border-neon/20' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-foreground">{order.id}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColors[order.fulfillmentStatus]}`} />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{order.fulfillmentStatus}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
                <span>{hexGrid.find(h => h.id === order.selectedHex)?.label}</span>
                <span>{order.promiseMinutes ?? '-'}m</span>
                <Badge variant="secondary" className="text-[8px]">{order.persona}</Badge>
                {order.assignedRider && <span>{order.assignedRider.name}</span>}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Pipeline Queue */}
        <TabsContent value="manage" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-2">
          {liveOrders.length === 0 && (
            <div className="text-center py-6 text-muted-foreground font-mono text-xs">No active orders</div>
          )}
          {liveOrders.map(order => (
            <div key={order.id} className="bg-card border border-neon/20 rounded-lg p-2.5">
              <div className="text-[10px] font-mono font-bold text-foreground mb-1.5">{order.id} — {order.persona}</div>
              <div className="space-y-1">
                {FULFILLMENT_STEPS.map((step, idx) => {
                  const currentIdx = FULFILLMENT_STEPS.indexOf(order.fulfillmentStatus);
                  const isActive = idx === currentIdx;
                  const isDone = idx < currentIdx;
                  const isFuture = idx > currentIdx;
                  return (
                    <div key={step} className={`flex items-center justify-between px-2 py-1 rounded ${isActive ? 'bg-secondary border border-neon/20' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-neon' : isActive ? 'bg-neon animate-pulse-neon' : 'bg-muted-foreground/30'}`} />
                        <span className={`text-[10px] font-mono ${isDone ? 'text-neon' : isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                          {step}
                        </span>
                        {order.delays[step] && <Badge variant="destructive" className="text-[8px]">+{order.delays[step]}s</Badge>}
                      </div>
                      {(isActive || isFuture) && order.state !== 'DELIVERED' && (
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] font-mono text-amber-warn hover:text-amber-warn gap-1" onClick={() => onAddDelay(order.id, step, 30)}>
                          <AlertTriangle size={9} /> +30s
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              {order.fulfillmentStatus !== 'delivered' && (
                <Button onClick={() => onAdvanceStatus(order.id)} className="w-full mt-2 gap-1 font-mono text-[10px] bg-neon text-primary-foreground hover:bg-neon/90" size="sm">
                  <Plus size={10} /> Advance Status
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Riders — with active/idle sections */}
        <TabsContent value="riders" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-3">
          {/* Active Riders */}
          {activeRiders.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
                Active ({activeRiders.length})
              </div>
              {activeRiders.map(rider => <RiderCard key={rider.id} rider={rider} />)}
            </div>
          )}
          {/* Idle Riders */}
          <div>
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              Idle ({idleRiders.length})
            </div>
            {idleRiders.map(rider => <RiderCard key={rider.id} rider={rider} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiderCard({ rider }: { rider: Rider }) {
  const totalOrders = Object.values(rider.ordersCompleted).reduce((a, b) => a + b, 0);
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 mb-1.5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">🏍️</span>
          <div>
            <div className="text-xs font-display font-semibold text-foreground">{rider.name}</div>
            <div className="text-[9px] font-mono text-muted-foreground">{rider.archetype}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Star size={10} className="text-recovery-gold fill-recovery-gold" />
          <span className="text-xs font-mono font-bold text-foreground">{rider.rating}</span>
          <Badge variant={rider.status === 'idle' ? 'secondary' : 'default'} className="text-[8px] ml-1">
            {rider.status}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-1.5 text-[9px] font-mono">
        <div className="bg-secondary rounded p-1 text-center">
          <div className="text-muted-foreground">Spd</div>
          <div className="text-foreground font-bold">{rider.speedFactor}x</div>
        </div>
        <div className="bg-secondary rounded p-1 text-center">
          <div className="text-muted-foreground">Loc</div>
          <div className="text-foreground font-bold">{rider.localityAwareness}/10</div>
        </div>
        <div className="bg-secondary rounded p-1 text-center">
          <div className="text-muted-foreground">Orders</div>
          <div className="text-foreground font-bold">{totalOrders}</div>
        </div>
      </div>
      <div className="flex gap-0.5 flex-wrap mt-1.5">
        {Object.entries(rider.ordersCompleted).slice(0, 7).map(([hex, count]) => (
          <span key={hex} className="bg-secondary text-foreground text-[8px] font-mono px-1 py-0.5 rounded">
            {hex}:{count}
          </span>
        ))}
      </div>
    </div>
  );
}
