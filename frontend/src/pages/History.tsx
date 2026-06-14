import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { History as HistoryIcon, Trash2, ChevronDown, ChevronUp, SlidersHorizontal, Eye, Download, Clock, Activity } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import AnalysisReportPanel from "@/components/dashboard/AnalysisReportPanel";
import { HistoryEntry, loadHistory, clearHistory, saveLastAnalysis } from "@/lib/analysisStore";
import { toast } from "sonner";

const riskCfg: Record<string, { badge: string; dot: string; bar: string }> = {
  SAFE:     { badge: "bg-[hsl(var(--safe)/0.12)] text-[hsl(var(--safe))]",     dot: "bg-[hsl(var(--safe))]",     bar: "bg-[hsl(var(--safe))]" },
  WARNING:  { badge: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]", bar: "bg-[hsl(var(--warning))]" },
  CRITICAL: { badge: "bg-[hsl(var(--critical)/0.12)] text-[hsl(var(--critical))]", dot: "bg-[hsl(var(--critical))]", bar: "bg-[hsl(var(--critical))]" },
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function fullTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const exportJSON = (entry: HistoryEntry) => {
  const blob = new Blob([JSON.stringify({ inputParams: entry.inputParams, result: entry.result, savedAt: new Date(entry.savedAt).toISOString() }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hydrosentient-run-${entry.id}.json`;
  a.click();
  toast.success("Export downloaded");
};

const History = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { setEntries(loadHistory()); }, []);

  const handleClear = () => { clearHistory(); setEntries([]); setExpandedId(null); toast.success("History cleared"); };
  const handleViewOnDashboard = (entry: HistoryEntry) => { saveLastAnalysis(entry.result); navigate("/dashboard"); };

  if (entries.length === 0) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-5 glow-cyan">
            <HistoryIcon className="w-10 h-10 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">No history yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Every simulation run is logged here so you can compare scenarios, track trends, and export results.
          </p>
          <button onClick={() => navigate("/simulation")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold glow-cyan">
            <SlidersHorizontal className="w-4 h-4" /> Run a Simulation
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Analysis History</h1>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} run{entries.length !== 1 ? "s" : ""} logged this session</p>
          </div>
          <button onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-[hsl(var(--critical))] hover:border-[hsl(var(--critical)/0.4)] transition-all">
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Runs", value: entries.length, icon: Activity },
            { label: "Critical Events", value: entries.filter(e => e.result.systemStatus.riskLevel === "CRITICAL").length, icon: HistoryIcon },
            { label: "Avg Z-Score", value: (entries.reduce((s, e) => s + e.result.systemStatus.globalZScore, 0) / entries.length).toFixed(2), icon: Clock },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center flex-shrink-0">
                <stat.icon className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <p className="font-display text-xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const expanded = expandedId === entry.id;
            const { systemStatus, prediction, leakLocation } = entry.result;
            const cfg = riskCfg[systemStatus.riskLevel] || riskCfg.SAFE;
            return (
              <motion.div key={entry.id} className="glass-card overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-4">
                  {/* Expand toggle */}
                  <button onClick={() => setExpandedId(expanded ? null : entry.id)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0">
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${cfg.bar}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${cfg.badge}`}>
                          {systemStatus.riskLevel}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          z={systemStatus.globalZScore.toFixed(2)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          conf={systemStatus.confidenceScore.toFixed(0)}%
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          rul={prediction.remainingUsefulLife}h
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        {fullTime(entry.savedAt)}
                        <span className="ml-1 opacity-60">({timeAgo(entry.savedAt)})</span>
                      </p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleViewOnDashboard(entry)} title="View on Dashboard"
                      className="p-2 rounded-lg text-muted-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.08)] transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => exportJSON(entry)} title="Export JSON"
                      className="p-2 rounded-lg text-muted-foreground hover:text-[hsl(var(--safe))] hover:bg-[hsl(var(--safe)/0.08)] transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                        {/* Input params grid */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Input Parameters</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {Object.entries(entry.inputParams).map(([k, v]) => (
                              <div key={k} className="bg-muted/30 rounded-lg px-3 py-2">
                                <p className="text-[10px] text-muted-foreground capitalize font-mono">{k.replace(/_/g, " ")}</p>
                                <p className="font-mono text-sm font-semibold tabular-nums">{v}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Violations */}
                        {entry.result.violations.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Violations ({entry.result.violations.length})</h4>
                            <div className="space-y-1.5">
                              {entry.result.violations.map(v => {
                                const vcfg = riskCfg[v.severity] || riskCfg.SAFE;
                                return (
                                  <div key={v.parameter} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
                                    <span className="font-medium">{v.parameter}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-muted-foreground">z={v.zScore.toFixed(2)}</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${vcfg.badge}`}>{v.severity}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <AnalysisReportPanel data={entry.result.report} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default History;
