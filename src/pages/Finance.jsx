import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { extractTextFromImage, parseReceiptData } from '../services/ocrService';
import { generateTrendData } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast } from '../components/ui/Components';
import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, Legend } from 'recharts';
import RoboAdvisor from '../components/ui/RoboAdvisor';
import { Banknote, CreditCard, Landmark, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'log', label: 'Log Data', icon: '✏️' },
    { id: 'recommendations', label: 'AI Recommendations', icon: '🤖' },
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
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            <div className="glass-card p-7 flex justify-center col-span-2 sm:col-span-3 lg:col-span-1" style={{ boxShadow: '0 0 30px rgba(59,130,246,0.06)' }}>
              <ScoreRing score={score} color="auto" label="Finance" size={110} />
            </div>
            <FinanceMetric icon={Banknote} color="#22c55e" label="Income" value={`₹${f.income.toLocaleString()}`} subtitle="monthly" delay={50} />
            <FinanceMetric icon={CreditCard} color="#f43f5e" label="Expenses" value={`₹${f.expenses.toLocaleString()}`} subtitle="monthly" delay={100} />
            <FinanceMetric icon={Landmark} color="#3b82f6" label="Savings" value={`₹${f.savings.toLocaleString()}`} subtitle="total" delay={150} />
            <FinanceMetric icon={TrendingUp} color="#a78bfa" label="Investments" value={`₹${f.investments.toLocaleString()}`} subtitle="portfolio" delay={200} />
            <FinanceMetric icon={RefreshCw} color="#f59e0b" label="Subscriptions" value={`₹${f.subscriptions.toLocaleString()}`} subtitle="monthly" delay={250} />
          </div>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
            <GlassCard>
              <h3 className="dash-section-title mb-8">Expense Breakdown</h3>
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
              <h3 className="dash-section-title mb-8">Spending Trend (30 days)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="spendG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 11 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="spending" stroke="#f43f5e" fill="url(#spendG)" strokeWidth={2} name="Spending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Financial Anxiety Check */}
          {(f.debt > 0 || savingsRate < 5 || emotionalSpending) && (
            <GlassCard className="border-red-500/10" style={{ background: 'rgba(239,68,68,0.02)' }}>
              <div className="flex items-center gap-3 mb-10">
                <AlertTriangle size={16} className="text-red-400" />
                <h3 className="text-[13px] font-bold text-red-300 uppercase tracking-wider mb-0">Financial Anxiety Detection</h3>
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                {f.debt > 0 && (
                  <div className="p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-semibold text-[14px] text-[#f0f0f3] mb-3">Debt: ₹{f.debt.toLocaleString()}</p>
                    <p className="text-[12px] text-[#a1a1aa] leading-relaxed">Prioritize debt repayment. Allocate 20% of income to clearing debt to reduce financial stress.</p>
                  </div>
                )}
                {savingsRate < 5 && (
                  <div className="p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-semibold text-[14px] text-[#f0f0f3] mb-3">Low Savings Rate: {savingsRate}%</p>
                    <p className="text-[12px] text-[#a1a1aa] leading-relaxed">Aim for 20% minimum. Start with small automated transfers on payday.</p>
                  </div>
                )}
                {emotionalSpending && (
                  <div className="p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="font-semibold text-[14px] text-[#f0f0f3] mb-3">Emotional Spending Risk</p>
                    <p className="text-[12px] text-[#a1a1aa] leading-relaxed">High stress levels linked to impulsive purchases. Use a 24-hour wait rule for non-essentials.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/[0.04] pb-6">
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
          
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-9">
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Monthly Income</label><input type="number" value={form.income} onChange={e => setForm(p => ({ ...p, income: e.target.value }))} className="input-premium w-full" placeholder="₹25000" /></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Expense Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-premium w-full"><option value="food">Food & Dining</option><option value="transport">Transport</option><option value="shopping">Shopping</option><option value="subscriptions">Subscriptions</option><option value="bills">Bills & Utilities</option><option value="other">Other</option></select></div>
            <div><label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Amount</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="input-premium w-full" placeholder="₹500" /></div>
            <div className="flex items-end mt-2"><button type="submit" className="btn-primary w-full py-[14px]">Save Entry</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-12">
          <RoboAdvisor financeData={f} />
          
          <div className="pt-4">
            <h3 className="dash-section-title mb-8 flex items-center gap-2">
              <span>💡</span> Spending Optimizations
            </h3>
            <div className="space-y-10">
              {recommendations.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <GlassCard>
                    <div className="flex items-start gap-6">
                      <span className="text-4xl flex-shrink-0">{r.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3 gap-4">
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
