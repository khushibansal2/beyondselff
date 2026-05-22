import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainInsight } from '../../services/aiService';

/**
 * AI Explainer Component (Step 2.2: Explainable AI)
 * Fetches and displays a Gemini narrative explanation for a specific deterministic insight,
 * ensuring source traceability and causal reasoning.
 */
export default function AIExplainer({ insightData }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setExpanded(!expanded);
    if (!expanded && !explanation && !loading) {
      setLoading(true);
      const res = await explainInsight(insightData);
      setExplanation(res.explanation);
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/[0.06]">
      <button 
        onClick={handleExplain}
        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors group"
      >
        <span className="text-sm group-hover:scale-110 transition-transform">✨</span>
        {expanded ? 'Hide AI Explanation' : 'Ask AI to Explain This'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 relative">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Analyzing patterns...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider">🧠 AI Explanation</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">Based on computed data</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">"{explanation}"</p>
                  
                  {/* Source Traceability (Rule 8 & 11) */}
                  <div className="mt-2 pt-2 border-t border-white/[0.05]">
                    <span className="text-[9px] text-slate-500 block mb-1">Derived from:</span>
                    <ul className="text-[9px] text-slate-400 pl-3 list-disc">
                      {insightData.domains?.map(d => (
                        <li key={d} className="capitalize">Recent {d} records & trends</li>
                      ))}
                      <li>Deterministic cross-domain engine ({insightData.id || 'analysis'})</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
