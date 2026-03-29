import { HexCell } from '@/lib/simulation';
import { Rider } from '@/lib/simulation';
import { motion } from 'framer-motion';

interface HexMapProps {
  hexGrid: HexCell[];
  selectedHex: number;
  onSelectHex: (id: number) => void;
  assignedRider: Rider | null;
  isRecovery: boolean;
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export default function HexMap({ hexGrid, selectedHex, onSelectHex, assignedRider, isRecovery }: HexMapProps) {
  const hexR = 38;
  const hexW = hexR * Math.sqrt(3);
  const hexH = hexR * 2;
  const padding = 12;

  function getHexCenter(col: number, row: number) {
    const x = padding + hexR * Math.sqrt(3) + col * hexW + (row % 2 === 1 ? hexW / 2 : 0);
    const y = padding + hexR + row * (hexH * 0.75);
    return { x, y };
  }

  const svgW = padding * 2 + hexW * 3 + hexW / 2;
  const svgH = padding * 2 + hexH * 0.75 * 2 + hexH;

  const storeHex = hexGrid.find(h => h.id === 4);
  const storeCenter = storeHex ? getHexCenter(storeHex.col, storeHex.row) : { x: 0, y: 0 };

  const customerHex = hexGrid.find(h => h.id === selectedHex);
  const customerCenter = customerHex ? getHexCenter(customerHex.col, customerHex.row) : storeCenter;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" style={{ maxHeight: 260 }}>
      {/* Hex grid */}
      {hexGrid.map(hex => {
        const { x, y } = getHexCenter(hex.col, hex.row);
        const isSelected = hex.id === selectedHex;
        const isStore = hex.id === 4;

        return (
          <g key={hex.id} onClick={() => onSelectHex(hex.id)} className="cursor-pointer">
            <polygon
              points={hexPoints(x, y, hexR)}
              fill={isStore ? 'hsl(var(--neon-green) / 0.15)' : isSelected ? 'hsl(var(--neon-green) / 0.08)' : 'hsl(var(--slate-elevated))'}
              stroke={isSelected ? 'hsl(var(--neon-green))' : 'hsl(var(--hex-border))'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={0.9}
            />
            <text x={x} y={y - 10} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="var(--font-mono)">
              {hex.label}
            </text>
            <text x={x} y={y + 5} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">
              {hex.baseS2DMinutes.toFixed(0)}m
            </text>
            {isStore && (
              <text x={x} y={y + 18} textAnchor="middle" fill="hsl(var(--neon-green))" fontSize="8" fontWeight="700">
                🏪 STORE
              </text>
            )}
          </g>
        );
      })}

      {/* Route line */}
      {selectedHex !== 4 && (
        <line
          x1={storeCenter.x} y1={storeCenter.y}
          x2={customerCenter.x} y2={customerCenter.y}
          stroke="hsl(var(--neon-green) / 0.4)"
          strokeWidth="2"
          strokeDasharray="6,4"
        />
      )}

      {/* Customer pin */}
      {selectedHex !== 4 && (
        <g>
          <circle cx={customerCenter.x} cy={customerCenter.y} r="8" fill="hsl(var(--destructive))" />
          <text x={customerCenter.x} y={customerCenter.y + 3.5} textAnchor="middle" fontSize="10">📍</text>
        </g>
      )}

      {/* Rider */}
      {assignedRider && (
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <circle
            cx={(storeCenter.x + customerCenter.x) / 2}
            cy={(storeCenter.y + customerCenter.y) / 2}
            r="10"
            fill={isRecovery ? 'hsl(var(--recovery-gold))' : 'hsl(var(--rider-blue))'}
            className={isRecovery ? 'animate-rider-pulse' : ''}
          />
          <text
            x={(storeCenter.x + customerCenter.x) / 2}
            y={(storeCenter.y + customerCenter.y) / 2 + 3.5}
            textAnchor="middle"
            fontSize="11"
          >
            🏍️
          </text>
        </motion.g>
      )}
    </svg>
  );
}
