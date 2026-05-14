import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { generateAdaptiveRecommendations, FEEDBACK_ACTIONS } from '../../engines/recommendationEngine';

export function AdaptiveRecommendations({ domain = null }) {
  const ctx = useData();
  const { recordFeedback } = ctx;
  const [animatingOut, setAnimatingOut] = useState(null);

  // Build state shape the engine expects: { health, finance, career, anomalies, feedbackHistory }
  const engineState = {
    health: ctx.health || {},
    finance: ctx.finance || {},
    career: ctx.career || {},
    anomalies: ctx.anomalies || [],
    feedbackHistory: ctx.feedbackHistory || [],
  };

  // Re-run the recommendation engine whenever state or feedbackHistory changes
  const recommendations = useMemo(() => {
    return generateAdaptiveRecommendations(engineState, domain);
  }, [ctx.health, ctx.finance, ctx.career, ctx.anomalies, ctx.feedbackHistory, domain]);

  const handleFeedback = (recId, action, category) => {
    if (action === FEEDBACK_ACTIONS.DISMISS || action === FEEDBACK_ACTIONS.NOT_RELEVANT || action === FEEDBACK_ACTIONS.ALREADY_DOING) {
      setAnimatingOut(recId);
      setTimeout(() => {
        recordFeedback(recId, action, category);
        setAnimatingOut(null);
      }, 300);
    } else {
      recordFeedback(recId, action, category);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-strong text-center text-slate-400">
        <span className="text-3xl block mb-2">🎉</span>
        <p className="text-sm">You're doing great! No urgent recommendations right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {recommendations.map((r, i) => (
          <motion.div 
            key={r.id} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: animatingOut === r.id ? 0 : 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: animatingOut === r.id ? 0 : i * 0.1 }}
            className={`p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden ${
              r.risk === 'high' ? 'bg-red-500/5 border-red-500/20' : 
              r.risk === 'medium' ? 'bg-amber-500/5 border-amber-500/20' : 
              'bg-blue-500/5 border-blue-500/20'
            }`}
          >
            {/* Adaptation Badge */}
            {r.adaptationNote && (
              <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-300 text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-lg font-semibold border-b border-l border-indigo-500/30">
                ✨ Adapted for You
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="text-3xl p-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-white">{r.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      r.risk === 'high' ? 'bg-red-500/20 text-red-300' : 
                      r.risk === 'medium' ? 'bg-amber-500/20 text-amber-300' : 
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      Risk: {r.risk}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {r.text}
                </p>

                {/* Explainability Section */}
                {r.adaptationNote && (
                  <p className="text-xs text-indigo-300/80 italic mb-4">
                    Why this is shown: {r.adaptationNote}
                  </p>
                )}

                {/* Feedback Buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold mr-2">Feedback:</span>
                  
                  <button 
                    onClick={() => handleFeedback(r.id, FEEDBACK_ACTIONS.ACCEPT, r.category)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs transition-colors border border-emerald-500/20"
                    title="Accept this recommendation"
                  >
                    ✓ Accept
                  </button>
                  
                  <button 
                    onClick={() => handleFeedback(r.id, FEEDBACK_ACTIONS.REJECT, r.category)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors border border-red-500/20"
                    title="This doesn't work for me"
                  >
                    ✗ Reject
                  </button>
                  
                  <button 
                    onClick={() => handleFeedback(r.id, FEEDBACK_ACTIONS.ALREADY_DOING, r.category)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs transition-colors border border-blue-500/20"
                    title="I am already doing this"
                  >
                    💪 Already Doing This
                  </button>
                  
                  <div className="flex-1" />
                  
                  <button 
                    onClick={() => handleFeedback(r.id, FEEDBACK_ACTIONS.DISMISS, r.category)}
                    className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-slate-400 text-xs transition-colors border border-transparent hover:border-white/10"
                    title="Hide for now"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
