import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { Violation } from "@/services/api";

const SEV_CFG: Record<string, { bar: string; badge: string; text: string }> = {
  NORMAL:   { bar: "bg-[hsl(var(--safe))]",     badge: "bg-[hsl(var(--safe)/0.12)] text-[hsl(var(--safe))]",     text: "text-[hsl(var(--safe))]" },
  HIGH:     { bar: "bg-[hsl(var(--warning))]",   badge: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]", text: "text-[hsl(var(--warning))]" },
  CRITICAL: { bar: "bg-[hsl(var(--critical))]",  badge: "bg-[hsl(var(--critical)/0.12)] text-[hsl(var(--critical))]", text: "text-[hsl(var(--critical))]" },
};

const TopViolationsPanel = ({ violations }: { violations: Violation[] }) => {
  const maxZ = Math.max(...violations.map(v => v.zScore), 1);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--critical)/0.1)] flex items-center justify-center">
          <AlertOctagon className="w-4 h-4 text-[hsl(var(--critical))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Top Violations</h3>
          <p className="text-xs text-muted-foreground">{violations.length} parameter{violations.length !== 1 ? "s" : ""} flagged</p>
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-[hsl(var(--safe))] mb-2" />
          <p className="text-sm font-medium text-[hsl(var(--safe))]">No violations detected</p>
          <p className="text-xs text-muted-foreground mt-1">All parameters within normal range</p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v, i) => {
            const cfg = SEV_CFG[v.severity] || SEV_CFG.NORMAL;
            const pct = Math.min(100, (v.zScore / maxZ) * 100);
            return (
              <motion.div
                key={v.parameter}
                className="group"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-4 text-right">{i + 1}</span>
                    <span className="text-sm font-semibold">{v.parameter}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">z={v.zScore.toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${cfg.badge}`}>{v.severity}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${cfg.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  deviation: {v.deviation > 0 ? "+" : ""}{v.deviation}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopViolationsPanel;
