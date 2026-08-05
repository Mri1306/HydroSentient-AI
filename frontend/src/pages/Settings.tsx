@app.get("/health")
def health():
    return {"status": "ok"}
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Server, Cpu, RefreshCw, CheckCircle2, XCircle, AlertCircle, Info, Database, Trash2 } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import { checkHealth } from "@/services/api";
import { clearHistory, clearLastAnalysis, loadHistory } from "@/lib/analysisStore";
import { toast } from "sonner";

const BASELINES = [
  { name: "Pressure",         baseline: "55 PSI",    normal: "52–58 PSI",    note: "Bidirectional" },
  { name: "pH",               baseline: "7.0",       normal: "6.5–8.0",      note: "Bidirectional" },
  { name: "Hardness",         baseline: "200 mg/L",  normal: "170–230 mg/L", note: "High only" },
  { name: "Solids",           baseline: "20k ppm",   normal: "17k–23k ppm",  note: "High only" },
  { name: "Chloramines",      baseline: "7.0 ppm",   normal: "5.5–8.5 ppm",  note: "High only" },
  { name: "Sulfate",          baseline: "330 mg/L",  normal: "290–370 mg/L", note: "High only" },
  { name: "Conductivity",     baseline: "420 µS/cm", normal: "340–500 µS/cm",note: "High only" },
  { name: "Organic Carbon",   baseline: "14 mg/L",   normal: "11–17 mg/L",   note: "High only" },
  { name: "Trihalomethanes",  baseline: "66 µg/L",   normal: "50–82 µg/L",   note: "High only" },
  { name: "Turbidity",        baseline: "3.5 NTU",   normal: "3.2–4.6 NTU",  note: "High only" },
];

type HS = "checking" | "online" | "offline" | "model-offline";

