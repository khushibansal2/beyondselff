import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { extractTextFromImage, parseReceiptData } from '../services/ocrService';
import { generateTrendData, generateInsights } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast } from '../components/ui/Components';
import { CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import RoboAdvisor from '../components/ui/RoboAdvisor';
import { Banknote, CreditCard, Landmark, TrendingUp, RefreshCw, AlertTriangle, LayoutDashboard, ClipboardList, Sparkles } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4'];

function FinanceMetric({ icon: Icon, color, label, value, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-6 flex flex-col items-center text-center gap-3 group hover:translate-y-[-2px] transition-all duration-300"
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/[0.06] transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}12`, boxShadow: `0 0 20px ${color}15` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <p className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold">{label}</p>
      <p className="text-[20px] font-bold tracking-tight leading-none truncate w-full">{value}</p>
      {subtitle && <p className="text-[10px] text-[#3f3f46]">{subtitle}</p>}
    </motion.div>
  );
}

// Removed old RoboAdvisor component to use the new dynamic one from components/ui/RoboAdvisor


export default function Finance() {
  const { user } = useAuth();
  const { finance, computed, updateDomain, addTimelineEvent } = useData();
  const [tab, setTab] = useState('overview');
  
  // Use data from context
  const f = { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0, ...(finance || {}) };
  const score = computed?.financeScore?.score || 0;
  
  const trendData = useMemo(() => generateTrendData(user || {}, 30), [user]);
  
  const [form, setForm] = useState({ income: '', expense: '', category: 'food', amount: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const currentState = useMemo(() => ({
    health: user?.health || { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0 },
    finance: f,
    career: computed?.careerScore?.raw || { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0 }
  }), [user, f, computed]);

  const financeInsights = useMemo(() => {
    const all = generateInsights(currentState);
    return all.filter(ins => ins.domains.includes('finance')).slice(0, 2);
  }, [currentState]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'log', label: 'Log Data', icon: ClipboardList },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
  ];

  const expenseBreakdown = [
    { name: 'Living', value: Math.round(f.expenses * 0.35) },
    { name: 'Food', value: Math.round(f.expenses * 0.25) },
    { name: 'Subscriptions', value: f.subscriptions },
    { name: 'Transport', value: Math.round(f.expenses * 0.1) },
    { name: 'Shopping', value: Math.round(f.expenses * 0.15) },
    { name: 'Other', value: Math.round(f.expenses * 0.05) },
  ];

  const savingsRate = f.income > 0 ? Math.round(((f.income - f.expenses) / f.income) * 100) : 0;
  const emotionalSpending = (user?.health?.stressLevel || 0) > 6;

  const handleLog = (e) => {
    e.preventDefault();
    const updated = { ...f };
    let hasUpdate = false;
    
    if (form.income) {
      updated.income = parseInt(form.income);
      hasUpdate = true;
      addTimelineEvent({
        type: 'Income Updated',
        text: `Logged new monthly income: ₹${updated.income}`,
        sentiment: 'positive',
        domain: 'finance'
      });
    }
    
    if (form.amount) {
      const amount = parseInt(form.amount);
      updated.expenses = (updated.expenses || 0) + amount;
      hasUpdate = true;
      addTimelineEvent({
        type: 'Expense Logged',
        text: `Spent ₹${amount} on ${form.category}`,
        sentiment: 'neutral',
        domain: 'finance'
      });
    }
    
    if (hasUpdate) {
      updateDomain('finance', updated);
      setForm({ income: '', expense: '', category: 'food', amount: '' });
      showToast('Financial data updated', 'success');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);
    
    try {
      const text = await extractTextFromImage(file, (progress) => {
        setOcrProgress(progress);
      });
      
      const parsed = parseReceiptData(text);
      
      if (parsed.amount > 0) {
        setForm(prev => ({
          ...prev,
          amount: parsed.amount.toString(),
          category: parsed.category || 'other'
        }));
        showToast(`Receipt scanned! Found ₹${parsed.amount}`, 'success');
      } else {
        showToast('Could not confidently detect an amount. Please enter manually.', 'warning');
      }
    } catch (error) {
      showToast('Failed to read receipt image.', 'error');
    } finally {
      setOcrLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const recommendations = [
    { icon: '💳', title: 'Spending Optimization', text: savingsRate < 20 ? `Your savings rate is ${savingsRate}%. Target 20-30% by cutting ₹${Math.round((f.expenses * 0.2))} in non-essential spending. Start with subscriptions (₹${f.subscriptions}).` : `Great savings rate of ${savingsRate}%! Consider investing the surplus for compound growth.`, confidence: 87, risk: savingsRate < 10 ? 'high' : 'low' },
    { icon: '📈', title: 'Investment Allocation', text: f.investments === 0 ? 'Start investing! Recommended: 60% index funds, 20% bonds, 20% emergency fund. Even ₹1000/month grows significantly over time.' : `Current investments: ₹${f.investments}. Diversify into: 50% equity, 30% debt, 20% gold for stability.`, confidence: 82, risk: 'medium' },
    { icon: '🛡️', title: 'Emergency Fund', text: f.savings < f.expenses * 3 ? `Emergency fund (₹${f.savings}) covers only ${(f.savings / Math.max(1, f.expenses)).toFixed(1)} months. Build to 3-6 months.` : 'Your emergency fund is solid. Consider moving surplus to investments.', confidence: 91, risk: f.savings < f.expenses ? 'high' : 'low' },
    { icon: '🔄', title: 'Subscription Audit', text: f.subscriptions > f.income * 0.1 ? `Subscriptions (₹${f.subscriptions}) are ${Math.round(f.subscriptions/Math.max(1, f.income)*100)}% of income. Review and cut unused.` : 'Subscription spending is reasonable. Review annually.', confidence: 85, risk: f.subscriptions > f.income * 0.15 ? 'high' : 'low' },
    ...(emotionalSpending ? [{ icon: '😰', title: 'Emotional Spending Alert', text: `Your stress level (${user?.health?.stressLevel || 0}/10) correlates with increased spending. Implement a 24-hour wait rule before purchases over ₹500.`, confidence: 79, risk: 'high' }] : []),
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="border border-white/[0.10] p-4 rounded-2xl text-xs" style={{ background: 'rgba(12,12,15,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
          <p className="text-[#71717a] mb-2 font-medium">{label}</p>
          {payload.map(p => <p key={p.name} className="py-0.5" style={{ color: p.color }}>{p.name}: ₹{p.value?.toFixed?.(0)}</p>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container min-h-screen pb-20 bg-mesh">
      <PageHeader title="Financial Intelligence" subtitle="Track your net worth, expenses, and AI-driven optimizations." />
      
      {/* Custom Premium Tab Buttons */}
      <div className="flex flex-wrap justify-start gap-4 mt-8 mb-16 relative z-10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-3 px-7 py-3.5 rounded-2xl text-[13.5px] font-medium tracking-wide transition-all duration-300 select-none outline-none cursor-pointer group border ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-[#090714]/80 border-[#8b5cf6]/20 backdrop-blur-3xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/[0.04] hover:border-[#8b5cf6]/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]'
              }`}
            >
              {/* Active Glowing Background */}
              {isActive && (
                <motion.div
                  layoutId="finance-active-tab-glow"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] shadow-[0_0_24px_rgba(139,92,246,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              
              {/* Content */}
              <span className="relative z-10 flex items-center justify-center">
                <Icon size={16} className={`transition-all duration-300 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-[#8e8e93] group-hover:text-[#c084fc] group-hover:drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]'}`} />
              </span>
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-14 lg:space-y-20">
          {/* Score + Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-7">
            <div className="glass-card p-8 flex flex-col items-center justify-between text-center min-h-[180px]" style={{ boxShadow: '0 0 30px rgba(59,130,246,0.06)' }}>
              <ScoreRing score={score} color="auto" label="" size={80} strokeWidth={6} />
              <span className="text-[10px] text-[#52525b] uppercase tracking-[0.08em] font-semibold">Finance Score</span>
            </div>
            <FinanceMetric icon={Banknote} color="#22c55e" label="Income" value={`₹${f.income.toLocaleString()}`} subtitle="monthly" delay={50} />
            <FinanceMetric icon={CreditCard} color="#f43f5e" label="Expenses" value={`₹${f.expenses.toLocaleString()}`} subtitle="monthly" delay={100} />
            <FinanceMetric icon={Landmark} color="#3b82f6" label="Savings" value={`₹${f.savings.toLocaleString()}`} subtitle="total" delay={150} />
            <FinanceMetric icon={TrendingUp} color="#a78bfa" label="Investments" value={`₹${f.investments.toLocaleString()}`} subtitle="portfolio" delay={200} />
            <FinanceMetric icon={RefreshCw} color="#f59e0b" label="Subscriptions" value={`₹${f.subscriptions.toLocaleString()}`} subtitle="monthly" delay={250} />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
            <GlassCard>
              <h3 className="dash-section-title mb-10">Expense Breakdown</h3>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={110} innerRadius={70} dataKey="value" paddingAngle={3}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(255,255,255,0.05)" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'rgba(12,12,15,0.92)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', fontSize: '12px', backdropFilter: 'blur(20px)' }} />
                    <Legend formatter={(v) => <span className="text-[12px] text-[#a1a1aa] font-medium ml-1">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="dash-section-title mb-5">Spending Trend (30 days)</h3>
              <div className="flex gap-4 mb-10">
                <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f43f5e' }} />
                  <span>Spending (daily)</span>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="spendG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} tickFormatter={v => `₹${v}`} axisLine={false} tickLine={false} dx={-8} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="spending" stroke="#f43f5e" fill="url(#spendG)" strokeWidth={2} name="Spending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Bottom Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
            {/* Card 1: Financial Anxiety Check */}
            <GlassCard className={`flex flex-col justify-between h-full ${(f.debt > 0 || savingsRate < 5 || emotionalSpending) ? 'border-red-500/10' : ''}`} style={(f.debt > 0 || savingsRate < 5 || emotionalSpending) ? { background: 'rgba(239,68,68,0.02)' } : {}}>
              <div>
                <h3 className="dash-section-title mb-10 flex items-center gap-2">
                  <AlertTriangle size={16} className={(f.debt > 0 || savingsRate < 5 || emotionalSpending) ? 'text-red-400' : 'text-emerald-400'} />
                  <span>Financial Anxiety</span>
                </h3>
                <div className="space-y-5">
                  {f.debt > 0 && (
                    <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <p className="font-semibold text-[13px] text-[#f0f0f3] mb-1">Debt: ₹{f.debt.toLocaleString()}</p>
                      <p className="text-[11px] text-[#71717a] leading-relaxed">Prioritize debt repayment. Allocate 20% of income to clearing debt to reduce stress.</p>
                    </div>
                  )}
                  {savingsRate < 5 && (
                    <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <p className="font-semibold text-[13px] text-[#f0f0f3] mb-1">Low Savings Rate: {savingsRate}%</p>
                      <p className="text-[11px] text-[#71717a] leading-relaxed">Aim for 20% minimum. Start with small automated transfers on payday.</p>
                    </div>
                  )}
                  {emotionalSpending && (
                    <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                      <p className="font-semibold text-[13px] text-[#f0f0f3] mb-1">Emotional Spending Risk</p>
                      <p className="text-[11px] text-[#71717a] leading-relaxed">High stress levels linked to impulsive purchases. Use a 24-hour wait rule.</p>
                    </div>
                  )}
                  {!(f.debt > 0 || savingsRate < 5 || emotionalSpending) && (
                    <div className="text-center py-6 text-[12px] text-[#71717a]">
                      <p className="text-[#22c55e] font-semibold text-[13px] mb-1">✓ Healthy Standing</p>
                      <p>No anxiety indicators detected. Your debt, savings rate, and spending patterns look healthy.</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Card 2: Subscription Insights */}
            <GlassCard className="flex flex-col justify-between h-full">
              <div>
                <h3 className="dash-section-title mb-10">🔄 Subscription Insights</h3>
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01] text-center">
                    <p className="text-[10px] text-[#52525b] uppercase tracking-wider font-semibold mb-2">Monthly Subscriptions</p>
                    <p className="text-2xl font-bold tracking-tight text-amber-400">₹{f.subscriptions.toLocaleString()}</p>
                    <p className="text-[10px] text-[#71717a] mt-2">
                      {f.income > 0 ? `${Math.round(f.subscriptions / f.income * 100)}% of monthly income` : 'No income logged'}
                    </p>
                  </div>
                  <div className="text-[12px] text-[#71717a] leading-relaxed">
                    <p className="font-semibold text-[#f0f0f3] mb-1">Potential Action</p>
                    <p>Analyze your active subscriptions. Canceling just one unused service could save up to ₹1,000/month, reducing emotional leaks.</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Card 3: AI Recommendations (Insights) */}
            <GlassCard className="flex flex-col justify-between h-full">
              <div className="w-full">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="dash-section-title mb-0">💡 AI Insights</h3>
                  <button onClick={() => setTab('recommendations')} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">View all</button>
                </div>
                
                <div className="space-y-5 w-full">
                  {financeInsights.map((insight, i) => (
                    <div key={i} className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all duration-200 flex items-start gap-3 group cursor-pointer" onClick={() => setTab('recommendations')}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-sm flex-shrink-0">
                        {insight.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[12px] text-[#f0f0f3] truncate mb-1">{insight.title}</h4>
                        <p className="text-[11px] text-[#71717a] leading-relaxed line-clamp-2">{insight.text}</p>
                      </div>
                      <span className="text-[#3f3f46] group-hover:text-[#71717a] transition-colors mt-0.5 text-sm">→</span>
                    </div>
                  ))}
                  {financeInsights.length === 0 && (
                    <p className="text-[12px] text-[#52525b] text-center py-6">No active insights. Keep logging your data.</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-white/[0.04] pb-10">
            <h3 className="dash-section-title mb-0">Log Financial Data</h3>
            <div className="relative w-full md:w-auto">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                disabled={ocrLoading}
                title="Upload receipt image"
              />
              <button className={`w-full md:w-auto text-[13px] px-5 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all font-medium ${ocrLoading ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'}`}>
                {ocrLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Scanning ({ocrProgress}%)...</>
                ) : (
                  <><span>📸</span> Scan Receipt (AI OCR)</>
                )}
              </button>
            </div>
          </div>
          
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-8">
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2.5 block">Monthly Income</label><input type="number" value={form.income} onChange={e => setForm(p => ({ ...p, income: e.target.value }))} className="input-premium w-full" placeholder="₹25000" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2.5 block">Expense Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-premium w-full"><option value="food">Food & Dining</option><option value="transport">Transport</option><option value="shopping">Shopping</option><option value="subscriptions">Subscriptions</option><option value="bills">Bills & Utilities</option><option value="other">Other</option></select></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2.5 block">Amount</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="input-premium w-full" placeholder="₹500" /></div>
            <div className="flex items-end mt-2"><button type="submit" className="btn-primary w-full py-[14px]">Save Entry</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-14 lg:space-y-20">
          <RoboAdvisor financeData={f} />
          
          <div className="pt-6">
            <h3 className="dash-section-title mb-12 flex items-center gap-2">
              <span>💡</span> Spending Optimizations
            </h3>
            <div className="space-y-10">
              {recommendations.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <GlassCard>
                    <div className="flex items-start gap-7">
                      <span className="text-4xl flex-shrink-0 mt-0.5">{r.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-5 gap-4">
                          <h4 className="text-[15px] font-semibold text-[#f0f0f3]">{r.title}</h4>
                          <div className="flex gap-3 flex-shrink-0">
                            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${r.risk === 'high' ? 'bg-[rgba(224,62,62,0.1)] text-[#ef4444]' : r.risk === 'medium' ? 'bg-[rgba(217,115,13,0.1)] text-[#f59e0b]' : 'bg-[rgba(46,158,107,0.1)] text-[#22c55e]'}`}>Risk: {r.risk}</span>
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#a1a1aa]">{r.confidence}% AI Match</span>
                          </div>
                        </div>
                        <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{r.text}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
