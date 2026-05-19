import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { generateTrendData, generateInsights } from '../data/demoData';
import { analyzeMealImage } from '../services/visionService';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast, SecurityBadge } from '../components/ui/Components';
import { CartesianGrid, AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Moon, Flame, Smile, Dumbbell, Droplets, UtensilsCrossed } from 'lucide-react';

function HealthMetric({ icon: Icon, color, label, value, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-6 flex flex-col items-center text-center justify-center gap-2.5 min-h-[160px] group hover:translate-y-[-2px] hover:border-white/[0.10] transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.06] transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}14`, boxShadow: `0 0 24px ${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <p className="text-[10px] text-[#52525b] uppercase tracking-[0.1em] font-semibold mt-1">{label}</p>
      <p className="text-[24px] font-bold tracking-tight leading-none text-[#f0f0f3]">{value}</p>
      {subtitle && <p className="text-[11px] text-[#3f3f46] font-medium">{subtitle}</p>}
    </motion.div>
  );
}

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

  const currentState = useMemo(() => ({
    health: h,
    finance: computed?.financeScore?.raw || { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0 },
    career: computed?.careerScore?.raw || { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0 }
  }), [h, computed]);

  const healthInsights = useMemo(() => {
    const all = generateInsights(currentState);
    return all.filter(ins => ins.domains.includes('health')).slice(0, 2);
  }, [currentState]);

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
      return (
        <div className="border border-white/[0.10] p-4 rounded-2xl text-xs" style={{ background: 'rgba(12,12,15,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
          <p className="text-[#71717a] mb-2 font-medium">{label}</p>
          {payload.map(p => <p key={p.name} className="py-0.5" style={{ color: p.color }}>{p.name}: {p.value?.toFixed?.(1) || p.value}</p>)}
        </div>
      );
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
    <div className="page-container min-h-screen pb-20 bg-mesh">
      <PageHeader title="Health & Wellness" subtitle="Track, understand, and optimize your physical and mental wellbeing." />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-10">
          {/* ── Score + Metrics Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 lg:gap-5">
            {/* Health Score Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl p-6 flex flex-col items-center justify-center text-center min-h-[160px] col-span-2 sm:col-span-3 lg:col-span-1"
              style={{ boxShadow: '0 0 30px rgba(249,115,22,0.05)' }}
            >
              <ScoreRing score={score} color="auto" label="" size={90} strokeWidth={7} />
              <span className="text-[11px] text-[#52525b] uppercase tracking-[0.08em] font-semibold mt-2">Health Score</span>
            </motion.div>

            <HealthMetric icon={Moon} color="#a78bfa" label="Avg Sleep" value={`${h.sleepAvg}h`} subtitle="per night" delay={50} />
            <HealthMetric icon={Flame} color="#f43f5e" label="Stress" value={`${h.stressLevel}/10`} subtitle={h.stressLevel > 6 ? 'High' : 'Normal'} delay={100} />
            <HealthMetric icon={Smile} color="#f59e0b" label="Mood" value={`${h.moodAvg}/10`} subtitle="avg rating" delay={150} />
            <HealthMetric icon={Dumbbell} color="#10b981" label="Workouts" value={h.workoutsPerWeek} subtitle="per week" delay={200} />
            <HealthMetric icon={Droplets} color="#0ea5e9" label="Water" value={`${h.waterIntake}`} subtitle="glasses/day" delay={250} />
            <HealthMetric icon={UtensilsCrossed} color="#f97316" label="Calories" value={h.calories} subtitle="kcal/day" delay={300} />
          </div>

          {/* ── Charts Row ── */}
          <div className="grid lg:grid-cols-2 gap-5 lg:gap-6">
            <GlassCard>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <h3 className="dash-section-title" style={{ marginBottom: 0 }}>Sleep & Mood Trends (30 Days)</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                    <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: '#a78bfa' }} />
                    <span>Sleep (hrs)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                    <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <span>Mood (1-10)</span>
                  </div>
                </div>
              </div>
              <div className="h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="sleepH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient>
                      <linearGradient id="moodH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-4} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sleep" stroke="#a78bfa" fill="url(#sleepH)" strokeWidth={2} name="Sleep" />
                    <Area type="monotone" dataKey="mood" stroke="#f59e0b" fill="url(#moodH)" strokeWidth={2} name="Mood" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <h3 className="dash-section-title" style={{ marginBottom: 0 }}>Stress & Water Intake</h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                    <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: '#f43f5e' }} />
                    <span>Stress (1-10)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                    <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: '#0ea5e9' }} />
                    <span>Water (glasses)</span>
                  </div>
                </div>
              </div>
              <div className="h-72 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.slice(-14)} maxBarSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} tickFormatter={v => v.slice(8)} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-4} width={30} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="stress" fill="#f43f5e" radius={[3, 3, 0, 0]} name="Stress" opacity={0.85} />
                    <Bar dataKey="water" fill="#0ea5e9" radius={[3, 3, 0, 0]} name="Water" opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* ── Bottom Analytics Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            {/* Body Metrics */}
            <GlassCard className="flex flex-col justify-between h-full">
              <div>
                <h3 className="dash-section-title">Body Metrics</h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { label: 'BMI', val: h.bmi || 24.5, unit: '', color: (h.bmi || 24.5) < 18.5 || (h.bmi || 24.5) > 25 ? '#f59e0b' : '#22c55e', sub: 'Normal' },
                    { label: 'Weight', val: h.weight || 70, unit: 'kg', color: '#f0f0f3', sub: null },
                    { label: 'Body Fat', val: h.bodyFat || 18, unit: '%', color: '#f0f0f3', sub: null },
                    { label: 'Muscle Mass', val: h.muscleMass || 32, unit: 'kg', color: '#f0f0f3', sub: null },
                  ].map(m => (
                    <div key={m.label} className="p-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.02] text-center flex flex-col justify-center min-h-[85px]">
                      <p className="text-[8px] text-[#52525b] uppercase tracking-wider font-semibold mb-1">{m.label}</p>
                      <p className="text-[18px] font-bold tracking-tight leading-none" style={{ color: m.color }}>
                        {m.val}<span className="text-[9px] text-[#52525b] font-normal ml-0.5">{m.unit}</span>
                      </p>
                      {m.sub && <p className="text-[8px] text-[#22c55e] mt-1 font-medium">{m.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-5 mt-5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
                <span className="text-[#52525b]">Target BMI range</span>
                <span className="text-[#a1a1aa] font-semibold">18.5 - 24.9</span>
                <span className="text-[#22c55e] font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-wide">Normal</span>
              </div>
            </GlassCard>

            {/* Burnout Risk */}
            <GlassCard className={`flex flex-col justify-between h-full ${burnout > 60 ? 'border-red-500/15' : ''}`} style={burnout > 60 ? { background: 'rgba(239,68,68,0.02)' } : {}}>
              <div>
                <h3 className="dash-section-title">Burnout Risk</h3>
                <div className="flex items-center gap-5 mt-1">
                  <div className="flex-shrink-0">
                    <ScoreRing score={burnout} color={burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#22c55e'} label="" size={90} strokeWidth={7} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[15px] mb-1.5" style={{ color: burnout > 60 ? '#ef4444' : burnout > 30 ? '#f59e0b' : '#22c55e' }}>
                      {burnout > 60 ? 'High Risk' : burnout > 30 ? 'Moderate Risk' : 'Low Risk'}
                    </p>
                    <p className="leading-relaxed text-[12px] text-[#71717a]">
                      {burnout > 60 ? 'Reduce work hours and prioritize sleep immediately.' : burnout > 30 ? 'Monitor closely. Add more breaks to your routine.' : 'Pace is sustainable. Keep up the good work!'}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Health Insights */}
            <GlassCard className="flex flex-col justify-between h-full">
              <div className="w-full">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="dash-section-title" style={{ marginBottom: 0 }}>Health Insights</h3>
                  <button onClick={() => setTab('recommendations')} className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors tracking-wide">View all</button>
                </div>
                
                <div className="space-y-3 w-full">
                  {healthInsights.map((insight, i) => (
                    <div key={i} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08] transition-all duration-200 flex items-start gap-3 group cursor-pointer" onClick={() => setTab('recommendations')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-base flex-shrink-0">
                        {insight.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[12px] text-[#f0f0f3] truncate mb-0.5">{insight.title}</h4>
                        <p className="text-[11px] text-[#71717a] leading-relaxed line-clamp-2">{insight.text}</p>
                      </div>
                      <span className="text-[#3f3f46] group-hover:text-[#71717a] transition-colors mt-1 text-sm">›</span>
                    </div>
                  ))}
                  {healthInsights.length === 0 && (
                    <p className="text-[12px] text-[#52525b] text-center py-8">No active insights. Keep logging your data.</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'log' && (
        <GlassCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/[0.04] pb-6">
            <h3 className="dash-section-title mb-0">Log Today's Health Data</h3>
            <div className="relative w-full md:w-auto">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMealScan} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                disabled={visionLoading}
                title="Upload meal photo"
              />
              <button className={`w-full md:w-auto text-[13px] px-5 py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all font-medium ${visionLoading ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20'}`}>
                {visionLoading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> Scanning AI Vision...</>
                ) : (
                  <><span>👁️</span> Scan Meal (AI Vision)</>
                )}
              </button>
            </div>
          </div>
          <form onSubmit={handleLog} className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[
              { key: 'sleep', label: 'Sleep (hours)', placeholder: '7.5', type: 'number', min: 0, max: 14, step: '0.5' },
              { key: 'mood', label: 'Mood (1-10)', placeholder: '7', type: 'number', min: 1, max: 10 },
              { key: 'stress', label: 'Stress (1-10)', placeholder: '4', type: 'number', min: 1, max: 10 },
              { key: 'workout', label: 'Workout (minutes)', placeholder: '30', type: 'number', min: 0 },
              { key: 'water', label: 'Water (glasses)', placeholder: '8', type: 'number', min: 0, max: 20 },
              { key: 'calories', label: 'Calories', placeholder: '2200', type: 'number', min: 0 },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="input-premium w-full" placeholder={f.placeholder} step={f.step || 'any'} min={f.min} max={f.max} />
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between mt-2 border-t border-white/[0.04] pt-6">
              <SecurityBadge compact />
              <button type="submit" className="btn-primary">Save Health Data</button>
            </div>
          </form>
        </GlassCard>
      )}

      {tab === 'wellness' && (
        <div className="space-y-16">
          {/* Wellness Breakdown */}
          <GlassCard>
            <h3 className="dash-section-title mb-10">🧘 Wellness Factor Breakdown</h3>
            <div className="space-y-7">
              {wellnessFactors.map((wf, i) => (
                <motion.div key={wf.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-[#f0f0f3] flex items-center gap-3 font-medium"><span className="text-lg">{wf.icon}</span>{wf.label}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: wf.color }}>{wf.score}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.04]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${wf.score}%` }} transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full" style={{ background: wf.color, boxShadow: `0 0 10px ${wf.color}30` }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Emotional Wellness */}
          <GlassCard>
            <h3 className="dash-section-title mb-8">💔 Emotional Wellness Analysis</h3>
            <div className="grid md:grid-cols-3 gap-7 lg:gap-10">
              <div className={`p-8 rounded-3xl border ${h.moodAvg < 4 ? 'border-red-500/20 bg-red-500/[0.03]' : h.moodAvg < 6 ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-emerald-500/20 bg-emerald-500/[0.03]'}`}>
                <p className="text-[11px] text-[#71717a] mb-2 font-medium uppercase tracking-wide">Emotional State</p>
                <p className="font-semibold text-[15px] text-[#f0f0f3] mb-3">{h.moodAvg < 4 ? '😔 Needs Attention' : h.moodAvg < 6 ? '😐 Moderate' : '😊 Good'}</p>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{h.moodAvg < 4 ? 'Consider taking a recovery day and connecting with friends.' : 'Your emotional wellbeing is stable.'}</p>
              </div>
              <div className={`p-8 rounded-3xl border ${h.stressLevel > 7 ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-blue-500/20 bg-blue-500/[0.03]'}`}>
                <p className="text-[11px] text-[#71717a] mb-2 font-medium uppercase tracking-wide">Burnout Pattern</p>
                <p className="font-semibold text-[15px] text-[#f0f0f3] mb-3">{h.stressLevel > 7 && h.sleepAvg < 6 ? '🚨 High Risk' : h.stressLevel > 5 ? '⚠️ Watch Closely' : '✅ Sustainable Pace'}</p>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{h.stressLevel > 7 ? 'Your stress + sleep pattern suggests burnout risk.' : 'Current pace is sustainable.'}</p>
              </div>
              <div className="p-8 rounded-3xl border border-purple-500/20 bg-purple-500/[0.03]">
                <p className="text-[11px] text-[#71717a] mb-2 font-medium uppercase tracking-wide">Recovery Suggestion</p>
                <p className="font-semibold text-[15px] text-[#f0f0f3] mb-3">🧘 {h.stressLevel > 6 ? 'Active Recovery Needed' : 'Maintain Balance'}</p>
                <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{h.stressLevel > 6 ? 'Try 10-min meditation, a nature walk, or journaling today.' : 'Keep up your current routines.'}</p>
              </div>
            </div>
          </GlassCard>

          {/* Daily Summary */}
          <GlassCard>
            <h3 className="dash-section-title mb-8">📝 Daily Health Summary</h3>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { label: 'Energy Level', text: h.sleepAvg >= 7 && h.stressLevel < 6 ? '⚡ High — well rested and low stress' : h.sleepAvg >= 5.5 ? '🔋 Moderate — could use more sleep' : '🪫 Low — sleep deprivation detected' },
                { label: 'Recovery Status', text: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? '✅ Good recovery balance' : '⚠️ Recovery may be insufficient' },
                { label: 'Immune Health', text: h.sleepAvg >= 7 && h.waterIntake >= 6 ? '🛡️ Strong — sleep and hydration support immunity' : '⚠️ Weakened — improve sleep and hydration' },
                { label: 'Cognitive Performance', text: h.sleepAvg >= 7 && h.stressLevel < 7 ? '🧠 Optimal — focus should be sharp' : '🧠 Reduced — ' + (h.sleepAvg < 6 ? 'sleep deficit' : 'high stress') + ' impacting cognition' },
              ].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.10] transition-all duration-300" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[10px] text-[#52525b] font-semibold mb-3 uppercase tracking-wider">{item.label}</p>
                  <p className="text-[13px] font-medium text-[#e4e4e7] leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {tab === 'recommendations' && (
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
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] text-[#a1a1aa]">{r.confidence}% confidence</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#a1a1aa] leading-relaxed">{r.text}</p>
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
