import { useMemo } from 'react';
import { OrderData, HexCell, UserPersona, PERSONA_CONFIGS, getCachedPromise, FULFILLMENT_STEPS, FulfillmentStatus } from '@/lib/simulation';
import LeafletHexMap from './LeafletHexMap';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, CreditCard, MapPin, Clock, Package, User, CheckCircle, Circle, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StorefrontPanelProps {
  order: OrderData;
  hexGrid: HexCell[];
  onSelectHex: (id: number) => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  onSelectPersona: (p: UserPersona) => void;
  livePromise: number;
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
  order,
  hexGrid,
  onSelectHex,
  onAddToCart,
  onCheckout,
  onSelectPersona,
  livePromise,
}: StorefrontPanelProps) {
  const promisePerHex = useMemo(() => {
    const map: Record<number, number> = {};
    hexGrid.forEach(hex => {
      map[hex.id] = getCachedPromise(hex, order.persona);
    });
    return map;
  }, [hexGrid, order.persona]);

  const isBrowsing = order.state === 'BROWSE' || order.state === 'CHECKOUT';
  const isTracking = order.state === 'FULFILLMENT' || order.state === 'RECOVERY' || order.state === 'DELIVERED';
  const currentStepIdx = FULFILLMENT_STEPS.indexOf(order.fulfillmentStatus);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-secondary px-4 py-2.5 flex items-center justify-between">
        <span className="font-display font-bold text-sm text-foreground">⚡ QuickDash Storefront</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon" />
          <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Section 1: Browse - Persona + Map with Promises */}
      {isBrowsing && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Persona Selector */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 mb-1.5">
              <User size={12} className="text-neon" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Customer Persona</span>
            </div>
            <Select value={order.persona} onValueChange={(v) => onSelectPersona(v as UserPersona)}>
              <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <div className="h-[280px] rounded-lg overflow-hidden">
              <LeafletHexMap
                hexGrid={hexGrid}
                selectedHex={order.selectedHex}
                onSelectHex={onSelectHex}
                assignedRider={null}
                fulfillmentStatus="created"
                promisePerHex={promisePerHex}
                showPromises={true}
              />
            </div>
          </div>

          {/* Promise + Actions */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-neon" />
                <span className="text-xs font-mono text-muted-foreground">
                  {order.state === 'BROWSE' ? 'CACHED PROMISE' : 'ACTUAL PROMISE'}
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

            {order.state === 'BROWSE' && (
              <Button onClick={onAddToCart} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold">
                <ShoppingCart size={14} /> Add to Cart
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Checkout */}
      {order.state === 'CHECKOUT' && (
        <div className="px-4 py-4 border-t border-border">
          <div className="bg-secondary rounded-lg p-3 mb-3">
            <div className="text-xs font-mono text-muted-foreground mb-1">DELIVERY TO</div>
            <div className="text-sm font-display font-semibold text-foreground">
              Hex {hexGrid.find(h => h.id === order.selectedHex)?.label || '?'} • Bengaluru
            </div>
            <div className="text-xs font-mono text-neon mt-1">
              Actual Promise: {livePromise} min (synced from backend)
            </div>
          </div>
          <Button onClick={onCheckout} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold glow-green">
            <CreditCard size={14} /> Place Order
          </Button>
        </div>
      )}

      {/* Optimizing spinner */}
      {order.state === 'OPTIMIZING' && (
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

      {/* Section 3: Order Tracking */}
      {isTracking && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Map with rider */}
          <div className="flex-1 min-h-0 px-2 py-2">
            <div className="h-[250px] rounded-lg overflow-hidden">
              <LeafletHexMap
                hexGrid={hexGrid}
                selectedHex={order.selectedHex}
                onSelectHex={() => {}}
                assignedRider={order.assignedRider}
                fulfillmentStatus={order.fulfillmentStatus}
                showPromises={false}
              />
            </div>
          </div>

          {/* Status tracker */}
          <div className="px-3 py-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted-foreground uppercase">Order {order.id}</span>
              <Badge variant={order.state === 'RECOVERY' ? 'destructive' : 'default'} className="text-[10px] font-mono">
                {order.state === 'RECOVERY' ? 'RECOVERING' : order.fulfillmentStatus.toUpperCase()}
              </Badge>
            </div>

            {/* Progress steps */}
            <div className="space-y-1.5">
              {FULFILLMENT_STEPS.map((step, idx) => {
                const Icon = statusIcons[step];
                const isActive = idx === currentStepIdx;
                const isDone = idx < currentStepIdx;
                return (
                  <div key={step} className={`flex items-center gap-2 px-2 py-1 rounded ${isActive ? 'bg-secondary' : ''}`}>
                    <Icon
                      size={14}
                      className={isDone ? 'text-neon' : isActive ? 'text-neon animate-pulse-neon' : 'text-muted-foreground/40'}
                    />
                    <span className={`text-xs font-mono ${isDone ? 'text-neon' : isActive ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                      {statusLabels[step]}
                    </span>
                    {order.delays[step] && (
                      <Badge variant="destructive" className="text-[9px] ml-auto">+{order.delays[step]}s delay</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rider info */}
            {order.assignedRider && (
              <div className="bg-secondary rounded-lg p-2 mt-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg bg-rider-blue/20">
                  🏍️
                </div>
                <div>
                  <div className="text-sm font-display font-semibold text-foreground">{order.assignedRider.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{order.assignedRider.archetype} • ⭐ {order.assignedRider.rating}</div>
                </div>
              </div>
            )}

            {/* Promise display */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs font-mono text-muted-foreground">Promise</span>
              <span className="text-lg font-mono font-bold text-neon text-glow-green">{order.promiseMinutes} min</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
