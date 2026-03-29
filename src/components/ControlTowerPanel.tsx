import { AgentLog, AgentPipelineStep, OrderData } from '@/lib/simulation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Bike, RotateCcw, Database, CheckCircle, Loader2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

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
          <TESGauge value={selectedOrder.tes} />
        </div>
      )}

      {/* Agent Pipeline — Collapsible */}
      <Collapsible open={pipelineOpen} onOpenChange={setPipelineOpen}>
        <div className="bg-card border border-border rounded-xl p-3 flex-shrink-0">
          <CollapsibleTrigger className="flex items-center gap-2 w-full cursor-pointer">
            {pipelineOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
            <Brain size={14} className="text-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Pipeline</span>
            <Badge variant="secondary" className="text-[9px] ml-auto">{pipelineSteps.length}</Badge>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-1.5 mt-3">
              {pipelineSteps.length === 0 && (
                <div className="text-xs font-mono text-muted-foreground italic py-2">Awaiting order...</div>
              )}
              <AnimatePresence>
                {pipelineSteps.map((step, i) => {
                  const Icon = agentIcons[step.agent] || Activity;
                  const isExpanded = expandedSteps[i] ?? (step.status === 'done');
                  return (
                    <motion.div
                      key={`${step.agent}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`border rounded-lg ${agentBgColors[step.agent] || 'bg-muted/50 border-border'}`}
                    >
                      <button
                        onClick={() => toggleStep(i)}
                        className="flex items-center justify-between w-full p-2.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={10} className="text-muted-foreground" /> : <ChevronRight size={10} className="text-muted-foreground" />}
                          <Icon size={14} className={agentColors[step.agent]} />
                          <span className={`text-xs font-mono font-bold ${agentColors[step.agent]}`}>{step.label}</span>
                        </div>
                        {statusIcon(step.status)}
                      </button>
                      {isExpanded && step.output && (
                        <div className="px-2.5 pb-2.5">
                          <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.status === 'running' && (
                        <div className="flex items-center gap-1.5 px-2.5 pb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-rider-blue animate-pulse" />
                          <span className="text-[10px] font-mono text-rider-blue">Processing...</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Agent Terminal Logs — Collapsible */}
      <Collapsible open={terminalOpen} onOpenChange={setTerminalOpen} className="flex-1 min-h-0 flex flex-col">
        <div className="bg-card border border-border rounded-xl p-3 flex-1 min-h-0 flex flex-col">
          <CollapsibleTrigger className="flex items-center gap-2 w-full cursor-pointer">
            {terminalOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
            <div className="w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Terminal</span>
            <Badge variant="secondary" className="text-[9px] ml-auto">{logs.length}</Badge>
          </CollapsibleTrigger>

          <CollapsibleContent className="flex-1 min-h-0 flex flex-col mt-2">
            <div className="flex-1 overflow-y-auto terminal-scrollbar font-mono text-xs space-y-1.5">
              {logs.length === 0 && (
                <div className="text-muted-foreground italic text-xs">Waiting for order flow...</div>
              )}
              {logs.map((log, i) => {
                const isExpanded = expandedLogs[i] ?? true;
                return (
                  <div key={i} className="pb-1 border-b border-border/30 last:border-0">
                    <button
                      onClick={() => setExpandedLogs(prev => ({ ...prev, [i]: !(prev[i] !== false) }))}
                      className="flex items-center gap-2 w-full text-left cursor-pointer"
                    >
                      {log.data ? (
                        isExpanded ? <ChevronDown size={8} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={8} className="text-muted-foreground flex-shrink-0" />
                      ) : <div className="w-2" />}
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`font-bold ${agentColors[log.agent] || 'text-foreground'}`}>
                        [{log.agent}]
                      </span>
                    </button>
                    <div className="text-foreground/80 ml-4 text-[11px]">{log.message}</div>
                    {log.data && isExpanded && (
                      <pre className="text-terminal-green ml-4 mt-0.5 text-[10px] leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
