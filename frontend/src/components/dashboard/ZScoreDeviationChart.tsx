import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { SensorParameter } from "@/services/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";

function zColor(z: number) {
  if (z >= 3.0) return "#ef4444";
  if (z >= 1.5) return "#f59e0b";
  return "#34d399";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const z = payload[0].value;
  const color = zColor(z);
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      <p className="font-mono" style={{ color }}>Z-Score: {z.toFixed(3)}</p>
      <p className="text-muted-foreground mt-0.5">
        {z >= 3 ? "⚠ CRITICAL" : z >= 1.5 ? "◈ WARNING" : "✓ NORMAL"}
      </p>
    </div>
  );
};

const ZScoreDeviationChart = ({ data }: { data: SensorParameter[] }) => {
  const sorted = [...data]
    .map(s => ({ name: s.name, zScore: Math.round(s.zScore * 1000) / 1000, color: zColor(s.zScore) }))
    .sort((a, b) => b.zScore - a.zScore);

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <Activity className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Z-Score Deviation Analysis</h3>
          <p className="text-xs text-muted-foreground">Sorted by deviation magnitude</p>
        </div>
      </div>

      <div style={{ height: Math.max(280, sorted.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} horizontal={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" domain={[0, "auto"]}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120}
              tick={{ fontSize: 11, fill: "rgba(255,255,255,0.65)" }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine x={1.5} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: "WARN", position: "insideTopRight", fill: "#f59e0b", fontSize: 9, fontWeight: 700 }} />
            <ReferenceLine x={3.0} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: "CRIT", position: "insideTopRight", fill: "#ef4444", fontSize: 9, fontWeight: 700 }} />
            <Bar dataKey="zScore" radius={[0, 6, 6, 0]} barSize={18} maxBarSize={22}>
              {sorted.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85}
                  style={{ filter: `drop-shadow(0 0 4px ${entry.color}66)` }} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-muted-foreground justify-center">
        {[["#34d399","Normal (Z < 1.5)"],["#f59e0b","Warning (1.5–3.0)"],["#ef4444","Critical (Z ≥ 3.0)"]].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default ZScoreDeviationChart;
