import { motion } from "framer-motion";
import { Search, MapPin, FlaskConical } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Leak Detection",
    description: "Multi-parameter anomaly detection using AI models to identify pressure drops, chemical deviations, and flow irregularities in real-time.",
  },
  {
    icon: MapPin,
    title: "Leak Localization",
    description: "Intelligent segment-level localization that correlates sensor data across the network to pinpoint probable breach locations.",
  },
  {
    icon: FlaskConical,
    title: "Contamination Monitoring",
    description: "Continuous water quality analysis tracking chemical parameters against safety baselines to detect contamination ingress events.",
  },
];

const FeaturesSection = () => (
  <section className="py-24 px-6">
    <div className="container max-w-6xl">
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Core Capabilities</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Integrated AI modules working together to protect water infrastructure.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            className="glass-card p-8 group hover:glow-primary transition-all duration-300"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5">
              <feature.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
