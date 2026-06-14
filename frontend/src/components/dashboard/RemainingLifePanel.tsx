import { motion } from "framer-motion";
import { Clock, Activity } from "lucide-react";
import { Prediction } from "@/services/api";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

const RemainingLifePanel = ({ data }: { data: Prediction }) => {
  const hours = useAnimatedCounter(data.remainingUsefulLife, 1800, 0);
  const stability = useAnimatedCounter(data.stabilityPercent, 1400, 0);
  const days = Math.floor(data.remainingUsefulLife / 24);
  const remHours = Math.round(data.remainingUsefulLife % 24);

  const stabilityColor =
    data.stabilityPercent >= 70 ? "hsl(var(--safe))" :
    data.stabilityPercent >= 40 ? "hsl(var(--warning))" : "hsl(var(--critical))";

  const circ = 2 * Math.PI * 42;
  const offset = circ * (1 - data.stabilityPercent / 100);

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <Clock className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Remaining Useful Life</h3>
          <p className="text-xs text-muted-foreground">Predictive maintenance estimate</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Arc gauge */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={stabilityColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              transform="rotate(-90 50 50)"
              style={{ filter: `drop-shadow(0 0 6px ${stabilityColor})` }}
            />
            <text x="50" y="46" textAnchor="middle" fill={stabilityColor} fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">{stability}%</text>
            <text x="50" y="59" textAnchor="middle" fill="currentColor" fillOpacity="0.5" fontSize="8">stability</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5 font-mono">Total Hours</p>
            <p className="font-display text-3xl font-bold tabular-nums" style={{ color: stabilityColor }}>{hours}</p>
            <p className="text-xs text-muted-foreground font-mono">{days}d {remHours}h remaining</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Operational Stability</span>
              <span className="font-mono font-semibold" style={{ color: stabilityColor }}>{stability}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: stabilityColor }}
                initial={{ width: 0 }}
                animate={{ width: `${data.stabilityPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RemainingLifePanel;
