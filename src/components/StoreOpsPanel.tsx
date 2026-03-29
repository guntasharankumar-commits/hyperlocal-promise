import { OrderData, Rider, FULFILLMENT_STEPS, FulfillmentStatus, HexCell } from '@/lib/simulation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Package, Star, Bike, Plus } from 'lucide-react';

interface StoreOpsPanelProps {
  currentOrder: OrderData;
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
  currentOrder,
  pastOrders,
  riders,
  hexGrid,
  onAddDelay,
  onAdvanceStatus,
  onReset,
}: StoreOpsPanelProps) {
  const allOrders = currentOrder.id ? [currentOrder, ...pastOrders] : pastOrders;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-neon" />
          <h2 className="font-display font-bold text-foreground text-sm tracking-wide uppercase">Store Operations</h2>
        </div>
        <Button onClick={onReset} variant="outline" size="sm" className="font-mono text-xs">
          RESET
        </Button>
      </div>

      <Tabs defaultValue="orders" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="orders" className="flex-1 text-xs font-mono">Order Queue</TabsTrigger>
          <TabsTrigger value="manage" className="flex-1 text-xs font-mono">Manage</TabsTrigger>
          <TabsTrigger value="riders" className="flex-1 text-xs font-mono">Riders</TabsTrigger>
        </TabsList>

        {/* Tab 1: Order Queue */}
        <TabsContent value="orders" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-2">
          {allOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground font-mono text-xs">No orders yet</div>
          )}
          {allOrders.map((order, i) => (
            <div key={order.id || i} className={`bg-card border rounded-lg p-3 ${i === 0 && currentOrder.id ? 'border-neon/30' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-foreground">{order.id}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusColors[order.fulfillmentStatus]}`} />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{order.fulfillmentStatus}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                <span>Hex {hexGrid.find(h => h.id === order.selectedHex)?.label}</span>
                <span>Promise: {order.promiseMinutes ?? '-'}m</span>
                {order.assignedRider && <span>Rider: {order.assignedRider.name}</span>}
              </div>
              {Object.keys(order.delays).length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {Object.entries(order.delays).map(([status, delay]) => (
                    <Badge key={status} variant="destructive" className="text-[9px]">
                      {status}: +{delay}s
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Tab 2: Order Management */}
        <TabsContent value="manage" className="flex-1 overflow-y-auto terminal-scrollbar mt-2">
          {!currentOrder.id ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-xs">No active order</div>
          ) : (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="text-xs font-mono font-bold text-foreground mb-2">Order {currentOrder.id}</div>

                {/* Status progression with delay buttons */}
                <div className="space-y-2">
                  {FULFILLMENT_STEPS.map((step, idx) => {
                    const currentIdx = FULFILLMENT_STEPS.indexOf(currentOrder.fulfillmentStatus);
                    const isActive = idx === currentIdx;
                    const isDone = idx < currentIdx;
                    const isFuture = idx > currentIdx;
                    const hasDelay = currentOrder.delays[step];

                    return (
                      <div key={step} className={`flex items-center justify-between px-2 py-1.5 rounded ${isActive ? 'bg-secondary border border-neon/20' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-neon' : isActive ? 'bg-neon animate-pulse-neon' : 'bg-muted-foreground/30'}`} />
                          <span className={`text-xs font-mono ${isDone ? 'text-neon' : isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                            {step}
                          </span>
                          {hasDelay && <Badge variant="destructive" className="text-[9px]">+{hasDelay}s</Badge>}
                        </div>
                        {(isActive || isFuture) && currentOrder.state !== 'DELIVERED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-mono text-amber-warn hover:text-amber-warn gap-1"
                            onClick={() => onAddDelay(currentOrder.id, step, 30)}
                          >
                            <AlertTriangle size={10} /> +30s
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Advance button */}
                {currentOrder.fulfillmentStatus !== 'delivered' && currentOrder.state !== 'BROWSE' && currentOrder.state !== 'CHECKOUT' && currentOrder.state !== 'OPTIMIZING' && (
                  <Button
                    onClick={() => onAdvanceStatus(currentOrder.id)}
                    className="w-full mt-3 gap-2 font-mono text-xs bg-neon text-primary-foreground hover:bg-neon/90"
                    size="sm"
                  >
                    <Plus size={12} /> Advance to Next Status
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Rider List */}
        <TabsContent value="riders" className="flex-1 overflow-y-auto terminal-scrollbar mt-2 space-y-2">
          {riders.map(rider => {
            const totalOrders = Object.values(rider.ordersCompleted).reduce((a, b) => a + b, 0);
            return (
              <div key={rider.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏍️</span>
                    <div>
                      <div className="text-sm font-display font-semibold text-foreground">{rider.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{rider.archetype}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-recovery-gold fill-recovery-gold" />
                    <span className="text-sm font-mono font-bold text-foreground">{rider.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-2 text-[10px] font-mono">
                  <div className="bg-secondary rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Speed</div>
                    <div className="text-foreground font-bold">{rider.speedFactor}x</div>
                  </div>
                  <div className="bg-secondary rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Locality</div>
                    <div className="text-foreground font-bold">{rider.localityAwareness}/10</div>
                  </div>
                  <div className="bg-secondary rounded p-1.5 text-center">
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-foreground font-bold">{totalOrders}</div>
                  </div>
                </div>

                {/* Orders per hex */}
                <div className="mt-2">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1">Orders by Hex:</div>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(rider.ordersCompleted).map(([hex, count]) => (
                      <span key={hex} className="bg-secondary text-foreground text-[9px] font-mono px-1.5 py-0.5 rounded">
                        {hex}:{count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-1.5">
                  <Badge variant={rider.status === 'idle' ? 'secondary' : 'default'} className="text-[9px] font-mono">
                    {rider.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
