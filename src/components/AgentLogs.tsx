import { AgentLog } from '@/lib/simulation';
import { useEffect, useRef } from 'react';

interface AgentLogsProps {
  logs: AgentLog[];
}

const agentColors: Record<string, string> = {
  PROMISE: 'text-neon',
  ASSIGNMENT: 'text-rider-blue',
  RECOVERY: 'text-recovery-gold',
  SYSTEM: 'text-muted-foreground',
};

export default function AgentLogs({ logs }: AgentLogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="bg-background rounded-lg border border-border p-3 h-[220px] overflow-y-auto terminal-scrollbar font-mono text-xs">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
        <div className="w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Agent Terminal</span>
      </div>
      {logs.length === 0 && (
        <div className="text-muted-foreground italic">Waiting for order flow...</div>
      )}
      {logs.map((log, i) => (
        <div key={i} className="mb-2">
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
  );
}
