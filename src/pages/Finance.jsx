import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { extractTextFromImage, parseReceiptData } from '../services/ocrService';
import { generateTrendData } from '../data/demoData';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast } from '../components/ui/Components';
import { AdaptiveRecommendations } from '../components/ui/AdaptiveRecommendations';
import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4'];

export default function Finance() {
  const { user } = useAuth();
  const { finance, computed, updateDomain, addTimelineEvent, anomalies = [] } = useData();
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



  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return <div className="glass-strong p-3 rounded-xl text-xs"><p className="text-slate-400 mb-1">{label}</p>{payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: ₹{p.value?.toFixed?.(0)}</p>)}</div>;
    }
    return null;
  };

  const financeAnomalies = anomalies.filter(a => a.affectedDomain === 'finance' || a.type === 'spending_spike');

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Financial Health" subtitle="Track spending, optimize savings, and build financial resilience." icon="💰" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1" glow="glow-amber">
              <ScoreRing score={score} color="auto" label="Finance Score" size={100} />
            </GlassCard>
            <MetricCard icon="💵" label="Income" value={`₹${f.income.toLocaleString()}`} color="#10b981" />
            <MetricCard icon="💸" label="Expenses" value={`₹${f.expenses.toLocaleString()}`} color="#f43f5e" />
            <MetricCard icon="🏦" label="Savings" value={`₹${f.savings.toLocaleString()}`} color="#3b82f6" />
            <MetricCard icon="📈" label="Investments" value={`₹${f.investments.toLocaleString()}`} color="#8b5cf6" />
            <MetricCard icon="🔄" label="Subscriptions" value={`₹${f.subscriptions.toLocaleString()}`} color="#f59e0b" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Expense Breakdown</h3>
              <div className="h-52 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} innerRadius={50} dataKey="value" paddingAngle={2}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                    <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Spending Trend (30 days)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="spendG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="spending" stroke="#f43f5e" fill="url(#spendG)" strokeWidth={2} name="Spending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Detected Anomalies */}
          {financeAnomalies.length > 0 && (
            <GlassCard glow="glow-rose">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🚨 Detected Anomalies</h3>
              <div className="space-y-3">
                {financeAnomalies.map(a => (
                  <div key={a.id} className={`p-4 rounded-xl border text-xs ${a.severity === 'urgent' || a.severity === 'alert' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">{a.severity === 'urgent' || a.severity === 'alert' ? '🚨' : '⚠️'} {a.status === 'monitoring' ? '[Monitoring] ' : ''}{a.title}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 px-2 py-0.5 rounded-full bg-white/10">{a.severity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Baseline</span>
                        <span className="font-medium text-white">₹{a.baseline?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Current Transaction</span>
                        <span className="font-medium text-rose-400">₹{a.current?.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-slate-300">{a.description}</p>
                    <p className="text-slate-400 mt-1 italic text-[10px]">Recommended: {a.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Financial Anxiety Check */}
          {(f.debt > 0 || savingsRate < 5 || emotionalSpending) && (
            <GlassCard glow="glow-rose">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🚨 Financial Anxiety Detection</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {f.debt > 0 && <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs"><p className="font-medium text-red-400">Debt: ₹{f.debt.toLocaleString()}</p><p className="text-slate-400 mt-1">Prioritize debt repayment. Allocate 20% of income to clearing debt.</p></div>}
                {savingsRate < 5 && <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs"><p className="font-medium text-amber-400">Low Savings Rate: {savingsRate}%</p><p className="text-slate-400 mt-1">Aim for 20% minimum. Start with small automated transfers.</p></div>}
                {emotionalSpending && <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs"><p className="font-medium text-purple-400">Emotional Spending Risk</p><p className="text-slate-400 mt-1">High stress levels linked to impulsive purchases. Use 24-hour wait rule.</p></div>}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-semibold">Log Financial Data</h3>
            <div className="relative w-full md:w-auto">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                disabled={ocrLoading}
                title="Upload receipt image"
              />
              <button className={`w-full md:w-auto text-xs px-4 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${ocrLoading ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'}`}>
                {ocrLoading ? (
                  <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Scanning ({ocrProgress}%)...</>
                ) : (
                  <><span>📸</span> Scan Receipt (AI OCR)</>
                )}
              </button>
            </div>
          </div>
          
          <form onSubmit={handleLog} className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-400 mb-1.5 block">Monthly Income</label><input type="number" value={form.income} onChange={e => setForm(p => ({ ...p, income: e.target.value }))} className="input-premium" placeholder="₹25000" /></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Expense Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input-premium"><option value="food">Food & Dining</option><option value="transport">Transport</option><option value="shopping">Shopping</option><option value="subscriptions">Subscriptions</option><option value="bills">Bills & Utilities</option><option value="other">Other</option></select></div>
            <div><label className="text-xs text-slate-400 mb-1.5 block">Amount</label><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="input-premium" placeholder="₹500" /></div>
            <div className="flex items-end"><button type="submit" className="btn-primary w-full">Save Entry ✓</button></div>
          </form>
        </GlassCard>
      )}

      {tab === 'recommendations' && (
        <AdaptiveRecommendations domain="finance" />
      )}
    </div>
  );
}
