import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, AlertTriangle, Activity, Zap, TrendingUp } from "lucide-react";
import { SystemStatus } from "@/services/api";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

const riskConfig = {
  SAFE:     { gradient: "gradient-safe",     Icon: ShieldCheck, label: "All Systems Nominal", border: "border-[hsl(var(--safe)/0.3)]",    glow: "glow-safe",     accent: "hsl(var(--safe))" },
  WARNING:  { gradient: "gradient-warning",  Icon: AlertTriangle, label: "Warning Detected", border: "border-[hsl(var(--warning)/0.4)]", glow: "glow-warning",  accent: "hsl(var(--warning))" },
  CRITICAL: { gradient: "gradient-critical", Icon: ShieldAlert,  label: "Critical Alert",    border: "border-[hsl(var(--critical)/0.5)]", glow: "glow-critical pulse-critical", accent: "hsl(var(--critical))" },
};

const SystemIntelligencePanel = ({ data }: { data: SystemStatus }) => {
  const cfg = riskConfig[data.riskLevel];
  const confidence = useAnimatedCounter(data.confidenceScore, 1500);
  const zScore = useAnimatedCounter(data.globalZScore, 1200, 2);

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.glow}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`${cfg.gradient} p-6 md:p-8`}>
        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent,2px,rgba(0,0,0,0.04),2px,rgba(0,0,0,0.04),4px)] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Status */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
              <cfg.Icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{cfg.label}</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">{data.riskLevel}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${data.anomalyDetected ? "bg-white/20" : "bg-white/15"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${data.anomalyDetected ? "bg-red-300 animate-pulse" : "bg-green-300"}`} />
                  <span className="text-white">{data.anomalyDetected ? "Anomaly Active" : "No Anomaly"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Metrics */}
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { label: "Global Z-Score", value: zScore, icon: Activity },
              { label: "Confidence", value: `${confidence}%`, icon: TrendingUp },
              { label: "Status", value: data.anomalyDetected ? "ALERT" : "CLEAR", icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Icon className="w-3.5 h-3.5 text-white/60" />
                </div>
                <p className="font-display text-xl md:text-2xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-white/60 text-xs mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SystemIntelligencePanel;
