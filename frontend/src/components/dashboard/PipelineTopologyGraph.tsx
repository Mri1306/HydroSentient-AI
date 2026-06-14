import { motion } from "framer-motion";
import { Network } from "lucide-react";
import { LeakLocation } from "@/services/api";

const NODES = [
  { id: "treatment",    label: ["Treatment", "Intake"],       x: 90,  y: 100 },
  { id: "transmission", label: ["Main", "Transmission"],      x: 260, y: 100 },
  { id: "dist_north",   label: ["Distribution", "North"],     x: 420, y: 45  },
  { id: "dist_south",   label: ["Distribution", "South"],     x: 420, y: 160 },
  { id: "service",      label: ["Service", "Lines"],          x: 570, y: 100 },
  { id: "reservoir",    label: ["Pressure", "Regulation"],    x: 90,  y: 210 },
];

const EDGES = [
  { from: "reservoir",    to: "treatment"    },
  { from: "treatment",    to: "transmission" },
  { from: "transmission", to: "dist_north"   },
  { from: "transmission", to: "dist_south"   },
  { from: "dist_north",   to: "service"      },
  { from: "dist_south",   to: "service"      },
];

function mapSegment(name: string): number {
  const n = (name || "").toLowerCase();
  if (n.includes("treatment") || n.includes("intake")) return 0;
  if (n.includes("main") || n.includes("transmission")) return 1;
  if (n.includes("north")) return 2;
  if (n.includes("south")) return 3;
  if (n.includes("terminal") || n.includes("service")) return 4;
  if (n.includes("pressure") || n.includes("regulation") || n.includes("reservoir")) return 5;
  return -1;
}

function riskColor(prob: number) {
  if (prob >= 25) return { stroke: "#ef4444", fill: "rgba(239,68,68,0.15)", glow: "rgba(239,68,68,0.5)" };
  if (prob >= 15) return { stroke: "#f59e0b", fill: "rgba(245,158,11,0.12)", glow: "rgba(245,158,11,0.4)" };
  if (prob >= 8)  return { stroke: "#34d399", fill: "rgba(52,211,153,0.1)",  glow: "rgba(52,211,153,0.3)" };
  return           { stroke: "#00e5ff",        fill: "rgba(0,229,255,0.08)",  glow: "rgba(0,229,255,0.2)" };
}

const PipelineTopologyGraph = ({ data }: { data: LeakLocation }) => {
  const probMap = new Map<number, number>();
  (data.segments || []).forEach(s => {
    const idx = mapSegment(s.segment);
    if (idx >= 0) probMap.set(idx, s.probability);
  });
  const probableIdx = mapSegment(data.probableSegment || "");

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
          <Network className="w-4 h-4 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Pipeline Network Topology</h3>
          <p className="text-xs text-muted-foreground">Live anomaly probability map</p>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 660 270" className="w-full min-w-[480px]" style={{ maxHeight: 270 }}>
          <defs>
            {/* Glow filters */}
            <filter id="glow-r" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-y" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Flow particle gradient */}
            <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0" />
              <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[60,120,180,240].map(y => (
            <line key={y} x1="20" y1={y} x2="640" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          ))}

          {/* Edges + animated flow particles */}
          {EDGES.map((e, ei) => {
            const from = NODES.find(n => n.id === e.from)!;
            const to   = NODES.find(n => n.id === e.to)!;
            const len = Math.hypot(to.x - from.x, to.y - from.y);
            const delay = ei * 0.4;
            return (
              <g key={`${e.from}-${e.to}`}>
                {/* Pipe */}
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke="rgba(0,229,255,0.12)" strokeWidth="3" strokeLinecap="round" />
                {/* Animated flow dot */}
                <circle r="3" fill="#00e5ff" opacity="0.7">
                  <animateMotion dur={`${1.8 + ei * 0.3}s`} repeatCount="indefinite" begin={`${delay}s`}>
                    <mpath>
                      <path d={`M${from.x},${from.y} L${to.x},${to.y}`} />
                    </mpath>
                  </animateMotion>
                  <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${1.8 + ei * 0.3}s`} repeatCount="indefinite" begin={`${delay}s`} />
                </circle>
                {/* Arrow */}
                <polygon
                  points="-5,-3 5,0 -5,3"
                  fill="rgba(0,229,255,0.4)"
                  transform={`translate(${(from.x+to.x)/2},${(from.y+to.y)/2}) rotate(${Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI})`}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node, i) => {
            const prob = probMap.get(i) ?? 0;
            const rc   = riskColor(prob);
            const isBest = i === probableIdx;
            return (
              <g key={node.id}>
                {/* Pulse ring for probable node */}
                {isBest && (
                  <>
                    <circle cx={node.x} cy={node.y} r="38" fill="none" stroke={rc.stroke} strokeWidth="1.5" opacity="0.4">
                      <animate attributeName="r" values="32;42;32" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={node.x} cy={node.y} r="32" fill="none" stroke={rc.stroke} strokeWidth="2" strokeDasharray="4 3" opacity="0.6">
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                        dur="8s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r="26"
                  fill={rc.fill} stroke={rc.stroke}
                  strokeWidth={isBest ? 2.5 : 1.5}
                  style={{ filter: isBest ? `drop-shadow(0 0 10px ${rc.glow})` : `drop-shadow(0 0 4px ${rc.glow})` }}
                />
                {/* Probability text */}
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                  fill={rc.stroke} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                  {prob}%
                </text>
                {/* Label */}
                {node.label.map((line, li) => (
                  <text key={li} x={node.x} y={node.y + 36 + li * 12}
                    textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="500">
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-muted-foreground justify-center">
        {[["#00e5ff","Low (<8%)"],["#34d399","Normal (8-15%)"],["#f59e0b","Elevated (15-25%)"],["#ef4444","Critical (>25%)"]].map(([c,l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
            {l}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default PipelineTopologyGraph;
