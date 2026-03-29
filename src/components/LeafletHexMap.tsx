import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HexCell, STORE_LOCATION, Rider, FulfillmentStatus } from '@/lib/simulation';

interface LeafletHexMapProps {
  hexGrid: HexCell[];
  selectedHex: number;
  onSelectHex: (id: number) => void;
  assignedRider: Rider | null;
  fulfillmentStatus: FulfillmentStatus;
  promisePerHex?: Record<number, number>;
  showPromises?: boolean;
}

function hexCorners(lat: number, lng: number, radiusDeg: number = 0.0035): [number, number][] {
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

const MAP_COLORS = {
  primary: 'hsl(var(--primary))',
  primarySoft: 'hsl(var(--primary) / 0.12)',
  primaryStrong: 'hsl(var(--primary) / 0.2)',
  border: 'hsl(var(--border))',
  card: 'hsl(var(--card) / 0.78)',
  muted: 'hsl(var(--muted-foreground))',
};

export default function LeafletHexMap({
  hexGrid,
  selectedHex,
  onSelectHex,
  assignedRider,
  fulfillmentStatus,
  promisePerHex,
  showPromises = true,
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
      tap: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
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

    const storeHex = hexGrid.find((hex) => hex.id === 4);
    const customerHex = hexGrid.find((hex) => hex.id === selectedHex);

    if (!hasFittedBoundsRef.current) {
      const bounds = L.latLngBounds(hexGrid.map((hex) => [hex.lat, hex.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.3));
      hasFittedBoundsRef.current = true;
    } else {
      map.invalidateSize();
    }

    hexGrid.forEach((hex) => {
      const isSelected = hex.id === selectedHex;
      const isStore = hex.id === 4;
      const polygon = L.polygon(hexCorners(hex.lat, hex.lng), {
        color: isSelected || isStore ? MAP_COLORS.primary : MAP_COLORS.border,
        weight: isSelected ? 2.5 : 1,
        fillColor: isStore ? MAP_COLORS.primaryStrong : isSelected ? MAP_COLORS.primarySoft : MAP_COLORS.card,
        fillOpacity: 0.9,
      });

      polygon.on('click', () => onSelectHex(hex.id));
      polygon.bindPopup(`
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: hsl(var(--foreground)); min-width: 120px;">
          <div style="font-weight: 700; margin-bottom: 4px;">${hex.label}${isStore ? ' • STORE' : ''}</div>
          <div>Base S2D: ${hex.baseS2DMinutes.toFixed(1)} min</div>
          ${showPromises && promisePerHex ? `<div style="margin-top:4px;font-weight:700;color:${MAP_COLORS.primary};">Promise: ${promisePerHex[hex.id]} min</div>` : ''}
        </div>
      `);
      polygon.addTo(overlayLayer);

      if (showPromises && promisePerHex) {
        L.marker([hex.lat, hex.lng], {
          icon: L.divIcon({
            html: `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; color: ${hex.id === 4 || isSelected ? MAP_COLORS.primary : MAP_COLORS.muted}; text-align: center; text-shadow: 0 0 6px rgba(0,0,0,0.8); white-space: nowrap;">
              <div style="font-size: 9px; opacity: 0.8;">${hex.label}</div>
              ${hex.id === 4 ? '🏪' : `${promisePerHex[hex.id]}m`}
            </div>`,
            className: '',
            iconSize: [50, 30],
            iconAnchor: [25, 15],
          }),
          interactive: false,
        }).addTo(overlayLayer);
      }
    });

    if (storeHex) {
      L.marker([storeHex.lat, storeHex.lng], { icon: storeIcon, interactive: false }).addTo(overlayLayer);
    }

    if (customerHex && customerHex.id !== 4) {
      L.marker([customerHex.lat, customerHex.lng], { icon: customerIcon, interactive: false }).addTo(overlayLayer);
    }

    if (storeHex && customerHex && customerHex.id !== 4) {
      L.polyline(
        [
          [storeHex.lat, storeHex.lng],
          [customerHex.lat, customerHex.lng],
        ],
        {
          color: MAP_COLORS.primary,
          weight: 2,
          dashArray: '8 6',
          opacity: 0.65,
        }
      ).addTo(overlayLayer);
    }

    if (assignedRider && storeHex && customerHex) {
      const riderPosition = getRiderPosition(storeHex, customerHex, fulfillmentStatus);
      L.marker([riderPosition.lat, riderPosition.lng], {
        icon: riderIcon(false),
        interactive: false,
      }).addTo(overlayLayer);
    }
  }, [assignedRider, fulfillmentStatus, hexGrid, onSelectHex, promisePerHex, selectedHex, showPromises]);

  return <div ref={mapElementRef} className="w-full h-full rounded-lg" style={{ minHeight: 280 }} />;
}
