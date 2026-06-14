import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getDashboardSnapshot, isEmptySnapshot, SensorParameter, LeakLocation, AnalysisResult } from "@/services/api";
import { loadLastAnalysis } from "@/lib/analysisStore";
import DashboardLayout from "@/layout/DashboardLayout";
import PipelineTopologyGraph from "@/components/dashboard/PipelineTopologyGraph";
import ZScoreDeviationChart from "@/components/dashboard/ZScoreDeviationChart";
import { RefreshCw, AlertTriangle, SlidersHorizontal, BarChart3, Activity, Radar } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar as RechartsRadar, ResponsiveContainer, Tooltip,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";

const RadarPanel = ({ data }: { data: SensorParameter[] }) => {
  const radarData = data.map(s => ({
    param: s.name.length > 8 ? s.name.slice(0, 8) : s.name,
    fullName: s.name,
    zScore: Math.min(s.zScore, 5),
    status: s.status,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 text-xs shadow-2xl">
        <p className="font-semibold mb-1">{d?.fullName}</p>
        <p className="font-mono text-[hsl(var(--primary))]">Z-Score: {d?.zScore?.toFixed(2)}</p>
        <p className={`mt-0.5 ${d?.status === "CRITICAL" ? "text-[hsl(var(--critical))]" : d?.status === "HIGH" ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--safe))]"}`}>
          {d?.status}
        </p>
      </div>
    );
  };

  return (
    <motion.div className="glass-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent)/0.1)] flex items-center justify-center">
          <Radar className="w-4 h-4 text-[hsl(var(--accent))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Sensor Radar Chart</h3>
          <p className="text-xs text-muted-foreground">Z-score deviation across all parameters</p>
        </div>
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="param"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <RechartsRadar name="Z-Score" dataKey="zScore" stroke="#00e5ff"
              fill="#00e5ff" fillOpacity={0.12} strokeWidth={2}
              dot={{ fill: "#00e5ff", r: 3 }} />
            {/* Warning threshold ring */}
            <RechartsRadar name="Warning" dataKey={() => 1.5}
              stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.4} />
            {/* Critical threshold ring */}
            <RechartsRadar name="Critical" dataKey={() => 3}
              stroke="#ef4444" fill="none" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 justify-center mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#00e5ff] inline-block" /> Sensor Z-scores</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f59e0b] inline-block border-dashed" /> Warning (1.5)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#ef4444] inline-block" /> Critical (3.0)</span>
      </div>
    </motion.div>
  );
};

