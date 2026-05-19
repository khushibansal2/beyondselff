import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateTrendData } from '../data/demoData';
import { analyzeMealImage } from '../services/visionService';
import { ScoreRing, GlassCard, PageHeader, TabBar, MetricCard, showToast, SecurityBadge } from '../components/ui/Components';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Health() {
  const { user } = useAuth();
  const { health, updateDomain, computed } = useData();
  const [tab, setTab] = useState('overview');
  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const score = computed?.healthScore?.score || 0;
  const burnout = computed?.burnout?.risk || 0;
  const trendData = useMemo(() => generateTrendData(user, 30), [user]);
  const [form, setForm] = useState({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '' });
  const [visionLoading, setVisionLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'log', label: 'Log Data', icon: '✏️' },
    { id: 'wellness', label: 'Wellness', icon: '🧘' },
    { id: 'recommendations', label: 'AI Recommendations', icon: '🤖' },
  ];

  const handleLog = (e) => {
    e.preventDefault();
    const updated = { ...h };
    let changes = 0;
    if (form.sleep) { updated.sleepAvg = Number(form.sleep); changes++; }
    if (form.stress) { updated.stressLevel = parseInt(form.stress, 10); changes++; }
    if (form.mood) { updated.moodAvg = Number(form.mood); changes++; }
    if (form.water) { updated.waterIntake = parseInt(form.water, 10); changes++; }
    if (form.calories) { updated.calories = parseInt(form.calories, 10); changes++; }
    if (form.workout) { changes++; }
    if (changes === 0) { showToast('Please fill at least one field', 'error'); return; }
    updateDomain('health', updated);
    setForm({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '' });
    showToast(`Health data updated (${changes} field${changes > 1 ? 's' : ''})`, 'success');
  };

  const handleMealScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      apiKey = window.prompt("To use REAL Computer Vision, please enter your Gemini API Key.\n(It will be stored locally in your browser)");
      if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
      } else {
        e.target.value = '';
        return; // User cancelled
      }
    }

    setVisionLoading(true);
    showToast("Analyzing meal...", "info");

    try {
      const result = await analyzeMealImage(file, apiKey);
      setForm(prev => ({ ...prev, calories: result.calories.toString() }));
      showToast(`Detected: ${result.foodName} (${result.calories} kcal). Macros: ${result.protein}g P / ${result.carbs}g C / ${result.fat}g F`, "success", 6000);
    } catch (error) {
      console.error(error);
      showToast(error.message || "Failed to analyze image.", "error");
      if (error.message.includes("API key")) {
        localStorage.removeItem('gemini_api_key'); // clear invalid key
      }
    } finally {
      setVisionLoading(false);
      e.target.value = '';
    }
  };

  const recommendations = [
    { icon: '😴', title: 'Sleep Optimization', text: h.sleepAvg < 7 ? `Increase sleep from ${h.sleepAvg}h to 7-8h. Try: wind-down routine at 10pm, no caffeine after 2pm, dim lights 1h before bed.` : 'Great sleep habits! Maintain 7-8h consistently for optimal recovery.', confidence: 88, risk: h.sleepAvg < 6 ? 'high' : 'low' },
    { icon: '🏃', title: 'Workout Plan', text: h.workoutsPerWeek < 3 ? `Increase from ${h.workoutsPerWeek} to 4 workouts/week. Start with 20-min sessions: Mon/Wed/Fri cardio, Sat strength.` : `${h.workoutsPerWeek} workouts/week is excellent. Add variety with yoga or swimming for recovery.`, confidence: 85, risk: 'medium' },
    { icon: '🧘', title: 'Stress Recovery', text: h.stressLevel > 7 ? `Critical: stress at ${h.stressLevel}/10. Immediate actions: 5-min breathing exercises, 15-min daily walks, social connection time.` : 'Stress levels are manageable. Maintain balance with regular breaks and mindfulness.', confidence: 82, risk: h.stressLevel > 7 ? 'high' : 'low' },
    { icon: '💧', title: 'Hydration Plan', text: h.waterIntake < 8 ? `Increase from ${h.waterIntake} to 8 glasses. Set hourly reminders. Keep a bottle on your desk.` : 'Great hydration! Continue maintaining 8+ glasses daily.', confidence: 90, risk: 'low' },
    { icon: '🥗', title: 'Nutrition Guidance', text: h.calories > 2500 ? `Current ${h.calories} cal may be high. Focus on whole foods, reduce processed snacks, meal prep on Sundays.` : 'Caloric intake is reasonable. Ensure balanced macros: 30% protein, 40% carbs, 30% fats.', confidence: 75, risk: 'medium' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return <div className="bg-[#252525] border border-[rgba(255,255,255,0.06)] p-3 rounded-xl text-xs"><p className="text-[#9B9B9B] mb-1">{label}</p>{payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value?.toFixed?.(1) || p.value}</p>)}</div>;
    }
    return null;
  };

  // Daily wellness score
  const wellnessFactors = [
    { label: 'Sleep Quality', score: Math.round(Math.min(100, (h.sleepAvg / 8) * 100)), icon: '😴', color: '#8b5cf6' },
    { label: 'Stress Level', score: Math.round(Math.max(0, (10 - h.stressLevel) / 10 * 100)), icon: '😰', color: '#f43f5e' },
    { label: 'Mood', score: Math.round((h.moodAvg / 10) * 100), icon: '😊', color: '#f59e0b' },
    { label: 'Physical Activity', score: Math.round(Math.min(100, (h.workoutsPerWeek / 5) * 100)), icon: '💪', color: '#10b981' },
    { label: 'Hydration', score: Math.round(Math.min(100, (h.waterIntake / 8) * 100)), icon: '💧', color: '#06b6d4' },
    { label: 'Nutrition', score: Math.round(h.calories >= 1800 && h.calories <= 2400 ? 85 : h.calories > 2800 ? 40 : 60), icon: '🥗', color: '#f97316' },
  ];

  return (
    <div className="page-container min-h-screen">
      <PageHeader title="Health & Wellness" subtitle="Track, understand, and optimize your physical and mental wellbeing." icon="❤️" />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <GlassCard className="flex justify-center col-span-2 md:col-span-1" glow="glow-emerald">
              <ScoreRing score={score} color="auto" label="Health Score" size={100} />
            </GlassCard>
            <MetricCard icon="😴" label="Avg Sleep" value={`${h.sleepAvg}h`} color="#8b5cf6" />
            <MetricCard icon="😰" label="Stress" value={`${h.stressLevel}/10`} color="#f43f5e" />
            <MetricCard icon="😊" label="Mood" value={`${h.moodAvg}/10`} color="#f59e0b" />
            <MetricCard icon="💪" label="Workouts/wk" value={h.workoutsPerWeek} color="#10b981" />
            <MetricCard icon="💧" label="Water" value={`${h.waterIntake} gl`} color="#06b6d4" />
            <MetricCard icon="🔥" label="Calories" value={h.calories} color="#f97316" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Sleep & Mood Trends (30 days)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="sleepH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="moodH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sleep" stroke="#8b5cf6" fill="url(#sleepH)" strokeWidth={2} name="Sleep" />
                    <Area type="monotone" dataKey="mood" stroke="#f59e0b" fill="url(#moodH)" strokeWidth={2} name="Mood" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Stress & Water Intake</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.slice(-14)}>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="stress" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Stress" opacity={0.7} />
                    <Bar dataKey="water" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Water" opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* BMI & Burnout Risk */}
          <div className="grid md:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">⚖️ Body Metrics</h3>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: h.bmi < 18.5 || h.bmi > 25 ? '#f59e0b' : '#10b981' }}>{h.bmi}</p>
                  <p className="text-[10px] text-[#9B9B9B] mt-1">BMI</p>
                </div>
                <div className="flex-1 text-xs text-[#9B9B9B]">
                  <p className="mb-1">Category: <strong className={h.bmi < 18.5 ? 'text-[#D9730D]' : h.bmi > 25 ? 'text-[#D9730D]' : 'text-[#2E9E6B]'}>{h.bmi < 18.5 ? 'Underweight' : h.bmi > 30 ? 'Obese' : h.bmi > 25 ? 'Overweight' : 'Normal'}</strong></p>
                  <p>Target range: 18.5–24.9</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className={burnout > 60 ? 'glow-rose' : ''}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🔥 Burnout Risk</h3>
              <div className="flex items-center gap-6">
                <ScoreRing score={burnout} color={burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981'} label="" size={70} strokeWidth={6} />
                <div className="text-xs text-[#9B9B9B]">
                  <p className="font-medium text-sm mb-1" style={{ color: burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#10b981' }}>{burnout > 60 ? 'High Risk' : burnout > 30 ? 'Moderate' : 'Low Risk'}</p>
                  <p>{burnout > 60 ? 'Reduce work hours and prioritize sleep immediately.' : burnout > 30 ? 'Monitor closely. Add breaks.' : 'Sustainable pace. Keep it up!'}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[rgba(255,255,255,0.055)] pb-4">
            <h3 className="text-sm font-semibold">Log Today's Health Data</h3>
            <div className="relative w-full md:w-auto">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMealScan} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                disabled={visionLoading}
                title="Upload meal photo"
              />
              <button className={`w-full md:w-auto text-xs px-4 py-2 rounded-xl border flex items-center justify-center gap-2 transition-all ${visionLoading ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'}`}>
                {visionLoading ? (
                  <><div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> Scanning AI Vision...</>
                ) : (
                  <><span>👁️</span> Scan Meal (AI Vision)</>
                )}
              </button>
            </div>
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'sleep', label: 'Sleep (hours)', placeholder: '7.5', type: 'number', min: 0, max: 14, step: '0.5' },
              { key: 'mood', label: 'Mood (1-10)', placeholder: '7', type: 'number', min: 1, max: 10 },
              { key: 'stress', label: 'Stress (1-10)', placeholder: '4', type: 'number', min: 1, max: 10 },
              { key: 'workout', label: 'Workout (minutes)', placeholder: '30', type: 'number', min: 0 },
              { key: 'water', label: 'Water (glasses)', placeholder: '8', type: 'number', min: 0, max: 20 },
              { key: 'calories', label: 'Calories', placeholder: '2200', type: 'number', min: 0 },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-[#9B9B9B] mb-1.5 block">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="input-premium" placeholder={f.placeholder} step={f.step || 'any'} min={f.min} max={f.max} />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between">
              <SecurityBadge compact />
              <button type="submit" className="btn-primary">Save Health Data ✓</button>
            </div>
          </form>
        </GlassCard>
      )}

      {tab === 'wellness' && (
        <div className="space-y-6">
          {/* Wellness Breakdown */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">🧘 Wellness Factor Breakdown</h3>
            <div className="space-y-4">
              {wellnessFactors.map((wf, i) => (
                <motion.div key={wf.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#EBEBEB] flex items-center gap-2"><span>{wf.icon}</span>{wf.label}</span>
                    <span className="text-xs font-bold" style={{ color: wf.color }}>{wf.score}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${wf.score}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full" style={{ background: wf.color }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Emotional Wellness */}
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">💔 Emotional Wellness Analysis</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${h.moodAvg < 4 ? 'border-red-500/20 bg-red-500/5' : h.moodAvg < 6 ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <p className="text-xs text-[#9B9B9B] mb-1">Emotional State</p>
                <p className="font-semibold text-sm">{h.moodAvg < 4 ? '😔 Needs Attention' : h.moodAvg < 6 ? '😐 Moderate' : '😊 Good'}</p>
                <p className="text-xs text-[#9B9B9B] mt-2">{h.moodAvg < 4 ? 'Consider taking a recovery day and connecting with friends.' : 'Your emotional wellbeing is stable.'}</p>
              </div>
              <div className={`p-4 rounded-xl border ${h.stressLevel > 7 ? 'border-red-500/20 bg-red-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                <p className="text-xs text-[#9B9B9B] mb-1">Burnout Pattern</p>
                <p className="font-semibold text-sm">{h.stressLevel > 7 && h.sleepAvg < 6 ? '🚨 High Risk' : h.stressLevel > 5 ? '⚠️ Watch Closely' : '✅ Sustainable Pace'}</p>
                <p className="text-xs text-[#9B9B9B] mt-2">{h.stressLevel > 7 ? 'Your stress + sleep pattern suggests burnout risk.' : 'Current pace is sustainable.'}</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <p className="text-xs text-[#9B9B9B] mb-1">Recovery Suggestion</p>
                <p className="font-semibold text-sm">🧘 {h.stressLevel > 6 ? 'Active Recovery Needed' : 'Maintain Balance'}</p>
                <p className="text-xs text-[#9B9B9B] mt-2">{h.stressLevel > 6 ? 'Try 10-min meditation, a nature walk, or journaling today.' : 'Keep up your current routines.'}</p>
              </div>
            </div>
          </GlassCard>

          {/* Daily Summary */}
          <GlassCard glow="glow-cyan">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">📝 Daily Health Summary</h3>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#252525]">
                <p className="text-[#9B9B9B] mb-1">Energy Level</p>
                <p className="text-[#EBEBEB]">{h.sleepAvg >= 7 && h.stressLevel < 6 ? '⚡ High — well rested and low stress' : h.sleepAvg >= 5.5 ? '🔋 Moderate — could use more sleep' : '🪫 Low — sleep deprivation detected'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#252525]">
                <p className="text-[#9B9B9B] mb-1">Recovery Status</p>
                <p className="text-[#EBEBEB]">{h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? '✅ Good recovery balance' : '⚠️ Recovery may be insufficient'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#252525]">
                <p className="text-[#9B9B9B] mb-1">Immune Health</p>
                <p className="text-[#EBEBEB]">{h.sleepAvg >= 7 && h.waterIntake >= 6 ? '🛡️ Strong — sleep and hydration support immunity' : '⚠️ Weakened — improve sleep and hydration'}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#252525]">
                <p className="text-[#9B9B9B] mb-1">Cognitive Performance</p>
                <p className="text-[#EBEBEB]">{h.sleepAvg >= 7 && h.stressLevel < 7 ? '🧠 Optimal — focus should be sharp' : '🧠 Reduced — ' + (h.sleepAvg < 6 ? 'sleep deficit' : 'high stress') + ' impacting cognition'}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <GlassCard>
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h4 className="font-semibold">{r.title}</h4>
                      <div className="flex gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.risk === 'high' ? 'bg-[rgba(224,62,62,0.1)] text-[#E03E3E]' : r.risk === 'medium' ? 'bg-[rgba(217,115,13,0.1)] text-[#D9730D]' : 'bg-[rgba(46,158,107,0.1)] text-[#2E9E6B]'}`}>Risk: {r.risk}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9B9B9B]">{r.confidence}% confidence</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#9B9B9B] leading-relaxed">{r.text}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
