import { OrderData, Rider, FULFILLMENT_STEPS, FulfillmentStatus, HexCell } from '@/lib/simulation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Package, Star, Plus } from 'lucide-react';

interface StoreOpsPanelProps {
  activeOrders: OrderData[];
  pastOrders: OrderData[];
  riders: Rider[];
  hexGrid: HexCell[];
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
  onAddDelay,
  onAdvanceStatus,
  onReset,
}: StoreOpsPanelProps) {
  const allOrders = [...activeOrders.filter(o => o.id), ...pastOrders];
  const liveOrders = activeOrders.filter(o => o.id && o.state !== 'DELIVERED');

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

      <Tabs defaultValue="orders" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="orders" className="flex-1 text-[10px] font-mono">Queue ({allOrders.length})</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1 text-[10px] font-mono">Manage ({liveOrders.length})</TabsTrigger>
          <TabsTrigger value="riders" className="flex-1 text-[10px] font-mono">Riders</TabsTrigger>
        </TabsList>

        {/* Order Queue */}
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

        {/* Manage Active Orders */}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[9px] font-mono text-amber-warn hover:text-amber-warn gap-1"
                          onClick={() => onAddDelay(order.id, step, 30)}
                        >
                          <AlertTriangle size={9} /> +30s
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              {order.fulfillmentStatus !== 'delivered' && (
                <Button
                  onClick={() => onAdvanceStatus(order.id)}
                  className="w-full mt-2 gap-1 font-mono text-[10px] bg-neon text-primary-foreground hover:bg-neon/90"
                  size="sm"
                >
                  <Plus size={10} /> Advance Status
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Riders */}
        <TabsContent value="riders" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-1.5">
          {riders.map(rider => {
            const totalOrders = Object.values(rider.ordersCompleted).reduce((a, b) => a + b, 0);
            return (
              <div key={rider.id} className="bg-card border border-border rounded-lg p-2.5">
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
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