const Settings = () => {
  const [health, setHealth] = useState<HS>("checking");
  const [healthDetail, setHealthDetail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [histCount, setHistCount] = useState(0);
  const apiBase = import.meta.env.VITE_API_URL || "/api";

  const doCheck = () => {
    setChecking(true); setHealth("checking");
    checkHealth()
      .then(async (r) => {

    if (r.ai_model?.status === "healthy") {
        setHealth("online");
        setHealthDetail(null);
        return;
    }

    setHealth("model-offline");
    setHealthDetail("AI service is sleeping. Waking it up...");

    await wakeAI();
})
      .catch(e => { setHealth("offline"); setHealthDetail(e?.message || null); })
      .finally(() => setChecking(false));
  };
  const wakeAI = async () => {
  try {
    toast.info("AI service is sleeping. Waking it up...");

    const AI_URL = "https://water-ai-0kx9.onrender.com";

    // Wake the AI service
    await fetch(`${AI_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });

    // Wait for the model to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check backend again
    doCheck();
  } catch (err) {
    console.log("AI service is still starting...");
  }
};
  useEffect(() => { doCheck(); setHistCount(loadHistory().length); }, []);

  const handleClearSession = () => { clearHistory(); clearLastAnalysis(); setHistCount(0); toast.success("Session data cleared"); };

  const hCfg: Record<HS, { Icon: typeof CheckCircle2; color: string; label: string }> = {
    checking:       { Icon: RefreshCw,    color: "text-muted-foreground", label: "Checking..." },
    online:         { Icon: CheckCircle2, color: "text-[hsl(var(--safe))]",     label: "All systems operational" },
    "model-offline":{ Icon: AlertCircle,  color: "text-[hsl(var(--warning))]",  label: "AI model unreachable" },
    offline:        { Icon: XCircle,      color: "text-[hsl(var(--critical))]", label: "Backend unreachable" },
  };
  const { Icon: HIcon, color: hColor, label: hLabel } = hCfg[health];

  const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <motion.div className="glass-card p-6"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {children}
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-[hsl(var(--primary))]" />
            Settings & Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Connection status, baseline reference, and session management</p>
        </div>

        {/* Connection health */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <Server className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <h3 className="font-display font-semibold">Connection Status</h3>
          </div>

          <div className={`flex items-start gap-4 p-4 rounded-xl bg-muted/30 border mb-4 ${
            health === "online" ? "border-[hsl(var(--safe)/0.2)]" :
            health === "offline" ? "border-[hsl(var(--critical)/0.2)]" :
            health === "model-offline" ? "border-[hsl(var(--warning)/0.2)]" : "border-border"
          }`}>
            <HIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${hColor} ${health === "checking" ? "animate-spin" : ""}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${hColor}`}>{hLabel}</p>
              {healthDetail && <p className="text-xs text-muted-foreground mt-0.5 break-all">{healthDetail}</p>}
            </div>
            <button onClick={doCheck} disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-[hsl(var(--primary)/0.4)] transition-all disabled:opacity-50 flex-shrink-0">
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              Re-check
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl px-4 py-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-wider">API Base URL</p>
              <p className="font-mono text-xs break-all text-[hsl(var(--primary))]">{apiBase}</p>
            </div>
            <div className="bg-muted/30 rounded-xl px-4 py-3 border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-wider">Env Variable</p>
              <p className="font-mono text-xs">VITE_API_URL</p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-[hsl(var(--primary)/0.05)] rounded-xl px-4 py-3 border border-[hsl(var(--primary)/0.1)]">
            <Info className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
            <p>To change backend, set <code className="font-mono bg-muted/50 px-1 rounded">VITE_API_URL</code> in <code className="font-mono bg-muted/50 px-1 rounded">.env.production</code> then run <code className="font-mono bg-muted/50 px-1 rounded">npm run build</code>.</p>
          </div>
        </Card>

        {/* Baselines */}
        <Card delay={0.05}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent)/0.1)] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[hsl(var(--accent))]" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Sensor Baseline Reference</h3>
              <p className="text-xs text-muted-foreground">Values the AI model uses as reference for anomaly detection</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {["Parameter","Baseline","Normal Range","Risk Direction"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BASELINES.map((b, i) => (
                  <motion.tr key={b.name} className="border-b border-border/20 last:border-0 hover:bg-white/[0.02] transition-colors"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 + i * 0.02 }}>
                    <td className="px-3 py-2.5 font-medium">{b.name}</td>
                    <td className="px-3 py-2.5 font-mono text-[hsl(var(--primary))]">{b.baseline}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{b.normal}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.note === "Bidirectional"
                          ? "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]"
                          : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      }`}>{b.note}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Z-score thresholds */}
        <Card delay={0.1}>
          <h3 className="font-display font-semibold mb-4">Risk Classification Thresholds</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { range: "Z < 1.5",      level: "NORMAL",   color: "border-[hsl(var(--safe)/0.3)] bg-[hsl(var(--safe)/0.05)]",     text: "text-[hsl(var(--safe))]" },
              { range: "1.5 ≤ Z < 3.0",level: "WARNING",  color: "border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)]",text: "text-[hsl(var(--warning))]" },
              { range: "Z ≥ 3.0",      level: "CRITICAL", color: "border-[hsl(var(--critical)/0.3)] bg-[hsl(var(--critical)/0.05)]",text: "text-[hsl(var(--critical))]" },
            ].map(t => (
              <div key={t.level} className={`rounded-xl border p-4 text-center ${t.color}`}>
                <p className="font-mono text-sm font-semibold mb-2">{t.range}</p>
                <p className={`text-lg font-display font-bold ${t.text}`}>{t.level}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Session data */}
        <Card delay={0.15}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--safe)/0.1)] flex items-center justify-center">
              <Database className="w-4 h-4 text-[hsl(var(--safe))]" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Session Data</h3>
              <p className="text-xs text-muted-foreground">{histCount} analysis run{histCount !== 1 ? "s" : ""} stored in session storage</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            All analysis history and cached results are stored locally in your browser's session storage.
            This data is never sent anywhere except to the configured backend, and is cleared when you close the tab.
          </p>
          <button onClick={handleClearSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-[hsl(var(--critical))] hover:border-[hsl(var(--critical)/0.4)] transition-all">
            <Trash2 className="w-4 h-4" />
            Clear session data
          </button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
