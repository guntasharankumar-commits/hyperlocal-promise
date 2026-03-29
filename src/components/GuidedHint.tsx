import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight, MousePointerClick } from 'lucide-react';

interface GuidedHintProps {
  step: number;
  totalSteps: number;
  message: string;
  subtext?: string;
  variant?: 'info' | 'action' | 'celebrate';
}

const variantStyles = {
  info: 'bg-rider-blue/10 border-rider-blue/30 text-rider-blue',
  action: 'bg-neon/10 border-neon/30 text-neon',
  celebrate: 'bg-recovery-gold/10 border-recovery-gold/30 text-recovery-gold',
};

export default function GuidedHint({ step, totalSteps, message, subtext, variant = 'info' }: GuidedHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`border rounded-lg px-3 py-2 flex items-start gap-2 ${variantStyles[variant]}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {variant === 'action' ? (
          <MousePointerClick size={14} className="animate-pulse" />
        ) : variant === 'celebrate' ? (
          <span className="text-sm">🎉</span>
        ) : (
          <Lightbulb size={14} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono opacity-60">Step {step}/{totalSteps}</span>
        </div>
        <div className="text-[11px] font-display font-semibold leading-tight">{message}</div>
        {subtext && <div className="text-[9px] font-mono opacity-70 mt-0.5">{subtext}</div>}
      </div>
      <ArrowRight size={12} className="flex-shrink-0 mt-1 animate-pulse" />
    </motion.div>
  );
}
