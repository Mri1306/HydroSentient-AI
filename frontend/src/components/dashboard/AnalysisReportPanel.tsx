import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { ImpactReport } from "@/services/api";
import { toast } from "sonner";

const AnalysisReportPanel = ({ data }: { data: ImpactReport }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.analysis).then(() => {
      setCopied(true);
      toast.success("Report copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderLine = (line: string, i: number) => {
    if (line.startsWith("## ")) return <h2 key={i} className="font-display text-base font-bold mt-4 mb-2 text-[hsl(var(--primary))]">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="font-display text-sm font-semibold mt-3 mb-1 text-[hsl(var(--accent))]">{line.slice(4)}</h3>;
    if (line.match(/^\d+\./)) return <p key={i} className="ml-4 text-sm leading-relaxed text-muted-foreground my-0.5">{line}</p>;
    if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="ml-3 text-sm leading-relaxed text-muted-foreground flex gap-2 my-0.5"><span className="text-[hsl(var(--primary))] flex-shrink-0">›</span>{line.slice(2)}</p>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm leading-relaxed text-muted-foreground my-0.5">{line}</p>;
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent)/0.1)] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h3 className="font-display font-semibold">AI Analysis Report</h3>
            <p className="text-xs text-muted-foreground">LLM-generated system assessment</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-4" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-4" />}
        </button>
        <button onClick={handleCopy} className="ml-4 p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0" title="Copy report">
          {copied ? <Check className="w-4 h-4 text-[hsl(var(--safe))]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-0.5">
              {data.analysis.split("\n").map((line, i) => renderLine(line, i))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisReportPanel;
