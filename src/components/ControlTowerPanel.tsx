import { AgentLog, AgentPipelineStep, OrderData } from '@/lib/simulation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, Bike, RotateCcw, Database, CheckCircle, Loader2, Circle, ChevronDown, ChevronRight, Star, Gauge, Clock } from 'lucide-react';
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

  // Extract TES details from pipeline steps
  const promiseStep = pipelineSteps.find(s => s.agent === 'PROMISE' && s.status === 'done');
  const assignmentStep = pipelineSteps.find(s => s.agent === 'ASSIGNMENT' && s.status === 'done');

  const tesOutput = promiseStep?.output as Record<string, unknown> | undefined;
  const riderOutput = assignmentStep?.output as Record<string, unknown> | undefined;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* TES Score + Rider + Breakdown */}
      {selectedOrder && selectedOrder.tes !== 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-neon" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              TES Score — {selectedOrder.id || 'Pending'}
            </span>
          </div>
          <TESGauge value={selectedOrder.tes} />

          {/* Rider Properties */}
          {selectedOrder.assignedRider && (
            <div className="mt-3 bg-secondary/50 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏍️</span>
                <span className="text-xs font-display font-bold text-foreground">{selectedOrder.assignedRider.name}</span>
                <Badge variant="secondary" className="text-[8px]">{selectedOrder.assignedRider.archetype}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                <div className="bg-card rounded p-1.5 text-center">
                  <div className="text-muted-foreground flex items-center justify-center gap-0.5"><Star size={8} className="text-recovery-gold" /> Rating</div>
                  <div className="text-foreground font-bold">{selectedOrder.assignedRider.rating}</div>
                </div>
                <div className="bg-card rounded p-1.5 text-center">
                  <div className="text-muted-foreground flex items-center justify-center gap-0.5"><Gauge size={8} /> Speed</div>
                  <div className="text-foreground font-bold">{selectedOrder.assignedRider.speedFactor}x</div>
                </div>
                <div className="bg-card rounded p-1.5 text-center">
                  <div className="text-muted-foreground">Hex Knowledge</div>
                  <div className="text-foreground font-bold">{selectedOrder.assignedRider.ordersCompleted[`H${selectedOrder.selectedHex}`] || 0} orders</div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed TES Breakdown */}
          {tesOutput && (
            <div className="mt-3 space-y-2">
              {/* Promise & Timing */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                <div className="bg-secondary/50 rounded p-1.5">
                  <div className="text-muted-foreground flex items-center gap-1"><Clock size={8} /> Promise</div>
                  <div className="text-foreground font-bold text-sm">{String(tesOutput.optimalPromise)}m</div>
                  <div className={`text-[8px] ${Number(tesOutput.anchorDiff) > 0 ? 'text-destructive' : 'text-neon'}`}>
                    {Number(tesOutput.anchorDiff) > 0 ? '+' : ''}{String(tesOutput.anchorDiff)}m from 10m anchor
                  </div>
                </div>
                <div className="bg-secondary/50 rounded p-1.5">
                  <div className="text-muted-foreground">Planned D</div>
                  <div className="text-foreground font-bold text-sm">{String(tesOutput.plannedD)}m</div>
                  <div className="text-[8px] text-muted-foreground">
                    O2S({String(tesOutput.o2s)}) + S2D({String(tesOutput.s2d)})
                  </div>
                </div>
              </div>
              <div className="bg-secondary/50 rounded p-1.5 text-[9px] font-mono">
                <div className="text-muted-foreground mb-1">Cushion (Promise − Planned)</div>
                <div className={`font-bold ${Number(tesOutput.promiseVsPlanned) >= 0 ? 'text-neon' : 'text-destructive'}`}>
                  {Number(tesOutput.promiseVsPlanned) > 0 ? '+' : ''}{String(tesOutput.promiseVsPlanned)}m
                </div>
              </div>

              {/* Weight Components */}
              {tesOutput.weights && (
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Weight Components</div>
                  {[
                    { label: 'W1 Aggressiveness', value: (tesOutput.weights as Record<string, unknown>).W1, reason: (tesOutput.weights as Record<string, unknown>).W1_reason },
                    { label: 'W2 Feasibility', value: (tesOutput.weights as Record<string, unknown>).W2, reason: (tesOutput.weights as Record<string, unknown>).W2_reason },
                    { label: 'W3 Rider Quality', value: (tesOutput.weights as Record<string, unknown>).W3, reason: (tesOutput.weights as Record<string, unknown>).W3_reason },
                    { label: 'Cost Penalty', value: `-${(tesOutput.weights as Record<string, unknown>).cost}`, reason: 'Variance in picking/packing adds risk' },
                    { label: 'Persona Modifier', value: (tesOutput.weights as Record<string, unknown>).personaModifier, reason: `${Number((tesOutput.weights as Record<string, unknown>).personaModifier) > 0 ? 'Trusted customer boost' : Number((tesOutput.weights as Record<string, unknown>).personaModifier) < 0 ? 'Low trust penalty' : 'Neutral baseline'}` },
                  ].map((w, i) => (
                    <div key={i} className="bg-card border border-border/50 rounded p-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-bold text-foreground">{w.label}</span>
                        <span className="text-[10px] font-mono font-bold text-neon">{String(w.value)}</span>
                      </div>
                      <div className="text-[8px] font-mono text-muted-foreground">{String(w.reason)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
