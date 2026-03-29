import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HexCell, STORE_LOCATION, Rider, FulfillmentStatus, OrderData } from '@/lib/simulation';

interface LeafletHexMapProps {
  hexGrid: HexCell[];
  selectedHex: number;
  onSelectHex: (id: number) => void;
  assignedRider: Rider | null;
  fulfillmentStatus: FulfillmentStatus;
  promisePerHex?: Record<number, number>;
  showPromises?: boolean;
  activeOrders?: OrderData[];
}

function hexCorners(lat: number, lng: number, radiusDeg: number = 0.0028): [number, number][] {
  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push([
      lat + radiusDeg * Math.cos(angle),
      lng + radiusDeg * Math.sin(angle) * 1.2,
    ]);
  }
  return corners;
}

const storeIcon = L.divIcon({
  html: '<div style="font-size:24px;text-align:center;line-height:1">🏪</div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const customerIcon = L.divIcon({
  html: '<div style="font-size:22px;text-align:center;line-height:1">📍</div>',
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function riderIcon(isRecovery: boolean) {
  return L.divIcon({
    html: `<div style="font-size:22px;text-align:center;line-height:1;${isRecovery ? 'filter:hue-rotate(40deg)' : ''}">🏍️</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getRiderPosition(
  storeHex: HexCell,
  customerHex: HexCell,
  status: FulfillmentStatus
): { lat: number; lng: number } {
  const progress: Record<FulfillmentStatus, number> = {
    created: 0,
    picked: 0,
    packed: 0,
    handover: 0.05,
    intransit: 0.6,
    delivered: 1.0,
  };
  const t = progress[status];
  return {
    lat: storeHex.lat + (customerHex.lat - storeHex.lat) * t,
    lng: storeHex.lng + (customerHex.lng - storeHex.lng) * t,
  };
}

// Light theme colors for visibility on light map
const HEX_COLORS = {
  default: { fill: 'rgba(59, 130, 246, 0.08)', stroke: 'rgba(59, 130, 246, 0.35)' },
  selected: { fill: 'rgba(34, 197, 94, 0.18)', stroke: 'rgba(34, 197, 94, 0.8)' },
  store: { fill: 'rgba(251, 146, 60, 0.15)', stroke: 'rgba(251, 146, 60, 0.7)' },
  activeOrder: { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.7)' },
};

export default function LeafletHexMap({
  hexGrid,
  selectedHex,
  onSelectHex,
  assignedRider,
  fulfillmentStatus,
  promisePerHex,
  showPromises = true,
  activeOrders = [],
}: LeafletHexMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedBoundsRef = useRef(false);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    // Light tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    overlayLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      overlayLayerRef.current?.clearLayers();
      overlayLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      hasFittedBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const overlayLayer = overlayLayerRef.current;
    if (!map || !overlayLayer || hexGrid.length === 0) return;

    overlayLayer.clearLayers();

    const storeHex = hexGrid.find((hex) => hex.id === 0);
    const customerHex = hexGrid.find((hex) => hex.id === selectedHex);

    // Set of hex IDs with active orders
    const activeOrderHexIds = new Set(activeOrders.filter(o => o.id).map(o => o.selectedHex));

    if (!hasFittedBoundsRef.current) {
      const bounds = L.latLngBounds(hexGrid.map((hex) => [hex.lat, hex.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.2));
      hasFittedBoundsRef.current = true;
    } else {
      map.invalidateSize();
    }

    hexGrid.forEach((hex) => {
      const isSelected = hex.id === selectedHex;
      const isStore = hex.id === 0;
      const hasActiveOrder = activeOrderHexIds.has(hex.id);

      let colors = HEX_COLORS.default;
      if (isStore) colors = HEX_COLORS.store;
      else if (isSelected) colors = HEX_COLORS.selected;
      else if (hasActiveOrder) colors = HEX_COLORS.activeOrder;

      const polygon = L.polygon(hexCorners(hex.lat, hex.lng), {
        color: colors.stroke,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: colors.fill,
        fillOpacity: 1,
      });

      polygon.on('click', () => onSelectHex(hex.id));
      polygon.addTo(overlayLayer);

      // Labels
      const labelColor = isStore ? '#ea580c' : isSelected ? '#16a34a' : '#475569';
      L.marker([hex.lat, hex.lng], {
        icon: L.divIcon({
          html: `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 700; color: ${labelColor}; text-align: center; white-space: nowrap;">
            <div style="font-size: 9px; opacity: 0.7;">${hex.label}</div>
            ${isStore ? '🏪' : (showPromises && promisePerHex ? `${promisePerHex[hex.id]}m` : '')}
          </div>`,
          className: '',
          iconSize: [50, 30],
          iconAnchor: [25, 15],
        }),
        interactive: false,
      }).addTo(overlayLayer);
    });

    if (storeHex) {
      L.marker([storeHex.lat, storeHex.lng], { icon: storeIcon, interactive: false }).addTo(overlayLayer);
    }

    if (customerHex && customerHex.id !== 0) {
      L.marker([customerHex.lat, customerHex.lng], { icon: customerIcon, interactive: false }).addTo(overlayLayer);
    }

    if (storeHex && customerHex && customerHex.id !== 0) {
      L.polyline(
        [[storeHex.lat, storeHex.lng], [customerHex.lat, customerHex.lng]],
        { color: '#16a34a', weight: 2, dashArray: '8 6', opacity: 0.65 }
      ).addTo(overlayLayer);
    }

    // Show riders for all active orders
    if (storeHex) {
      activeOrders.forEach((order) => {
        if (order.assignedRider && order.state === 'FULFILLMENT' || order.state === 'RECOVERY') {
          const targetHex = hexGrid.find((h) => h.id === order.selectedHex);
          if (targetHex) {
            const pos = getRiderPosition(storeHex, targetHex, order.fulfillmentStatus);
            L.marker([pos.lat, pos.lng], {
              icon: riderIcon(order.state === 'RECOVERY'),
              interactive: false,
            }).addTo(overlayLayer);
          }
        }
      });

      // Fallback for single rider mode
      if (activeOrders.length === 0 && assignedRider && customerHex) {
        const pos = getRiderPosition(storeHex, customerHex, fulfillmentStatus);
        L.marker([pos.lat, pos.lng], { icon: riderIcon(false), interactive: false }).addTo(overlayLayer);
      }
    }
  }, [assignedRider, fulfillmentStatus, hexGrid, onSelectHex, promisePerHex, selectedHex, showPromises, activeOrders]);

  return <div ref={mapElementRef} className="w-full h-full rounded-lg" style={{ minHeight: 280 }} />;
}
