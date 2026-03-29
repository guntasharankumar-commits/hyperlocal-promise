import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Generate hex polygon coordinates around a center point
function hexCorners(lat: number, lng: number, radiusDeg: number = 0.0035): [number, number][] {
  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push([
      lat + radiusDeg * Math.cos(angle),
      lng + radiusDeg * Math.sin(angle) * 1.2, // stretch lng to account for latitude
    ]);
  }
  return corners;
}

// Custom store icon
const storeIcon = L.divIcon({
  html: '<div style="font-size:24px;text-align:center;line-height:1">🏪</div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Customer pin icon
const customerIcon = L.divIcon({
  html: '<div style="font-size:22px;text-align:center;line-height:1">📍</div>',
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Rider icon
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
    created: 0, picked: 0, packed: 0, handover: 0.05,
    intransit: 0.6, delivered: 1.0,
  };
  const t = progress[status];
  return {
    lat: storeHex.lat + (customerHex.lat - storeHex.lat) * t,
    lng: storeHex.lng + (customerHex.lng - storeHex.lng) * t,
  };
}

function FitBounds({ hexGrid }: { hexGrid: HexCell[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && hexGrid.length > 0) {
      const bounds = L.latLngBounds(hexGrid.map(h => [h.lat, h.lng]));
      map.fitBounds(bounds.pad(0.3));
      fitted.current = true;
    }
  }, [hexGrid, map]);
  return null;
}

export default function LeafletHexMap({
  hexGrid,
  selectedHex,
  onSelectHex,
  assignedRider,
  fulfillmentStatus,
  promisePerHex,
  showPromises = true,
}: LeafletHexMapProps) {
  const storeHex = hexGrid.find(h => h.id === 4);
  const customerHex = hexGrid.find(h => h.id === selectedHex);

  return (
    <MapContainer
      center={[STORE_LOCATION.lat, STORE_LOCATION.lng]}
      zoom={15}
      className="w-full h-full rounded-lg"
      style={{ minHeight: 280 }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds hexGrid={hexGrid} />

      {/* Hex polygons */}
      {hexGrid.map(hex => {
        const isSelected = hex.id === selectedHex;
        const isStore = hex.id === 4;
        const corners = hexCorners(hex.lat, hex.lng);

        return (
          <Polygon
            key={hex.id}
            positions={corners}
            pathOptions={{
              color: isSelected ? 'hsl(142, 72%, 50%)' : isStore ? 'hsl(142, 72%, 50%)' : 'hsl(200, 40%, 25%)',
              weight: isSelected ? 2.5 : 1,
              fillColor: isStore ? 'hsla(142, 72%, 50%, 0.2)' : isSelected ? 'hsla(142, 72%, 50%, 0.12)' : 'hsla(220, 16%, 13%, 0.7)',
              fillOpacity: 0.8,
            }}
            eventHandlers={{ click: () => onSelectHex(hex.id) }}
          >
            <Popup className="hex-popup">
              <div className="text-xs font-mono">
                <div className="font-bold">{hex.label} {isStore ? '🏪 STORE' : ''}</div>
                <div>Base S2D: {hex.baseS2DMinutes.toFixed(1)} min</div>
                {showPromises && promisePerHex && (
                  <div className="font-bold text-green-400">Promise: {promisePerHex[hex.id]} min</div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {/* Promise labels on hexes */}
      {showPromises && promisePerHex && hexGrid.map(hex => (
        <Marker
          key={`label-${hex.id}`}
          position={[hex.lat, hex.lng]}
          icon={L.divIcon({
            html: `<div style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              font-weight: 700;
              color: ${hex.id === 4 ? '#22c55e' : hex.id === selectedHex ? '#4ade80' : '#94a3b8'};
              text-align: center;
              text-shadow: 0 0 6px rgba(0,0,0,0.8);
              white-space: nowrap;
            ">
              <div style="font-size:9px;opacity:0.7">${hex.label}</div>
              ${hex.id === 4 ? '🏪' : promisePerHex[hex.id] + 'm'}
            </div>`,
            className: '',
            iconSize: [50, 30],
            iconAnchor: [25, 15],
          })}
          interactive={false}
        />
      ))}

      {/* Store marker */}
      {storeHex && (
        <Marker position={[storeHex.lat, storeHex.lng]} icon={storeIcon} />
      )}

      {/* Customer marker */}
      {customerHex && customerHex.id !== 4 && (
        <Marker position={[customerHex.lat, customerHex.lng]} icon={customerIcon} />
      )}

      {/* Route line */}
      {storeHex && customerHex && customerHex.id !== 4 && (
        <Polyline
          positions={[[storeHex.lat, storeHex.lng], [customerHex.lat, customerHex.lng]]}
          pathOptions={{
            color: 'hsl(142, 72%, 50%)',
            weight: 2,
            dashArray: '8, 6',
            opacity: 0.5,
          }}
        />
      )}

      {/* Rider marker */}
      {assignedRider && storeHex && customerHex && (
        <Marker
          position={(() => {
            const pos = getRiderPosition(storeHex, customerHex, fulfillmentStatus);
            return [pos.lat, pos.lng] as [number, number];
          })()}
          icon={riderIcon(false)}
        />
      )}
    </MapContainer>
  );
}
