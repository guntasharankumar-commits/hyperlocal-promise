import { useMemo } from 'react';
import { OrderData, HexCell, UserPersona, PERSONA_CONFIGS, FULFILLMENT_STEPS, FulfillmentStatus, StoreConfig } from '@/lib/simulation';
import { UsePromiseCacheReturn, getCacheKey } from '@/hooks/usePromiseCache';
import LeafletHexMap from './LeafletHexMap';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, CreditCard, MapPin, Clock, Package, User, CheckCircle, Circle, Truck, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StorefrontPanelProps {
  currentOrder: OrderData;
  activeOrders: OrderData[];
  hexGrid: HexCell[];
  storeConfig: StoreConfig;
  cacheVersion: number;
  onSelectHex: (id: number) => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  onSelectPersona: (p: UserPersona) => void;
  onNewOrder: () => void;
  onSelectActiveOrder: (orderId: string) => void;
  livePromise: number;
  promiseCache: UsePromiseCacheReturn;
}

const statusLabels: Record<FulfillmentStatus, string> = {
  created: 'Order Created',
  picked: 'Items Picked',
  packed: 'Packed',
  handover: 'Handover to Rider',
  intransit: 'In Transit',
  delivered: 'Delivered',
};

const statusIcons: Record<FulfillmentStatus, typeof CheckCircle> = {
  created: Circle,
  picked: CheckCircle,
  packed: CheckCircle,
  handover: Truck,
  intransit: Truck,
  delivered: Package,
};

