import { AgentLog, AgentPipelineStep, OrderData } from '@/lib/simulation';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Bike, RotateCcw, Database, CheckCircle, Loader2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import TESGauge from './TESGauge';

interface ControlTowerPanelProps {
  logs: AgentLog[];
  pipelineSteps: AgentPipelineStep[];
  selectedOrder: OrderData | null;
}

const agentIcons: Record<string, typeof Brain> = {
  PROMISE: Brain,
  ASSIGNMENT: Bike,
  RECOVERY: RotateCcw,
  DATABASE: Database,
  SYSTEM: Activity,
};

const agentColors: Record<string, string> = {
  PROMISE: 'text-neon',
  ASSIGNMENT: 'text-rider-blue',
  RECOVERY: 'text-recovery-gold',
  DATABASE: 'text-purple-400',
  SYSTEM: 'text-muted-foreground',
};

const agentBgColors: Record<string, string> = {
  PROMISE: 'bg-neon/10 border-neon/30',
  ASSIGNMENT: 'bg-rider-blue/10 border-rider-blue/30',
  RECOVERY: 'bg-recovery-gold/10 border-recovery-gold/30',
  DATABASE: 'bg-purple-400/10 border-purple-400/30',
  SYSTEM: 'bg-muted/50 border-border',
};

const statusIcon = (status: string) => {
  if (status === 'done') return <CheckCircle size={14} className="text-neon" />;
  if (status === 'running') return <Loader2 size={14} className="text-rider-blue animate-spin" />;
  if (status === 'error') return <Circle size={14} className="text-destructive" />;
  return <Circle size={14} className="text-muted-foreground/40" />;
};

export default function ControlTowerPanel({ logs, pipelineSteps, selectedOrder }: ControlTowerPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* TES Gauge */}
      {selectedOrder && selectedOrder.tes !== 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              TES Score — {selectedOrder.id || 'Pending'}
            </span>
          </div>
          <TESGauge value={selectedOrder.tes} promiseMinutes={selectedOrder.promiseMinutes ?? 0} />
        </div>
      )}

      {/* Agent Pipeline */}
      <div className="bg-card border border-border rounded-xl p-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-neon" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Pipeline</span>
        </div>

        <div className="space-y-1.5">
          {pipelineSteps.length === 0 && (
            <div className="text-xs font-mono text-muted-foreground italic py-2">Awaiting order...</div>
          )}
          <AnimatePresence>
            {pipelineSteps.map((step, i) => {
              const Icon = agentIcons[step.agent] || Activity;
              return (
                <motion.div
                  key={`${step.agent}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`border rounded-lg p-2.5 ${agentBgColors[step.agent] || 'bg-muted/50 border-border'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={agentColors[step.agent]} />
                      <span className={`text-xs font-mono font-bold ${agentColors[step.agent]}`}>{step.label}</span>
                    </div>
                    {statusIcon(step.status)}
                  </div>
                  {step.output && (
                    <pre className="text-[10px] font-mono text-foreground/70 mt-1 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  )}
                  {step.status === 'running' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rider-blue animate-pulse" />
                      <span className="text-[10px] font-mono text-rider-blue">Processing...</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Agent Terminal Logs */}
      <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Terminal</span>
          <Badge variant="secondary" className="text-[9px] ml-auto">{logs.length}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto terminal-scrollbar font-mono text-xs space-y-1.5">
          {logs.length === 0 && (
            <div className="text-muted-foreground italic text-xs">Waiting for order flow...</div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="pb-1 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`font-bold ${agentColors[log.agent] || 'text-foreground'}`}>
                  [{log.agent}]
                </span>
              </div>
              <div className="text-foreground/80 ml-4">{log.message}</div>
              {log.data && (
                <pre className="text-terminal-green ml-4 mt-0.5 text-[10px] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