const HeatmapPanel = ({ data }: { data: SensorParameter[] }) => {
  const getColor = (z: number) => {
    if (z >= 3) return "#ef4444";
    if (z >= 1.5) return "#f59e0b";
    if (z >= 0.5) return "#34d399";
    return "#00e5ff";
  };
  const getOpacity = (z: number) => Math.min(0.9, 0.15 + (z / 5) * 0.75);

  return (
    <motion.div className="glass-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <Activity className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Risk Heatmap</h3>
          <p className="text-xs text-muted-foreground">Parameter deviation intensity grid</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {data.map((s, i) => {
          const color = getColor(s.zScore);
          const opacity = getOpacity(s.zScore);
          return (
            <motion.div key={s.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative rounded-xl p-3 border overflow-hidden cursor-default group"
              style={{ borderColor: `${color}33`, background: `${color}${Math.round(opacity * 15).toString(16).padStart(2, "0")}` }}
            >
              {/* Animated shimmer on critical */}
              {s.zScore >= 3 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[dataStream_2s_linear_infinite]" />
              )}
              <div className="relative">
                <p className="text-[10px] text-muted-foreground font-mono truncate">{s.name}</p>
                <p className="font-display text-xl font-bold tabular-nums mt-0.5" style={{ color }}>
                  {typeof s.zScore === "number" ? s.zScore.toFixed(2) : s.zScore}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">z-score</span>
                  <span className="text-[10px] font-bold" style={{ color }}>
                    {s.status}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Color legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center text-[10px] text-muted-foreground">
        {[["#00e5ff","Low (< 0.5)"],["#34d399","Normal (0.5–1.5)"],["#f59e0b","Warning (1.5–3.0)"],["#ef4444","Critical (≥ 3.0)"]].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: c, opacity: 0.7 }} />{l}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

const DeviationScatterPanel = ({ data }: { data: SensorParameter[] }) => {
  const points = data.map((s, i) => ({
    x: i,
    y: s.zScore,
    name: s.name,
    status: s.status,
    deviation: s.deviation,
  }));

  const getColor = (status: string) =>
    status === "CRITICAL" ? "#ef4444" : status === "HIGH" ? "#f59e0b" : "#34d399";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const color = getColor(d.status);
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 text-xs shadow-2xl">
        <p className="font-semibold mb-1">{d.name}</p>
        <p className="font-mono" style={{ color }}>Z: {d.y.toFixed(3)}</p>
        <p className="text-muted-foreground">Dev: {d.deviation > 0 ? "+" : ""}{d.deviation}</p>
      </div>
    );
  };

  return (
    <motion.div className="glass-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--safe)/0.1)] flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-[hsl(var(--safe))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Deviation Scatter</h3>
          <p className="text-xs text-muted-foreground">Parameter index vs Z-score magnitude</p>
        </div>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.07} stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="x" type="number" domain={[-1, data.length]}
              tick={false} axisLine={false} tickLine={false} />
            <YAxis dataKey="y" type="number" domain={[0, "auto"]}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)", fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }} />
            <Scatter data={points} shape={(props: any) => {
              const { cx, cy, payload } = props;
              const color = getColor(payload.status);
              const r = 6 + payload.y * 2;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5}
                    style={{ filter: `drop-shadow(0 0 ${r}px ${color}66)` }} />
                  <circle cx={cx} cy={cy} r={3} fill={color} />
                </g>
              );
            }}>
              {points.map((_, i) => <Cell key={i} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1">Bubble size reflects Z-score magnitude · Color = risk level</p>
    </motion.div>
  );
};

const Visualizations = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ sensors: SensorParameter[]; leak: LeakLocation } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    getDashboardSnapshot()
      .then(snap => {
        if (!isEmptySnapshot(snap)) {
          setData({ sensors: snap.sensorParameters, leak: snap.leakLocation });
        } else {
          const cached = loadLastAnalysis();
          if (cached) setData({ sensors: cached.result.sensorParameters, leak: cached.result.leakLocation });
          else setData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        const cached = loadLastAnalysis();
        if (cached) { setData({ sensors: cached.result.sensorParameters, leak: cached.result.leakLocation }); setLoading(false); }
        else { setError("Could not load visualization data."); setLoading(false); }
      });
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading visualization data...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--critical)/0.1)] border border-[hsl(var(--critical)/0.2)] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[hsl(var(--critical))]" />
          </div>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold text-sm">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!data || data.sensors.length === 0) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-5 glow-cyan">
            <BarChart3 className="w-10 h-10 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">Nothing to visualize</h2>
          <p className="text-muted-foreground text-sm mb-6">Run a simulation to generate sensor data and leak localization results to visualize.</p>
          <button onClick={() => navigate("/simulation")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold glow-cyan">
            <SlidersHorizontal className="w-4 h-4" /> Go to Simulation
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Visualizations</h1>
            <p className="text-sm text-muted-foreground mt-1">Pipeline topology · Sensor analysis · Deviation heatmap</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary)/0.4)] transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Row 1 — Pipeline + Radar */}
        <div className="grid lg:grid-cols-2 gap-5">
          <PipelineTopologyGraph data={data.leak} />
          <RadarPanel data={data.sensors} />
        </div>

        {/* Row 2 — ZScore bar + Heatmap */}
        <div className="grid lg:grid-cols-2 gap-5">
          <ZScoreDeviationChart data={data.sensors} />
          <HeatmapPanel data={data.sensors} />
        </div>

        {/* Row 3 — Scatter full width */}
        <DeviationScatterPanel data={data.sensors} />
      </div>
    </DashboardLayout>
  );
};

export default Visualizations;
