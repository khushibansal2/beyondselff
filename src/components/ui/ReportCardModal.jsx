import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function ReportCardModal({ onClose, data }) {
  const { user } = useAuth();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8 print:p-0 print:bg-white print:block">
      <div className="w-full max-w-4xl max-h-full overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:w-full print:h-full print:max-h-none print:overflow-visible relative">
        
        {/* Web-only controls */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 border-b flex justify-between items-center print:hidden rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">Weekly Life Report Card</h2>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save as PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors">
              Close
            </button>
          </div>
        </div>

        {/* Report Content - This part gets printed */}
        <div className="p-8 md:p-12 print:p-8 bg-white" id="report-card-content">
          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-1">BeyondSelf AI</p>
              <h1 className="text-4xl font-black text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>Weekly Report Card</h1>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">{user?.name}</p>
              <p className="text-slate-500 text-sm">Week of {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center print:border-emerald-200 print:bg-emerald-50 !print-color-adjust">
              <p className="text-emerald-800 font-bold uppercase tracking-wider text-xs mb-2">Health Score</p>
              <p className="text-5xl font-black text-emerald-600">{data.healthScore}</p>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center print:border-amber-200 print:bg-amber-50 !print-color-adjust">
              <p className="text-amber-800 font-bold uppercase tracking-wider text-xs mb-2">Finance Score</p>
              <p className="text-5xl font-black text-amber-600">{data.financeScore}</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center print:border-blue-200 print:bg-blue-50 !print-color-adjust">
              <p className="text-blue-800 font-bold uppercase tracking-wider text-xs mb-2">Career Score</p>
              <p className="text-5xl font-black text-blue-600">{data.careerScore}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">🎯 Key Metrics</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center">
                  <span className="text-slate-600">Life Balance</span>
                  <span className="font-bold text-slate-900 text-lg">{data.balance}/100</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-600">Burnout Risk</span>
                  <span className={`font-bold text-lg ${data.burnout > 60 ? 'text-red-600' : 'text-emerald-600'}`}>{data.burnout}%</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-600">Avg Sleep</span>
                  <span className="font-bold text-slate-900 text-lg">{data.sleepAvg} hrs</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-600">Stress Level</span>
                  <span className="font-bold text-slate-900 text-lg">{data.stressLevel}/10</span>
                </li>
              </ul>
            </div>
            
            <div className="p-6 bg-slate-50 rounded-2xl print:bg-slate-50 !print-color-adjust border">
              <h3 className="text-lg font-bold text-slate-900 mb-3">🧠 Coach's Note</h3>
              <p className="text-slate-700 leading-relaxed italic">
                "{data.coachNote}"
              </p>
              
              <h3 className="text-lg font-bold text-slate-900 mb-3 mt-6">⚡ Action Items for Next Week</h3>
              <ul className="list-disc pl-5 text-slate-700 space-y-2">
                {data.actionItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">🔄 Cross-Domain Patterns Detected</h3>
            <div className="space-y-4">
              {data.patterns.length > 0 ? data.patterns.map((p, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="font-bold text-slate-900">{p.title}</p>
                    <p className="text-sm text-slate-600">{p.effect}</p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500 italic">No significant critical patterns detected this week. Excellent balance!</p>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-slate-400 text-xs">
            Generated by BeyondSelf Digital Twin AI • This report is confidential and intended only for the user.
          </div>
        </div>
      </div>
      
      {/* Print styles needed for forcing background colors and hiding web ui */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #report-card-content, #report-card-content * { visibility: visible; }
          #report-card-content { position: absolute; left: 0; top: 0; width: 100%; }
          .!print-color-adjust { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { size: portrait; margin: 1cm; }
        }
      `}} />
    </div>
  );
}
