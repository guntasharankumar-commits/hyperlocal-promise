import { OrderData, HexCell, Rider } from '@/lib/simulation';
import HexMap from './HexMap';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, CreditCard, MapPin, Clock, Package } from 'lucide-react';

interface ConsumerPanelProps {
  order: OrderData;
  hexGrid: HexCell[];
  onSelectHex: (id: number) => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  livePromise: number;
}

export default function ConsumerPanel({ order, hexGrid, onSelectHex, onAddToCart, onCheckout, livePromise }: ConsumerPanelProps) {
  const stateLabels: Record<string, string> = {
    BROWSE: 'Browse & Order',
    CHECKOUT: 'Ready to Checkout',
    OPTIMIZING: 'Finding Best Promise...',
    FULFILLMENT: 'Order In Progress',
    RECOVERY: 'Re-optimizing Route...',
    DELIVERED: 'Delivered!',
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full max-w-[360px] mx-auto">
      {/* Phone header */}
      <div className="bg-secondary px-4 py-2 flex items-center justify-between">
        <span className="font-display font-bold text-sm text-foreground">⚡ QuickDash</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon" />
          <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Map area */}
      <div className="px-3 py-2 flex-1">
        <div className="flex items-center gap-1 mb-2">
          <MapPin size={12} className="text-neon" />
          <span className="text-[10px] font-mono text-muted-foreground">TAP A HEX TO SET DELIVERY LOCATION</span>
        </div>
        <HexMap
          hexGrid={hexGrid}
          selectedHex={order.selectedHex}
          onSelectHex={onSelectHex}
          assignedRider={order.assignedRider}
          isRecovery={order.state === 'RECOVERY'}
        />
      </div>

      {/* Promise display */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-neon" />
            <span className="text-xs font-mono text-muted-foreground">ESTIMATED</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={order.state === 'FULFILLMENT' || order.state === 'RECOVERY' ? order.promiseMinutes : livePromise}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="text-xl font-mono font-bold text-neon text-glow-green"
            >
              {order.state === 'FULFILLMENT' || order.state === 'RECOVERY'
                ? `${order.promiseMinutes} min`
                : `${livePromise} min`}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* State badge */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            order.state === 'RECOVERY' ? 'bg-recovery-gold animate-rider-pulse' :
            order.state === 'FULFILLMENT' ? 'bg-neon animate-pulse-neon' :
            'bg-muted-foreground'
          }`} />
          <span className="text-xs font-mono text-secondary-foreground">
            {stateLabels[order.state]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border space-y-2">
        {order.state === 'BROWSE' && (
          <Button onClick={onAddToCart} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold">
            <ShoppingCart size={14} /> Add to Cart
          </Button>
        )}
        {order.state === 'CHECKOUT' && (
          <Button onClick={onCheckout} className="w-full gap-2 bg-neon text-primary-foreground hover:bg-neon/90 font-display font-semibold glow-green">
            <CreditCard size={14} /> Place Order
          </Button>
        )}
        {order.state === 'OPTIMIZING' && (
          <div className="flex items-center justify-center gap-2 py-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-neon border-t-transparent rounded-full"
            />
            <span className="text-sm font-mono text-neon animate-pulse-neon">Optimizing TES...</span>
          </div>
        )}
        {(order.state === 'FULFILLMENT' || order.state === 'RECOVERY') && order.assignedRider && (
          <div className="bg-secondary rounded-lg p-2.5 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
              order.state === 'RECOVERY' ? 'bg-recovery-gold/20' : 'bg-rider-blue/20'
            }`}>
              🏍️
            </div>
            <div>
              <div className="text-sm font-display font-semibold text-foreground">{order.assignedRider.name}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{order.assignedRider.archetype} • ⭐ {order.assignedRider.rating}</div>
            </div>
          </div>
        )}
        {order.state === 'DELIVERED' && (
          <div className="text-center py-2">
            <Package size={20} className="mx-auto text-neon mb-1" />
            <span className="text-sm font-display text-neon font-semibold">Delivered!</span>
          </div>
        )}
      </div>
    </div>
  );
}
