import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { LeakLocation } from "@/services/api";

const LeakLocalizationPanel = ({ data }: { data: LeakLocation }) => {
  const maxProb = Math.max(...(data.segments || []).map(s => s.probability), 1);

  const barColor = (prob: number) =>
    prob >= 25 ? "hsl(var(--critical))" :
    prob >= 15 ? "hsl(var(--warning))" :
    prob >= 8  ? "hsl(var(--safe))" : "hsl(var(--primary))";

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Leak Localization</h3>
          <p className="text-xs text-muted-foreground">Segment probability analysis</p>
        </div>
      </div>

      {/* Probable segment */}
      <div className={`rounded-xl border p-4 mb-4 text-center relative overflow-hidden ${data.anomalyDetected ? "border-[hsl(var(--critical)/0.4)] bg-[hsl(var(--critical)/0.05)]" : "border-[hsl(var(--safe)/0.3)] bg-[hsl(var(--safe)/0.05)]"}`}>
        {data.anomalyDetected && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--critical)/0.05)] to-transparent animate-[dataStream_3s_linear_infinite]" />
        )}
        <p className="text-xs text-muted-foreground mb-1 font-mono">PROBABLE LEAK SEGMENT</p>
        <p className="font-display text-lg font-bold">{data.probableSegment}</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.anomalyDetected ? "bg-[hsl(var(--critical)/0.15)] text-[hsl(var(--critical))]" : "bg-[hsl(var(--safe)/0.15)] text-[hsl(var(--safe))]"}`}>
            {data.anomalyDetected ? "⚠ ANOMALY" : "✓ NORMAL"}
          </span>
          <span className="text-xs text-muted-foreground font-mono">conf: {data.confidence}%</span>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-2">
        {(data.segments || []).map((seg, i) => {
          const color = barColor(seg.probability);
          const pct = (seg.probability / maxProb) * 100;
          return (
            <motion.div key={seg.segment}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] font-mono text-muted-foreground w-5 text-right">{i+1}</span>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-xs font-medium truncate">{seg.segment}</span>
                  <span className="text-[10px] font-mono ml-2 flex-shrink-0" style={{ color }}>{seg.probability}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default LeakLocalizationPanel;