export default function StorefrontPanel({
  currentOrder,
  activeOrders,
  hexGrid,
  storeConfig,
  cacheVersion,
  onSelectHex,
  onAddToCart,
  onCheckout,
  onSelectPersona,
  onNewOrder,
  onSelectActiveOrder,
  livePromise,
  promiseCache,
}: StorefrontPanelProps) {
  // Build promisePerHex from the full cache for the current persona
  const promisePerHex = useMemo(() => {
    const map: Record<number, number> = {};
    hexGrid.forEach(hex => {
      const entry = promiseCache.cache[getCacheKey(currentOrder.persona, hex.id)];
      map[hex.id] = entry?.best.promise ?? 0;
    });
    return map;
  }, [hexGrid, currentOrder.persona, promiseCache.cache]);

  const isBrowsing = currentOrder.state === 'BROWSE' || currentOrder.state === 'CHECKOUT';
  const isTracking = currentOrder.state === 'FULFILLMENT' || currentOrder.state === 'RECOVERY' || currentOrder.state === 'DELIVERED';
  const currentStepIdx = FULFILLMENT_STEPS.indexOf(currentOrder.fulfillmentStatus);
  const placedOrders = activeOrders.filter(o => o.id);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-secondary px-3 py-2 flex items-center justify-between flex-shrink-0">
        <span className="font-display font-bold text-sm text-foreground">⚡ QuickDash</span>
        <div className="flex items-center gap-2">
          {placedOrders.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono">{placedOrders.length} active</Badge>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-neon" />
        </div>
      </div>

      {/* Active Orders Strip */}
      {placedOrders.length > 0 && (
        <div className="px-2 py-1.5 border-b border-border bg-secondary/50 flex gap-1.5 overflow-x-auto flex-shrink-0">
          {placedOrders.map(o => (
            <button
              key={o.id}
              onClick={() => onSelectActiveOrder(o.id)}
              className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                currentOrder.id === o.id ? 'bg-neon/20 text-neon border border-neon/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                o.state === 'DELIVERED' ? 'bg-neon' :
                o.state === 'RECOVERY' ? 'bg-recovery-gold' :
                o.state === 'FULFILLMENT' ? 'bg-rider-blue' : 'bg-muted-foreground'
              }`} />
              {o.id}
            </button>
          ))}
          <button
            onClick={onNewOrder}
            className="px-2 py-1 rounded text-[10px] font-mono text-muted-foreground bg-muted hover:bg-muted/80 flex items-center gap-1"
          >
            <Plus size={10} /> New
          </button>
        </div>
      )}

      {/* Browse/Checkout Mode */}
      {isBrowsing && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Persona Selector */}
          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <User size={12} className="text-neon" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Customer Persona</span>
            </div>
            <Select value={currentOrder.persona} onValueChange={(v) => onSelectPersona(v as UserPersona)}>
              <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {(Object.entries(PERSONA_CONFIGS) as [UserPersona, typeof PERSONA_CONFIGS[UserPersona]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs font-mono">
                    {cfg.label} — {cfg.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Map */}
          <div className="flex-1 min-h-0 px-2 py-2">
            <div className="flex items-center gap-1 mb-1">
              <MapPin size={12} className="text-neon" />
              <span className="text-[10px] font-mono text-muted-foreground">TAP A HEX TO SET DELIVERY LOCATION</span>
            </div>
            <div className="h-[240px] rounded-lg overflow-hidden">
              <LeafletHexMap
                hexGrid={hexGrid}
                selectedHex={currentOrder.selectedHex}
                onSelectHex={onSelectHex}
                assignedRider={null}
                fulfillmentStatus="created"
                promisePerHex={promisePerHex}
                showPromises={true}
                activeOrders={activeOrders}
              />
            </div>
          </div>

          <div className="px-3 py-2.5 border-t border-border flex-shrink-0">

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-neon" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {currentOrder.state === 'BROWSE' ? 'TES-OPTIMIZED PROMISE' : 'ACTUAL PROMISE'}
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={livePromise}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  className="text-xl font-mono font-bold text-neon text-glow-green"
                >
                  {livePromise} min
                </motion.div>
              </AnimatePresence>
            </div>

            {currentOrder.state === 'BROWSE' && (
              <Button onClick={onAddToCart} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold" size="sm">
                <ShoppingCart size={14} /> Add to Cart
              </Button>
            )}
            {currentOrder.state === 'CHECKOUT' && (
              <div className="space-y-2">
                <div className="bg-secondary rounded-lg p-2">
                  <div className="text-[10px] font-mono text-muted-foreground">DELIVERY TO</div>
                  <div className="text-xs font-display font-semibold text-foreground">
                    Hex {hexGrid.find(h => h.id === currentOrder.selectedHex)?.label} • Bengaluru
                  </div>
                </div>
                <Button onClick={onCheckout} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold glow-green" size="sm">
                  <CreditCard size={14} /> Place Order
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optimizing spinner */}
      {currentOrder.state === 'OPTIMIZING' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-8 h-8 border-2 border-neon border-t-transparent rounded-full mx-auto mb-2"
            />
            <span className="text-sm font-mono text-neon animate-pulse-neon">Optimizing TES...</span>
          </div>
        </div>
      )}

      {/* Order Tracking */}
      {isTracking && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 px-2 py-2">
            <div className="h-[200px] rounded-lg overflow-hidden">
              <LeafletHexMap
                hexGrid={hexGrid}
                selectedHex={currentOrder.selectedHex}
                onSelectHex={() => {}}
                assignedRider={currentOrder.assignedRider}
                fulfillmentStatus={currentOrder.fulfillmentStatus}
                showPromises={false}
                activeOrders={activeOrders}
              />
            </div>
          </div>

          <div className="px-3 py-2 border-t border-border flex-shrink-0 overflow-y-auto terminal-scrollbar">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Order {currentOrder.id}</span>
              <Badge variant={currentOrder.state === 'RECOVERY' ? 'destructive' : 'default'} className="text-[9px] font-mono">
                {currentOrder.state === 'RECOVERY' ? 'RECOVERING' : currentOrder.fulfillmentStatus.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-1">
              {FULFILLMENT_STEPS.map((step, idx) => {
                const Icon = statusIcons[step];
                const isActive = idx === currentStepIdx;
                const isDone = idx < currentStepIdx;
                return (
                  <div key={step} className={`flex items-center gap-2 px-2 py-0.5 rounded ${isActive ? 'bg-secondary' : ''}`}>
                    <Icon size={12} className={isDone ? 'text-neon' : isActive ? 'text-neon animate-pulse-neon' : 'text-muted-foreground/40'} />
                    <span className={`text-[10px] font-mono ${isDone ? 'text-neon' : isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                      {statusLabels[step]}
                    </span>
                    {currentOrder.delays[step] && (
                      <Badge variant="destructive" className="text-[9px] ml-auto">+{currentOrder.delays[step]}s</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {currentOrder.assignedRider && (
              <div className="bg-secondary rounded-lg p-2 mt-2 flex items-center gap-2">
                <span className="text-lg">🏍️</span>
                <div>
                  <div className="text-xs font-display font-semibold text-foreground">{currentOrder.assignedRider.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{currentOrder.assignedRider.archetype} • ⭐ {currentOrder.assignedRider.rating}</div>
                </div>
                <span className="ml-auto text-lg font-mono font-bold text-neon text-glow-green">{currentOrder.promiseMinutes}m</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
