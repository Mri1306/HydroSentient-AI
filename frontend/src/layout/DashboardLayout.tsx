import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, SlidersHorizontal, BarChart3, History as HistoryIcon, Settings as SettingsIcon, Home, Menu, X, Droplets, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { checkHealth } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, desc: "System overview" },
  { label: "Simulation", path: "/simulation", icon: SlidersHorizontal, desc: "Run analysis" },
  { label: "Visualizations", path: "/visualizations", icon: BarChart3, desc: "Charts & graphs" },
  { label: "History", path: "/history", icon: HistoryIcon, desc: "Past runs" },
  { label: "Settings", path: "/settings", icon: SettingsIcon, desc: "Config & diagnostics" },
];

type HealthState = "checking" | "online" | "offline" | "model-offline";

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      checkHealth()
        .then(res => { if (!cancelled) setHealth(res.ai_model?.status === "healthy" ? "online" : "model-offline"); })
        .catch(() => { if (!cancelled) setHealth("offline"); });
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const healthDot: Record<HealthState, { color: string; label: string; Icon: typeof Wifi }> = {
    checking:      { color: "text-muted-foreground", label: "Checking...",         Icon: Wifi },
    online:        { color: "text-[hsl(var(--safe))]",   label: "All systems online",  Icon: Wifi },
    "model-offline": { color: "text-[hsl(var(--warning))]", label: "AI model offline", Icon: AlertCircle },
    offline:       { color: "text-[hsl(var(--critical))]", label: "Backend offline",   Icon: WifiOff },
  };
  const { color, label, Icon: HealthIcon } = healthDot[health];

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border/40">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center glow-cyan">
            <Droplets className="w-4 h-4 text-[hsl(var(--primary-foreground))]" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-gradient block leading-none">HydroSentient</span>
            <span className="text-[10px] text-muted-foreground font-mono leading-none">AI v2.0</span>
          </div>
        </button>
        <button className="md:hidden p-1 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pb-2">Navigation</p>
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                active
                  ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full gradient-primary"
                />
              )}
              <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-[hsl(var(--primary))]" : ""}`} />
              <div className="min-w-0">
                <div>{item.label}</div>
                <div className="text-[10px] text-muted-foreground/70 font-normal leading-none mt-0.5">{item.desc}</div>
              </div>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/40 space-y-3">
        <div className={`flex items-center gap-2 text-xs ${color}`}>
          <HealthIcon className={`w-3.5 h-3.5 ${health === "checking" ? "animate-spin" : ""}`} />
          <span>{label}</span>
        </div>
        <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Home className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-60 bg-[hsl(var(--sidebar-background))] border-r border-border/40 flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-30 h-12 px-4 flex items-center border-b border-border/40 bg-background/90 backdrop-blur-md md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-display font-bold text-sm text-gradient">HydroSentient</span>
        </header>
        <main className="flex-1 p-4 md:p-6 xl:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
