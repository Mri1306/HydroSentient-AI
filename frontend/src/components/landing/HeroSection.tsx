import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import WaveBackground from "./WaveBackground";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center gradient-hero overflow-hidden">
      <WaveBackground />
      <div className="container relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-primary/10 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">AI-Powered Infrastructure</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-4">
            <span className="text-gradient">HydroSentient</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 font-light">
            AI-Powered Water Infrastructure Early Warning & Leak Localization System
          </p>
          <p className="text-base text-muted-foreground/80 max-w-xl mx-auto mb-10">
            Real-time monitoring, anomaly detection, and intelligent localization for water distribution networks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl gradient-primary text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03]"
          >
            Open Dashboard
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
