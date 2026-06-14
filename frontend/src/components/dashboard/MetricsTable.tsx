import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Table2 } from "lucide-react";
import { SensorParameter } from "@/services/api";

const statusCfg: Record<string, { badge: string; dot: string; bar: string }> = {
  NORMAL:   { badge: "bg-[hsl(var(--safe)/0.12)] text-[hsl(var(--safe))]",     dot: "bg-[hsl(var(--safe))]",     bar: "bg-[hsl(var(--safe))]" },
  HIGH:     { badge: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]", bar: "bg-[hsl(var(--warning))]" },
  CRITICAL: { badge: "bg-[hsl(var(--critical)/0.12)] text-[hsl(var(--critical))]", dot: "bg-[hsl(var(--critical))]", bar: "bg-[hsl(var(--critical))]" },
};

const MetricsTable = ({ data }: { data: SensorParameter[] }) => {
  const [expanded, setExpanded] = useState(true);
  const maxZ = Math.max(...data.map(d => d.zScore), 1);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
            <Table2 className="w-4 h-4 text-[hsl(var(--primary))]" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold">Sensor Parameter Matrix</h3>
            <p className="text-xs text-muted-foreground">{data.length} parameters monitored</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Baseline</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deviation</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Z-Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Risk Bar</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p, i) => {
                    const cfg = statusCfg[p.status] || statusCfg.NORMAL;
                    const barPct = Math.min(100, (p.zScore / maxZ) * 100);
                    return (
                      <motion.tr
                        key={p.name}
                        className="border-t border-border/20 hover:bg-white/[0.02] transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{p.value}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{p.baseline}</td>
                        <td className={`px-4 py-3 text-right font-mono text-xs ${p.deviation > 0 ? "text-[hsl(var(--critical))]" : p.deviation < 0 ? "text-[hsl(var(--warning))]" : "text-muted-foreground"}`}>
                          {p.deviation > 0 ? "+" : ""}{p.deviation.toFixed ? p.deviation.toFixed(2) : p.deviation}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{typeof p.zScore === "number" ? p.zScore.toFixed(2) : p.zScore}</td>
                        <td className="px-4 py-3 w-32">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${cfg.bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${cfg.badge}`}>{p.status}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MetricsTable;
