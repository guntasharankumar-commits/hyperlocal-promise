import { motion } from 'framer-motion';

interface TESGaugeProps {
  value: number;
  maxValue?: number;
}

export default function TESGauge({ value, maxValue = 300 }: TESGaugeProps) {
  const clampedValue = Math.max(-100, Math.min(value, maxValue));
  const normalizedValue = (clampedValue + 100) / (maxValue + 100);
  const angle = -135 + normalizedValue * 270;

  const getColor = () => {
    if (normalizedValue > 0.6) return 'hsl(var(--neon-green))';
    if (normalizedValue > 0.3) return 'hsl(var(--amber-warn))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 130" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d="M 20 110 A 80 80 0 1 1 180 110"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <motion.path
          d="M 20 110 A 80 80 0 1 1 180 110"
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="377"
          initial={{ strokeDashoffset: 377 }}
          animate={{ strokeDashoffset: 377 - normalizedValue * 377 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${getColor()})` }}
        />
        {/* Needle */}
        <motion.line
          x1="100" y1="110"
          x2="100" y2="40"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ rotate: -135 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transformOrigin: '100px 110px' }}
        />
        <circle cx="100" cy="110" r="5" fill="hsl(var(--foreground))" />
      </svg>
      <motion.div
        className="text-2xl font-mono font-bold mt-1 text-glow-green"
        style={{ color: getColor() }}
        key={value}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
      >
        {value}
      </motion.div>
      <div className="text-xs text-muted-foreground font-mono">TRUST EQUITY SCORE</div>
    </div>
  );
}
