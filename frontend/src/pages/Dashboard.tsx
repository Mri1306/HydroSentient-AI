import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "@/layout/DashboardLayout";
import SystemIntelligencePanel from "@/components/dashboard/SystemIntelligencePanel";
import TopViolationsPanel from "@/components/dashboard/TopViolationsPanel";
import MetricsTable from "@/components/dashboard/MetricsTable";
import RemainingLifePanel from "@/components/dashboard/RemainingLifePanel";
import LeakLocalizationPanel from "@/components/dashboard/LeakLocalizationPanel";
import AnalysisReportPanel from "@/components/dashboard/AnalysisReportPanel";
import PipelineTopologyGraph from "@/components/dashboard/PipelineTopologyGraph";
import ZScoreDeviationChart from "@/components/dashboard/ZScoreDeviationChart";
import { getDashboardSnapshot, isEmptySnapshot, AnalysisResult } from "@/services/api";
import { loadLastAnalysis, saveLastAnalysis } from "@/lib/analysisStore";
import { RefreshCw, AlertTriangle, SlidersHorizontal, Droplets, Clock } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted/40 rounded-xl animate-pulse ${className}`} />
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const load = (soft = false) => {
    if (!soft) setLoading(true);
    setRefreshing(true);
    setError(null);
    getDashboardSnapshot()
      .then(snap => {
        if (!isEmptySnapshot(snap)) {
          setData(snap);
          saveLastAnalysis(snap);
          setLastUpdated(Date.now());
        } else {
          const cached = loadLastAnalysis();
          if (cached) { setData(cached.result); setLastUpdated(cached.savedAt); }
          else setData(snap);
        }
      })
      .catch(() => {
        const cached = loadLastAnalysis();
        if (cached) { setData(cached.result); setLastUpdated(cached.savedAt); }
        else setError("Could not reach the backend.");
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  const formatAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  if (loading) return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
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
          <h2 className="font-display font-bold text-xl mb-2">Connection Error</h2>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button onClick={() => load()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold text-sm">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!data || isEmptySnapshot(data)) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div className="text-center max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-5 glow-cyan">
            <Droplets className="w-10 h-10 text-[hsl(var(--primary-foreground))]" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3">No analysis yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Run a simulation first to populate the dashboard with live system intelligence, 
            anomaly detection results, and predictive maintenance data.
          </p>
          <button onClick={() => navigate("/simulation")}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-primary text-[hsl(var(--primary-foreground))] font-semibold glow-cyan">
            <SlidersHorizontal className="w-4 h-4" /> Go to Simulation
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );

  const { systemStatus, sensorParameters, violations, prediction, leakLocation, report } = data;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">System Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {lastUpdated ? `Last updated ${formatAgo(lastUpdated)}` : "Real-time water infrastructure intelligence"}
            </p>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary)/0.4)] transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* System status hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <SystemIntelligencePanel data={systemStatus} />
        </motion.div>

        {/* Row 1 */}
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <TopViolationsPanel violations={violations} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <RemainingLifePanel data={prediction} />
          </motion.div>
        </div>

        {/* Metrics table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <MetricsTable data={sensorParameters} />
        </motion.div>

        {/* Row 2 */}
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <LeakLocalizationPanel data={leakLocation} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <AnalysisReportPanel data={report} />
          </motion.div>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <PipelineTopologyGraph data={leakLocation} />
          </motion.div>
          {sensorParameters.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <ZScoreDeviationChart data={sensorParameters} />
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
