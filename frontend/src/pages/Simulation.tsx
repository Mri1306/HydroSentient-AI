import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, BarChart3, AlertTriangle, RotateCcw, Zap, Beaker, Droplets, Gauge } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/layout/DashboardLayout";
import SystemIntelligencePanel from "@/components/dashboard/SystemIntelligencePanel";
import TopViolationsPanel from "@/components/dashboard/TopViolationsPanel";
import RemainingLifePanel from "@/components/dashboard/RemainingLifePanel";
import LeakLocalizationPanel from "@/components/dashboard/LeakLocalizationPanel";
import AnalysisReportPanel from "@/components/dashboard/AnalysisReportPanel";
import MetricsTable from "@/components/dashboard/MetricsTable";
import { runAnalysis, AnalysisResult } from "@/services/api";
import { saveLastAnalysis, addHistoryEntry } from "@/lib/analysisStore";

interface ParamConfig {
  key: string; label: string; min: number; max: number; step: number;
  default: number; unit: string; normalRange: string; category: "chemistry" | "hydraulic";
  icon: string;
}

const PARAMS: ParamConfig[] = [
  { key: "pressure",        label: "Pressure",        min: 30,   max: 80,   step: 0.5, default: 55,    unit: "PSI",   normalRange: "52–58",    category: "hydraulic", icon: "⊙" },
  { key: "ph",              label: "pH",              min: 4,    max: 11,   step: 0.1, default: 7.0,   unit: "",      normalRange: "6.5–8.0",  category: "chemistry", icon: "⚗" },
  { key: "hardness",        label: "Hardness",        min: 100,  max: 350,  step: 5,   default: 200,   unit: "mg/L",  normalRange: "170–230",  category: "chemistry", icon: "◈" },
  { key: "solids",          label: "Solids",          min: 10000,max: 35000,step: 500, default: 20000, unit: "ppm",   normalRange: "17k–23k",  category: "chemistry", icon: "≡" },
  { key: "chloramines",     label: "Chloramines",     min: 2,    max: 13,   step: 0.1, default: 7.0,   unit: "ppm",   normalRange: "5.5–8.5",  category: "chemistry", icon: "∿" },
  { key: "sulfate",         label: "Sulfate",         min: 200,  max: 500,  step: 5,   default: 330,   unit: "mg/L",  normalRange: "290–370",  category: "chemistry", icon: "S" },
  { key: "conductivity",    label: "Conductivity",    min: 200,  max: 700,  step: 10,  default: 420,   unit: "µS/cm", normalRange: "340–500",  category: "chemistry", icon: "⌁" },
  { key: "organic_carbon",  label: "Organic Carbon",  min: 5,    max: 25,   step: 0.5, default: 14,    unit: "mg/L",  normalRange: "11–17",    category: "chemistry", icon: "C" },
  { key: "trihalomethanes", label: "Trihalomethanes", min: 20,   max: 120,  step: 1,   default: 66,    unit: "µg/L",  normalRange: "50–82",    category: "chemistry", icon: "⬡" },
  { key: "turbidity",       label: "Turbidity",       min: 1,    max: 7,    step: 0.1, default: 3.5,   unit: "NTU",   normalRange: "3.2–4.6",  category: "chemistry", icon: "◎" },
];

const PRESETS: { name: string; icon: string; desc: string; color: string; values: Record<string, number> }[] = [
  {
    name: "Normal",
    icon: "✓",
    desc: "All baseline values — healthy system",
    color: "text-[hsl(var(--safe))] border-[hsl(var(--safe)/0.3)] hover:bg-[hsl(var(--safe)/0.08)]",
    values: Object.fromEntries(PARAMS.map(p => [p.key, p.default])),
  },
  {
    name: "Pipe Burst",
    icon: "💥",
    desc: "Critical pressure drop with flow anomaly",
    color: "text-[hsl(var(--critical))] border-[hsl(var(--critical)/0.3)] hover:bg-[hsl(var(--critical)/0.08)]",
    values: { pressure: 22, ph: 7.0, hardness: 200, solids: 20000, chloramines: 7.0, sulfate: 330, conductivity: 420, organic_carbon: 14, trihalomethanes: 66, turbidity: 6.5 },
  },
  {
    name: "Contamination",
    icon: "☣",
    desc: "Chemical contamination event",
    color: "text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)] hover:bg-[hsl(var(--warning)/0.08)]",
    values: { pressure: 55, ph: 5.2, hardness: 310, solids: 30000, chloramines: 11.5, sulfate: 450, conductivity: 620, organic_carbon: 22, trihalomethanes: 105, turbidity: 6.8 },
  },
  {
    name: "Drought",
    icon: "🌵",
    desc: "Low-flow drought scenario with high mineral concentration",
    color: "text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)] hover:bg-[hsl(var(--warning)/0.08)]",
    values: { pressure: 38, ph: 8.4, hardness: 290, solids: 28000, chloramines: 8.5, sulfate: 410, conductivity: 560, organic_carbon: 19, trihalomethanes: 85, turbidity: 4.8 },
  },
];

