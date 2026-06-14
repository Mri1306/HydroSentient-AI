import { motion } from "framer-motion";
import { Radio, Cpu, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  { icon: Radio, label: "Sensors", sub: "Data Collection" },
  { icon: Cpu, label: "AI Engine", sub: "Analysis & Prediction" },
  { icon: BarChart3, label: "Insights", sub: "Actionable Intelligence" },
];

const ArchitectureSection = () => (
  <section className="py-24 px-6 bg-muted/40">
    <div className="container max-w-4xl">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">System Architecture</h2>
        <p className="text-muted-foreground">End-to-end pipeline from sensor data to infrastructure insights.</p>
      </motion.div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.2 }}
          >
            <div className="glass-card p-6 text-center min-w-[160px]">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">{step.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{step.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-6 h-6 text-primary/40 hidden md:block flex-shrink-0" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ArchitectureSection;
