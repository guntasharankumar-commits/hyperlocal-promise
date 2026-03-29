import { AgentLog, OrderData } from '@/lib/simulation';
import TESGauge from './TESGauge';
import AgentLogs from './AgentLogs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Gauge, Terminal, Wrench } from 'lucide-react';

interface BrainPanelProps {
  order: OrderData;
  logs: AgentLog[];
  pickingVariance: number;
  packerCongestion: number;
  onPickingVarianceChange: (v: number) => void;
  onPackerCongestionChange: (v: number) => void;
  onSimulateDelay: () => void;
  onReset: () => void;
}

export default function BrainPanel({
  order,
  logs,
  pickingVariance,
  packerCongestion,
  onPickingVarianceChange,
  onPackerCongestionChange,
  onSimulateDelay,
  onReset,
}: BrainPanelProps) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-neon" />
          <h2 className="font-display font-bold text-foreground text-sm tracking-wide uppercase">Agentic Control Tower</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary">
          <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
          <span className="text-[10px] font-mono text-muted-foreground">
            STATE: {order.state}
          </span>
        </div>
      </div>

      {/* TES Gauge */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Gauge size={12} className="text-neon" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Trust Equity Score</span>
        </div>
        <TESGauge value={order.tes} />
      </div>

      {/* Agent Logs */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Terminal size={12} className="text-neon" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Logs</span>
        </div>
        <AgentLogs logs={logs} />
      </div>

      {/* Dark Store Health */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-1.5">
          <Wrench size={12} className="text-amber-warn" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Dark Store Health</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-secondary-foreground">Picking Variance</span>
              <span className="text-xs font-mono text-amber-warn">{pickingVariance.toFixed(1)}σ</span>
            </div>
            <Slider
              value={[pickingVariance]}
              onValueChange={([v]) => onPickingVarianceChange(v)}
              min={0}
              max={5}
              step={0.1}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-secondary-foreground">Packer Congestion</span>
              <span className="text-xs font-mono text-amber-warn">{packerCongestion.toFixed(0)}%</span>
            </div>
            <Slider
              value={[packerCongestion]}
              onValueChange={([v]) => onPackerCongestionChange(v)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onSimulateDelay}
            disabled={order.state !== 'FULFILLMENT'}
            variant="destructive"
            size="sm"
            className="flex-1 gap-1 font-mono text-xs"
          >
            <AlertTriangle size={12} /> SIMULATE DELAY
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="font-mono text-xs"
          >
            RESET
          </Button>
        </div>
      </div>
    </div>
  );
}