function deviationLevel(key: string, val: number): "safe" | "warn" | "crit" {
  const p = PARAMS.find(c => c.key === key)!;
  const dev = Math.abs(val - p.default);
  const span = (p.max - p.min) * 0.3;
  if (dev > span) return "crit";
  if (dev > span * 0.4) return "warn";
  return "safe";
}

function devColor(level: "safe" | "warn" | "crit") {
  if (level === "crit") return "text-[hsl(var(--critical))]";
  if (level === "warn") return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--safe))]";
}

function trackGradient(key: string, val: number): string {
  const p = PARAMS.find(c => c.key === key)!;
  const pct = ((val - p.min) / (p.max - p.min)) * 100;
  const level = deviationLevel(key, val);
  const color = level === "crit" ? "#ef4444" : level === "warn" ? "#f59e0b" : "#00e5ff";
  return `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`;
}

const Simulation = () => {
  const navigate = useNavigate();
  const defaults = Object.fromEntries(PARAMS.map(p => [p.key, p.default]));
  const [params, setParams] = useState<Record<string, number>>(defaults);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"hydraulic" | "chemistry">("hydraulic");
  const [activePreset, setActivePreset] = useState<string | null>("Normal");

  const handleAnalyze = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await runAnalysis(params);
      setResult(res);
      saveLastAnalysis(res);
      addHistoryEntry(params, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setParams(preset.values);
    setActivePreset(preset.name);
    setResult(null);
    setError(null);
  };

  const reset = () => {
    setParams(defaults);
    setActivePreset("Normal");
    setResult(null);
    setError(null);
  };

  const tabParams = PARAMS.filter(p => p.category === activeTab);
  const changedCount = PARAMS.filter(p => params[p.key] !== p.default).length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Simulation Engine</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure sensor parameters and run AI-powered predictive analysis</p>
          </div>
          {changedCount > 0 && (
            <button onClick={reset} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ({changedCount} changed)
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* ── Left panel ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Scenario Presets */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[hsl(var(--primary))]" />
                <h3 className="font-display font-semibold text-sm">Scenario Presets</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                      activePreset === preset.name
                        ? preset.color + " bg-current/10"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    <div className="text-base mb-0.5">{preset.icon} {preset.name}</div>
                    <div className="text-[10px] opacity-70 leading-tight">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter Sliders */}
            <div className="glass-card p-5">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-5">
                {[
                  { id: "hydraulic", label: "Hydraulic", icon: Gauge },
                  { id: "chemistry", label: "Chemistry", icon: Beaker },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {tabParams.map(p => {
                      const val = params[p.key];
                      const level = deviationLevel(p.key, val);
                      const pct = ((val - p.min) / (p.max - p.min)) * 100;
                      return (
                        <div key={p.key}>
                          <div className="flex justify-between items-baseline mb-2">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                              <span className="font-mono text-xs text-muted-foreground">{p.icon}</span>
                              {p.label}
                            </label>
                            <span className={`font-mono text-sm font-bold tabular-nums ${devColor(level)}`}>
                              {val} {p.unit}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="range"
                              min={p.min} max={p.max} step={p.step} value={val}
                              onChange={e => {
                                setParams(prev => ({ ...prev, [p.key]: parseFloat(e.target.value) }));
                                setActivePreset(null);
                              }}
                              style={{ background: trackGradient(p.key, val) }}
                              className="w-full h-1.5 rounded-full cursor-pointer"
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground font-mono">{p.min}</span>
                            <span className="text-[10px] text-muted-foreground">Normal: {p.normalRange} {p.unit}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.max}</span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Live parameter summary mini-chart */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="w-4 h-4 text-[hsl(var(--primary))]" />
                <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground">Parameter Deviation Overview</h3>
              </div>
              <div className="space-y-1.5">
                {PARAMS.map(p => {
                  const val = params[p.key];
                  const level = deviationLevel(p.key, val);
                  const pct = Math.min(100, (Math.abs(val - p.default) / ((p.max - p.min) * 0.3)) * 100);
                  const color = level === "crit" ? "#ef4444" : level === "warn" ? "#f59e0b" : "#34d399";
                  return (
                    <div key={p.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 truncate font-mono">{p.label}</span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color, width: `${pct}%`, boxShadow: pct > 60 ? `0 0 6px ${color}` : "none" }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-[10px] font-mono w-4 text-right" style={{ color: pct > 0 ? color : undefined }}>
                        {pct > 0 ? "!" : "·"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run button */}
            <motion.button
              onClick={handleAnalyze}
              disabled={loading}
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl gradient-primary text-[hsl(var(--primary-foreground))] font-bold text-base shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
              style={{ boxShadow: loading ? "none" : "0 0 30px rgba(0,229,255,0.3), 0 4px 20px rgba(0,0,0,0.4)" }}
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                : <><Play className="w-5 h-5" /> Run AI Analysis</>
              }
            </motion.button>
          </div>

          {/* ── Right panel: Results ── */}
          <div className="lg:col-span-3 space-y-5 min-h-[40vh]">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div key="loading" className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-[3px] border-[hsl(var(--primary)/0.2)]" />
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[hsl(var(--primary))] animate-spin" />
                    <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-[hsl(var(--accent))] animate-spin" style={{ animationDuration: "0.7s", animationDirection: "reverse" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-[hsl(var(--primary))]" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-semibold text-lg">Running AI Analysis</p>
                    <p className="text-sm text-muted-foreground mt-1">Processing sensor parameters through ML models...</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]"
                        style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`, opacity: 0.6 }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {!loading && error && (
                <motion.div key="error" className="flex items-center justify-center min-h-[40vh]"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--critical)/0.1)] border border-[hsl(var(--critical)/0.3)] flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-[hsl(var(--critical))]" />
                    </div>
                    <h3 className="font-display font-semibold mb-2">Analysis Failed</h3>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <button onClick={handleAnalyze}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold text-sm">
                      <Play className="w-4 h-4" /> Retry Analysis
                    </button>
                  </div>
                </motion.div>
              )}

              {!loading && !result && !error && (
                <motion.div key="empty" className="flex items-center justify-center min-h-[60vh]"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-3xl bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.15)] flex items-center justify-center mx-auto mb-5">
                      <Play className="w-9 h-9 text-[hsl(var(--primary)/0.5)]" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">Ready to Analyze</h3>
                    <p className="text-sm text-muted-foreground">Select a preset scenario or tune the sliders, then hit <strong>Run AI Analysis</strong> to get predictions, leak localization, and remaining life estimates.</p>
                  </div>
                </motion.div>
              )}

              {!loading && result && (
                <motion.div key="results" className="space-y-5"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <SystemIntelligencePanel data={result.systemStatus} />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <TopViolationsPanel violations={result.violations} />
                    <RemainingLifePanel data={result.prediction} />
                  </div>
                  <LeakLocalizationPanel data={result.leakLocation} />
                  <MetricsTable data={result.sensorParameters} />
                  <AnalysisReportPanel data={result.report} />

                  <div className="flex gap-3">
                    <button onClick={() => navigate("/visualizations")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border hover:border-[hsl(var(--primary)/0.4)] bg-card hover:bg-[hsl(var(--primary)/0.05)] text-sm font-semibold transition-all duration-200">
                      <BarChart3 className="w-4 h-4 text-[hsl(var(--primary))]" />
                      View Charts
                    </button>
                    <button onClick={() => navigate("/history")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border hover:border-[hsl(var(--accent)/0.4)] bg-card hover:bg-[hsl(var(--accent)/0.05)] text-sm font-semibold transition-all duration-200">
                      View History
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </DashboardLayout>
  );
};

export default Simulation;
