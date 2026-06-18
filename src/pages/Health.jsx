import { useState, useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { healthApi } from '../services/backendApi';
import { generateTrendData, generateInsights } from '../data/demoData';
import { analyzeMealImage, analyzeSupplementImage, hasApiKey, saveApiKey, getDemoMealResult, getDemoSupplementResult } from '../services/visionService';
import { parseMedicalReport, getDemoLabResult } from '../services/medicalReportService';
import { generateMealPlan, regenerateSingleMeal } from '../services/nutritionService';
import { chatWithAI } from '../services/aiService';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast, SecurityBadge, RecommendationCard } from '../components/ui/Components';
import { loadFeedback, sortByFeedback } from '../services/recommendationFeedbackService';
import { CartesianGrid, AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Moon, Sun, Flame, Smile, Dumbbell, Droplets, UtensilsCrossed, Eye, Upload, X, Key, CheckCircle, Pill, RefreshCw, Calendar, Check, Brain, Activity, User, Heart, Scale, MoreHorizontal, Leaf, Crown, Target, Mic, Apple, Bell } from 'lucide-react';
import { getCycleDay, getPhaseKey, getDaysUntilNextPeriod, isNearPeriod, periodCountdownLabel, PHASES, PHASE_DIET } from '../services/menstrualCycleService';
import { analyzeFood, hasNutritionixKey } from '../services/nutritionixService';

function HealthMetric({ icon: Icon, color, label, value, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontSize: 10.5, color: '#64748b' }}>{label}</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, marginBottom: 3 }}>{value}</p>
      {subtitle && <p style={{ fontSize: 9, color: '#475569' }}>{subtitle}</p>}
    </motion.div>
  );
}

// ── Macro pill helper ──────────────────────────────────────────────────────────
function MacroPill({ label, value, unit, color }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border border-white/[0.06]" style={{ background: `${color}0d` }}>
      <span className="text-[10px] text-[#71717a] uppercase tracking-widest font-semibold">{label}</span>
      <span className="text-[22px] font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] text-[#71717a] font-medium">{unit}</span>
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
function Tag({ label }) {
  return (
    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#71717a] font-medium capitalize">
      {label}
    </span>
  );
}

// ── Scan Vision AI Panel ───────────────────────────────────────────────────────
function ScanVisionPanel({ onApplyCalories }) {
  const [scanType, setScanType] = useState('meal');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const fileInputRef = useRef(null);

  const keyConfigured = !!(apiKey || import.meta.env.VITE_GROQ_API_KEY);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    saveApiKey(trimmed);
    setApiKey(trimmed);
    setKeyInput('');
    setShowKeyPanel(false);
    showToast('API key saved', 'success');
  };

  const handleClearKey = () => {
    saveApiKey('');
    setApiKey('');
    showToast('API key cleared', 'info');
  };

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    setError(null);
    setResult(null);

    const url = URL.createObjectURL(file);
    setPreview(url);
    setScanning(true);

    try {
      const data = scanType === 'meal'
        ? await analyzeMealImage(file)
        : await analyzeSupplementImage(file);
      setIsDemo(false);
      setResult(data);
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        // Fall back to demo data so the feature remains usable
        setIsDemo(true);
        setResult(scanType === 'meal' ? getDemoMealResult() : getDemoSupplementResult());
      } else {
        setError(err.message);
        if (err.message.includes('API key')) setShowKeyPanel(true);
      }
    } finally {
      setScanning(false);
    }
  }, [scanType]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setIsDemo(false);
  };

  const scanTypes = [
    { id: 'meal', label: 'Meal / Food', icon: <UtensilsCrossed size={15} />, color: '#f97316' },
    { id: 'supplement', label: 'Supplement Label', icon: <Pill size={15} />, color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={15} style={{ color: '#f97316' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f0f0f3' }}>Scan Vision AI</h2>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#71717a' }}>Powered by Groq Llama Vision multimodal AI</p>
          </div>
        </div>
        <button
          onClick={() => setShowKeyPanel(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid',
            ...(keyConfigured
              ? { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.25)', color: '#22c55e' }
              : { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)', color: '#f59e0b' }),
          }}
        >
          {keyConfigured ? <CheckCircle size={12} /> : <Key size={12} />}
          {keyConfigured ? 'API Key Configured' : 'Set API Key'}
        </button>
      </div>

      {/* ── API Key Panel ── */}
      <AnimatePresence>
        {showKeyPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>Groq API Key</p>
              <p style={{ margin: 0, fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>Get a free key at <span style={{ color: '#f59e0b' }}>console.groq.com</span>. Stored in your browser.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveKey()} placeholder="gsk_..." className="input-premium flex-1" style={{ fontSize: 12, fontFamily: 'monospace' }} />
                <button onClick={handleSaveKey} disabled={!keyInput.trim()} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', cursor: 'pointer' }}>Save</button>
                {apiKey && <button onClick={handleClearKey} style={{ padding: '7px 12px', borderRadius: 8, fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', cursor: 'pointer' }}>Clear</button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scan type pills ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {scanTypes.map(t => (
          <button key={t.id} onClick={() => { setScanType(t.id); reset(); }} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 10,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s',
            ...(scanType === t.id
              ? { background: 'rgba(99,102,241,0.18)', borderColor: 'rgba(99,102,241,0.4)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af' }),
          }}>
            <span style={{ color: scanType === t.id ? t.color : undefined }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Upload / Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileInputRef.current?.click()}
        style={{
          position: 'relative', borderRadius: 14, border: `2px dashed ${dragOver ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
          background: dragOver ? 'rgba(249,115,22,0.04)' : 'rgba(255,255,255,0.02)',
          minHeight: preview ? 'auto' : 160, cursor: preview ? 'default' : 'pointer',
          transition: 'all 0.25s', overflow: 'hidden',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange}
          />

        {!preview ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px 20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={18} style={{ color: '#71717a' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>Drop image here or click to browse</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#71717a' }}>Also works on mobile — tap to use camera</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#52525b' }}>Supported formats: PNG, JPG, JPEG, WEBP</p>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="scan preview" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12 }} />
            {scanning && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, background: 'rgba(9,9,11,0.78)', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #f97316', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ margin: 0, fontSize: 12, color: '#fb923c', fontWeight: 600 }}>Analyzing with Groq AI…</p>
                <p style={{ margin: 0, fontSize: 11, color: '#71717a' }}>This takes a few seconds</p>
              </div>
            )}
            {!scanning && (
              <button onClick={e => { e.stopPropagation(); reset(); }} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={12} style={{ color: '#fff' }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)', fontSize: 12, color: '#f87171' }}>
          {error}
        </motion.div>
      )}

      {/* ── How it works + security ── */}
      {!preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: '12px 14px' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#c4b5fd' }}>How it works</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>Our AI analyzes your image to identify nutrients, calories, and potential allergens or ingredients. You'll get personalized insights and recommendations.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px' }}>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>🔒 Secure &amp; Private</span>
            <span style={{ fontSize: 11, color: '#71717a' }}>Your data is encrypted and never stored.</span>
          </div>
        </div>
      )}

      {/* ── Results Panel ── */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            {scanType === 'meal' ? (
              <GlassCard>
                {isDemo && (
                  <div className="mb-5 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2.5">
                    <span className="text-amber-400 text-sm">⚠️</span>
                    <p className="text-[11px] text-amber-300 leading-relaxed">
                      <span className="font-semibold">Demo mode</span> — API quota exceeded. Get a free key at{' '}
                      <span className="font-medium underline">console.groq.com → Get API key → Create API key in new project</span>
                    </p>
                  </div>
                )}
                {/* Meal result */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] text-[#71717a] uppercase tracking-widest font-semibold mb-1.5">Detected Food</p>
                    <h3 className="text-[20px] font-bold text-[#f0f0f3] tracking-tight">{result.foodName}</h3>
                    {result.portionSize && <p className="text-[12px] text-[#71717a] mt-1">{result.portionSize}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result.tags?.map(tag => <Tag key={tag} label={tag} />)}
                  </div>
                </div>

                {/* Health score bar */}
                {result.healthScore != null && (
                  <div className="mb-6">
                    <div className="flex justify-between text-[11px] text-[#71717a] mb-2">
                      <span className="font-medium">Health Score</span>
                      <span className="tabular-nums font-semibold" style={{ color: result.healthScore >= 70 ? '#22c55e' : result.healthScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {result.healthScore}/100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.04]">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${result.healthScore}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: result.healthScore >= 70 ? '#22c55e' : result.healthScore >= 40 ? '#f59e0b' : '#ef4444', boxShadow: `0 0 10px ${result.healthScore >= 70 ? '#22c55e' : result.healthScore >= 40 ? '#f59e0b' : '#ef4444'}30` }}
                      />
                    </div>
                  </div>
                )}

                {/* Macro grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <MacroPill label="Calories" value={result.calories} unit="kcal" color="#f97316" />
                  <MacroPill label="Protein" value={result.protein} unit="g" color="#10b981" />
                  <MacroPill label="Carbs" value={result.carbs} unit="g" color="#f59e0b" />
                  <MacroPill label="Fat" value={result.fat} unit="g" color="#ef4444" />
                  {result.fiber != null && <MacroPill label="Fiber" value={result.fiber} unit="g" color="#8b5cf6" />}
                </div>

                {/* Apply button */}
                <div className="flex flex-col sm:flex-row gap-3 border-t border-white/[0.04] pt-5">
                  <button
                    onClick={() => { onApplyCalories({ calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat, foodName: result.foodName }); showToast(`Logged ${result.foodName} — ${result.calories} kcal`, 'success', 5000); }}
                    className="btn-primary flex-1"
                  >
                    Apply Calories to Health Log
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-[#a1a1aa] hover:text-[#f0f0f3] hover:border-white/[0.14] transition-all"
                  >
                    Scan Another
                  </button>
                </div>
              </GlassCard>
            ) : (
              <GlassCard>
                {isDemo && (
                  <div className="mb-5 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2.5">
                    <span className="text-amber-400 text-sm">⚠️</span>
                    <p className="text-[11px] text-amber-300 leading-relaxed">
                      <span className="font-semibold">Demo mode</span> — API quota exceeded. Get a free key at{' '}
                      <span className="font-medium underline">console.groq.com → Get API key → Create API key in new project</span>
                    </p>
                  </div>
                )}
                {/* Supplement result */}
                <div className="mb-6">
                  <p className="text-[10px] text-[#71717a] uppercase tracking-widest font-semibold mb-1.5">Product Detected</p>
                  <h3 className="text-[20px] font-bold text-[#f0f0f3] tracking-tight">{result.productName}</h3>
                  {result.brand && result.brand !== 'Unknown' && (
                    <p className="text-[12px] text-[#71717a] mt-1">by {result.brand} · {result.servingSize}</p>
                  )}
                </div>

                {result.mainBenefit && (
                  <div className="mb-5 p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.04]">
                    <p className="text-[12px] text-purple-300 leading-relaxed">{result.mainBenefit}</p>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold mb-3">Key Ingredients</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {result.keyIngredients?.map((ing, i) => (
                      <div key={i} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <p className="text-[11px] font-semibold text-[#f0f0f3]">{ing.name}</p>
                        <p className="text-[10px] text-[#71717a] mt-0.5">{ing.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.warnings && result.warnings !== 'None' && (
                  <div className="mb-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
                    <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">Warning</p>
                    <p className="text-[12px] text-amber-300/80">{result.warnings}</p>
                  </div>
                )}

                <div className="flex gap-3 border-t border-white/[0.04] pt-5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-[#a1a1aa] hover:text-[#f0f0f3] hover:border-white/[0.14] transition-all"
                  >
                    Scan Another
                  </button>
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NutritionPanel({ healthData, updateDomain, cyclePhaseKey, isFemale }) {
  const profile = healthData?.nutritionProfile || { dietaryPreference: 'Veg', cuisine: 'North Indian', targetCalories: 2000 };
  const cyclePhase = cyclePhaseKey || null;
  const phaseMeta = cyclePhase ? PHASES[cyclePhase] : null;
  const phaseDiet = cyclePhase ? PHASE_DIET[cyclePhase] : null;
  const plan = healthData?.dailyMealPlan || {
    totalCalories: 1900,
    macros: { protein: 57, carbs: 210, fat: 55 },
    meals: [
      { type: 'Breakfast', name: 'Masala Oats with Poha', calories: 430, time: '8:00 AM', macros: { protein: 12, carbs: 60, fat: 8 }, completed: true, icon: '☀️' },
      { type: 'Lunch', name: 'Kadhi Pakora with Rice', calories: 690, time: '1:00 PM', macros: { protein: 20, carbs: 80, fat: 20 }, completed: true, icon: '🌿' },
      { type: 'Snack', name: 'Roasted Makhana and Sprouts Chaat', calories: 210, time: '4:30 PM', macros: { protein: 5, carbs: 30, fat: 2 }, completed: true, icon: '🍎' },
      { type: 'Dinner', name: 'Palak Paneer with Roti', calories: 570, time: '8:00 PM', macros: { protein: 20, carbs: 40, fat: 25 }, completed: false, icon: '🌙' }
    ]
  };

  const [loading, setLoading] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState(null);
  const [showCustomMeal, setShowCustomMeal] = useState(false);
  const [customMeal, setCustomMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', mealType: 'Snack' });
  const [form, setForm] = useState({
    dietaryPreference: profile.dietaryPreference || 'Veg',
    cuisine: profile.cuisine || 'North Indian',
    targetCalories: profile.targetCalories || 2000
  });

  const handleAddCustomMeal = () => {
    const cal = Number(customMeal.calories);
    if (!customMeal.name.trim() || !cal) { showToast('Enter meal name and calories', 'error'); return; }
    const newMeal = {
      type: customMeal.mealType,
      name: customMeal.name.trim(),
      calories: cal,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      macros: { protein: Number(customMeal.protein) || 0, carbs: Number(customMeal.carbs) || 0, fat: Number(customMeal.fat) || 0 },
      completed: true,
      icon: '🍽️',
    };
    const updatedMeals = [...plan.meals, newMeal];
    const newTotalCalories = updatedMeals.reduce((s, m) => s + m.calories, 0);
    const newMacros = {
      protein: updatedMeals.reduce((s, m) => s + (m.macros?.protein || 0), 0),
      carbs: updatedMeals.reduce((s, m) => s + (m.macros?.carbs || 0), 0),
      fat: updatedMeals.reduce((s, m) => s + (m.macros?.fat || 0), 0),
    };
    updateDomain('health', { ...healthData, dailyMealPlan: { ...plan, meals: updatedMeals, totalCalories: newTotalCalories, macros: newMacros } });
    setCustomMeal({ name: '', calories: '', protein: '', carbs: '', fat: '', mealType: 'Snack' });
    setShowCustomMeal(false);
    showToast(`Added ${newMeal.name} (${cal} kcal)`, 'success');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedProfile = { ...form, targetCalories: Number(form.targetCalories) };
    try {
      const newPlan = await generateMealPlan(updatedProfile, cyclePhase);
      updateDomain('health', {
        ...healthData,
        nutritionProfile: updatedProfile,
        dailyMealPlan: newPlan,
      });
      showToast('Nutrition profile & meal plan generated!', 'success');
    } catch (err) {
      showToast('Failed to generate plan. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSingleMeal = async (mealType, currentMealName) => {
    setLoadingMeal(mealType);
    try {
      const newMeal = await regenerateSingleMeal(profile, mealType, currentMealName, cyclePhase);
      const updatedMeals = plan.meals.map(m => m.type === mealType ? { ...newMeal, completed: m.completed, time: m.time } : m);
      const newTotalCalories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
      const newMacros = {
        protein: updatedMeals.reduce((acc, m) => acc + m.macros.protein, 0),
        carbs: updatedMeals.reduce((acc, m) => acc + m.macros.carbs, 0),
        fat: updatedMeals.reduce((acc, m) => acc + m.macros.fat, 0)
      };

      const updatedPlan = {
        ...plan,
        meals: updatedMeals,
        totalCalories: newTotalCalories,
        macros: newMacros
      };

      updateDomain('health', { ...healthData, dailyMealPlan: updatedPlan });
      showToast(`${mealType} updated!`, 'success');
    } catch (err) {
      showToast('Failed to swap meal. Try again.', 'error');
    } finally {
      setLoadingMeal(null);
    }
  };

  const handleToggleMeal = (mealType) => {
    const updatedMeals = plan.meals.map(m => m.type === mealType ? { ...m, completed: !m.completed } : m);
    updateDomain('health', {
      ...healthData,
      dailyMealPlan: {
        ...plan,
        meals: updatedMeals
      }
    });
  };

  // Compute values for right-hand stats cards dynamically or use sensible mockup fallbacks
  const targetCalories = form.targetCalories || 2000;
  const currentCalories = healthData?.calories || 1840;
  const calPercent = Math.min(100, Math.round((currentCalories / targetCalories) * 100));

  const proteinTarget = 120;
  const currentProtein = healthData?.protein ?? (plan?.macros?.protein || 0);
  const proteinPercent = currentProtein > 0 ? Math.min(100, Math.round((currentProtein / proteinTarget) * 100)) : 0;

  const waterTarget = 8;
  const currentWater = healthData?.waterIntake || 0;
  const waterPercent = currentWater > 0 ? Math.min(100, Math.round((currentWater / waterTarget) * 100)) : 0;

  const macroProtein = healthData?.protein ?? plan?.macros?.protein ?? null;
  const macroCarbs = healthData?.carbs ?? plan?.macros?.carbs ?? null;
  const macroFat = healthData?.fat ?? plan?.macros?.fat ?? null;
  const macroTotalCal = plan?.totalCalories || (healthData?.calories || 0);

  // Compute nutrition score from actual logged calories vs target
  const targetCals = profile.targetCalories || 2000;
  const loggedCals = healthData?.calories || 0;
  const score = loggedCals > 0
    ? (() => {
        const dev = Math.abs(loggedCals - targetCals) / targetCals;
        if (dev <= 0.05) return 95;
        if (dev <= 0.15) return 80;
        if (dev <= 0.30) return 60;
        return 35;
      })()
    : 0;

  return (
    <div style={{ fontFamily: 'var(--font-primary)' }} className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-6 items-stretch w-full px-1">
      
      {/* Left Column: Preferences and Meals */}
      <div className="flex flex-col gap-6 h-full">

        {/* Cycle Phase Banner — shown for females with active cycle tracking */}
        {cyclePhase && phaseMeta && phaseDiet && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14,
              background: phaseMeta.bg, border: `1px solid ${phaseMeta.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: phaseMeta.bg, border: `1px solid ${phaseMeta.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {phaseMeta.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: phaseMeta.color, margin: '0 0 2px' }}>
                {phaseMeta.name} Phase — Cycle-Adjusted Meal Plan
              </p>
              <p style={{ fontSize: 11, color: '#cbd5e1', margin: '0 0 6px', lineHeight: 1.5 }}>
                Your plan will prioritize <strong style={{ color: '#f1f5f9' }}>{phaseDiet.focus}</strong>.{' '}
                {phaseDiet.calorie_note}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {phaseDiet.foods.slice(0, 3).map((f, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {f.split('(')[0].trim()}
                  </span>
                ))}
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: phaseMeta.bg, color: phaseMeta.color, border: `1px solid ${phaseMeta.border}` }}>
                  +{phaseDiet.foods.length - 3} more
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 1: Preferences */}
        <div
          className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-4 shadow-lg w-full"
          style={{ padding: '24px' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 m-0">Your Meal Plan Preferences</h3>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">Tell us your preferences. We'll create a personalized plan for you.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mt-2">
            {/* Diet */}
            <div className="flex flex-col gap-2">
              <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diet</label>
              <div className="relative flex items-center w-full">
                <span className="absolute left-4 text-emerald-400 pointer-events-none">
                  <Leaf size={14} />
                </span>
                <select
                  value={form.dietaryPreference}
                  onChange={e => setForm({...form, dietaryPreference: e.target.value})}
                  style={{ height: '44px', padding: '12px 16px', paddingLeft: '38px', paddingRight: '32px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                  className="w-full text-xs text-slate-200 outline-none transition-all appearance-none cursor-pointer focus:border-[#8b5cf6]/50"
                >
                  <option value="Veg" style={{ backgroundColor: '#050608' }}>Vegetarian</option>
                  <option value="Non-Veg" style={{ backgroundColor: '#050608' }}>Non-Vegetarian</option>
                  <option value="Vegan" style={{ backgroundColor: '#050608' }}>Vegan</option>
                </select>
                <span className="absolute right-4 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>
            </div>

            {/* Cuisine */}
            <div className="flex flex-col gap-2">
              <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cuisine</label>
              <div className="relative flex items-center w-full">
                <span className="absolute left-4 text-amber-400 pointer-events-none">
                  <Crown size={14} />
                </span>
                <select
                  value={form.cuisine}
                  onChange={e => setForm({...form, cuisine: e.target.value})}
                  style={{ height: '44px', padding: '12px 16px', paddingLeft: '38px', paddingRight: '32px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                  className="w-full text-xs text-slate-200 outline-none transition-all appearance-none cursor-pointer focus:border-[#8b5cf6]/50"
                >
                  <option value="North Indian" style={{ backgroundColor: '#050608' }}>North Indian</option>
                  <option value="South Indian" style={{ backgroundColor: '#050608' }}>South Indian</option>
                  <option value="Bengali" style={{ backgroundColor: '#050608' }}>Bengali</option>
                  <option value="Maharashtrian" style={{ backgroundColor: '#050608' }}>Maharashtrian</option>
                  <option value="Pan-Indian" style={{ backgroundColor: '#050608' }}>Pan-Indian (Mixed)</option>
                  <option value="Other" style={{ backgroundColor: '#050608' }}>Other</option>
                </select>
                <span className="absolute right-4 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>
            </div>

            {/* Daily Calorie Target */}
            <div className="flex flex-col gap-2">
              <label style={{ fontFamily: 'var(--font-display)' }} className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Calorie Target (kcal)</label>
              <div className="relative flex items-center w-full">
                <span className="absolute left-4 text-slate-400 pointer-events-none">
                  <Target size={14} />
                </span>
                <select
                  value={form.targetCalories}
                  onChange={e => setForm({...form, targetCalories: Number(e.target.value)})}
                  style={{ height: '44px', padding: '12px 16px', paddingLeft: '38px', paddingRight: '32px', backgroundColor: '#050608', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', fontFamily: 'var(--font-primary)' }}
                  className="w-full text-xs text-slate-200 outline-none transition-all appearance-none cursor-pointer focus:border-[#8b5cf6]/50"
                >
                  <option value="1500" style={{ backgroundColor: '#050608' }}>1500</option>
                  <option value="2000" style={{ backgroundColor: '#050608' }}>2000</option>
                  <option value="2500" style={{ backgroundColor: '#050608' }}>2500</option>
                  <option value="3000" style={{ backgroundColor: '#050608' }}>3000</option>
                </select>
                <span className="absolute right-4 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ height: '44px', backgroundColor: '#3b82f6', borderRadius: '12px', fontFamily: 'var(--font-display)' }}
              className="w-full text-white font-bold text-xs tracking-wide cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-[#2563eb] disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              {loading ? 'Generating...' : 'Generate Plan'}
            </button>
          </form>
        </div>

        {/* Card 2: Today's Meals Timeline */}
        <div
          className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-5 shadow-lg w-full"
          style={{ padding: '24px' }}
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <UtensilsCrossed size={18} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 m-0">Today's Meals</h3>
            </div>
            <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-emerald-400">
              {plan?.meals?.filter(m => m.completed).length || 3} / {plan?.meals?.length || 4} meals logged
            </span>
          </div>

          {/* Meals Timeline */}
          <div
            style={{
              position: 'relative',
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              paddingLeft: '32px',
              marginLeft: '24px',
              marginTop: '16px'
            }}
            className="space-y-6 py-2"
          >
            {plan?.meals?.map((meal, idx) => {
              const mealIcons = {
                Breakfast: <Sun size={15} className="text-orange-400" />,
                Lunch: <Leaf size={15} className="text-emerald-400" />,
                Snack: <Apple size={15} className="text-blue-400" />,
                Dinner: <Moon size={15} className="text-purple-400" />
              };
              const mealColors = {
                Breakfast: 'rgba(249, 115, 22, 0.1)',
                Lunch: 'rgba(34, 197, 94, 0.1)',
                Snack: 'rgba(59, 130, 246, 0.1)',
                Dinner: 'rgba(139, 92, 246, 0.1)'
              };

              const icon = mealIcons[meal.type] || <UtensilsCrossed size={15} className="text-indigo-400" />;
              const bg = mealColors[meal.type] || 'rgba(99, 102, 241, 0.1)';

              return (
                <div key={idx} className="relative w-full flex items-center justify-between group">
                  {/* Timeline Dot Indicator */}
                  <button 
                    type="button"
                    onClick={() => handleToggleMeal(meal.type)}
                    className="absolute w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 border-2 outline-none"
                    style={{
                      position: 'absolute',
                      left: '-42px',
                      top: '10px',
                      borderColor: meal.completed ? '#10b981' : '#334155',
                      backgroundColor: meal.completed ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
                    }}
                  >
                    {meal.completed && <Check size={12} className="text-emerald-400 stroke-[3.5px]" />}
                  </button>

                  <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                    {/* Circle Icon Container */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: bg }} className="flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                    {/* Meal details text */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-100">{meal.type}</span>
                        <button
                          type="button"
                          onClick={() => handleRegenerateSingleMeal(meal.type, meal.name)}
                          disabled={loadingMeal === meal.type}
                          className="w-5 h-5 rounded hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent"
                        >
                          <RefreshCw size={10} className={loadingMeal === meal.type ? 'animate-spin text-indigo-400' : ''} />
                        </button>
                      </div>
                      <span style={{ fontFamily: 'var(--font-primary)' }} className="text-xs font-semibold text-slate-300 mt-0.5 truncate max-w-sm sm:max-w-md">
                        {loadingMeal === meal.type ? <span className="text-indigo-400 animate-pulse">Swapping meal...</span> : meal.name}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-medium tracking-normal">
                        P: {meal.macros.protein}g · C: {meal.macros.carbs}g · F: {meal.macros.fat}g
                      </span>
                    </div>
                  </div>

                  {/* Meal metrics */}
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-black text-slate-200">{meal.calories} kcal</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-medium">{meal.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Custom Meal */}
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setShowCustomMeal(v => !v)}
              style={{ height: '38px', padding: '0 16px', borderRadius: '10px', backgroundColor: '#0c0e16', border: `1px solid ${showCustomMeal ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '12px', fontFamily: 'var(--font-display)', color: '#8b5cf6', cursor: 'pointer', transition: 'all 0.2s ease', outline: 'none' }}
              className="hover:text-[#7c3aed] active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14"/></svg>
              {showCustomMeal ? 'Cancel' : 'Add Custom Meal'}
            </button>
            {showCustomMeal && (
              <div style={{ marginTop: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <input value={customMeal.name} onChange={e => setCustomMeal(p => ({ ...p, name: e.target.value }))} placeholder="Meal name (e.g. Grilled Chicken)" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <select value={customMeal.mealType} onChange={e => setCustomMeal(p => ({ ...p, mealType: e.target.value }))} style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none' }}>
                    {['Breakfast','Lunch','Snack','Dinner'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" value={customMeal.calories} onChange={e => setCustomMeal(p => ({ ...p, calories: e.target.value }))} placeholder="Calories (kcal)" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
                  <input type="number" value={customMeal.protein} onChange={e => setCustomMeal(p => ({ ...p, protein: e.target.value }))} placeholder="Protein (g)" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
                  <input type="number" value={customMeal.carbs} onChange={e => setCustomMeal(p => ({ ...p, carbs: e.target.value }))} placeholder="Carbs (g)" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
                  <input type="number" value={customMeal.fat} onChange={e => setCustomMeal(p => ({ ...p, fat: e.target.value }))} placeholder="Fat (g)" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
                </div>
                <button onClick={handleAddCustomMeal} style={{ padding: '8px 16px', borderRadius: 8, background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                  Add to Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Nutrition Stats Overhaul */}
      <div className="flex flex-col gap-4 h-full justify-between">
        
        {/* Card 1: Nutrition Score */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#a78bfa', flexShrink: 0
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="flex flex-col">
            <label style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] font-semibold text-slate-400 leading-none">
              Nutrition Score
            </label>
            <div className="flex items-baseline gap-1 mt-1">
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-extrabold text-white">{score}</span>
              <span className="text-[10px] text-slate-500 font-medium">/100</span>
            </div>
            <span className={`text-[10px] font-bold mt-1 ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : score > 0 ? 'text-red-400' : 'text-slate-500'}`}>
              {score >= 80 ? 'Good Nutrition' : score >= 50 ? 'Needs Improvement' : score > 0 ? 'Poor Nutrition' : 'No data logged yet'}
            </span>
          </div>
        </div>

        {/* Card 2: Calories Progress */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div className="flex items-center gap-4 w-full">
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fb923c', flexShrink: 0
            }}>
              <Flame size={16} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <label style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] font-semibold text-slate-400 leading-none">
                Calories
              </label>
              <div className="flex items-baseline gap-1 mt-1">
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-extrabold text-white">{currentCalories.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-medium">/{targetCalories.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">{calPercent}% of target</span>
            </div>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div style={{ width: `${calPercent}%`, backgroundColor: '#fb923c' }} className="h-full rounded-full transition-all duration-300" />
          </div>
        </div>

        {/* Card 3: Protein Progress */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div className="flex items-center gap-4 w-full">
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#4ade80', flexShrink: 0
            }}>
              <Leaf size={16} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <label style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] font-semibold text-slate-400 leading-none">
                Protein
              </label>
              <div className="flex items-baseline gap-1 mt-1">
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-extrabold text-white">{currentProtein} g</span>
                <span className="text-[10px] text-slate-500 font-medium">/{proteinTarget}g</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">{proteinPercent}% of target</span>
            </div>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div style={{ width: `${proteinPercent}%`, backgroundColor: '#4ade80' }} className="h-full rounded-full transition-all duration-300" />
          </div>
        </div>

        {/* Card 4: Water Progress */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          <div className="flex items-center gap-4 w-full">
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#38bdf8', flexShrink: 0
            }}>
              <Droplets size={16} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <label style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] font-semibold text-slate-400 leading-none">
                Water
              </label>
              <div className="flex items-baseline gap-1 mt-1">
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-lg font-extrabold text-white">{currentWater}</span>
                <span className="text-[10px] text-slate-500 font-medium">/{waterTarget} glasses</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">{waterPercent}% of target</span>
            </div>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
            <div style={{ width: `${waterPercent}%`, backgroundColor: '#38bdf8' }} className="h-full rounded-full transition-all duration-300" />
          </div>
        </div>

        {/* Card 5: Macro Breakdown */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16
        }}>
          <div className="flex justify-between items-start w-full">
            <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100">Macro Breakdown</span>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Total Plan Calories</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px' }} className="font-extrabold text-white mt-1.5 leading-none">
                {macroTotalCal} <span className="text-xs font-semibold text-slate-400">kcal</span>
              </p>
            </div>
          </div>

          {/* Three Badge boxes */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {/* Protein box */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-extrabold text-[#10b981]">{macroProtein != null ? `${macroProtein}g` : '–'}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Protein</span>
            </div>

            {/* Carbs box */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-extrabold text-[#f97316]">{macroCarbs != null ? `${macroCarbs}g` : '–'}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Carbs</span>
            </div>

            {/* Fats box */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-extrabold text-[#ef4444]">{macroFat != null ? `${macroFat}g` : '–'}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Fats</span>
            </div>
          </div>

          {/* Progress rows */}
          <div className="flex flex-col gap-4">
            {/* Protein */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 leading-none">
                <span>Protein</span>
                <span className="text-slate-400 font-medium">{macroProtein != null ? `${macroProtein}g / 120g` : '– / 120g'}</span>
              </div>
              <div style={{ height: '6px' }} className="w-full bg-white/5 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, Math.round((macroProtein / 120) * 100))}%`, backgroundColor: '#10b981' }} className="h-full rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* Carbohydrates */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 leading-none">
                <span>Carbohydrates</span>
                <span className="text-slate-400 font-medium">{macroCarbs}g / 300g</span>
              </div>
              <div style={{ height: '6px' }} className="w-full bg-white/5 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, Math.round((macroCarbs / 300) * 100))}%`, backgroundColor: '#f97316' }} className="h-full rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* Fats */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 leading-none">
                <span>Fats</span>
                <span className="text-slate-400 font-medium">{macroFat}g / 70g</span>
              </div>
              <div style={{ height: '6px' }} className="w-full bg-white/5 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, Math.round((macroFat / 70) * 100))}%`, backgroundColor: '#ef4444' }} className="h-full rounded-full transition-all duration-500" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Monospace Status Footer ── */}
      <div className="col-span-1 lg:col-span-2 flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[9px] text-slate-500 font-mono tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>
          Tip: Log your meals regularly to get more accurate insights and personalized recommendations.
        </div>
        <div className="flex items-center gap-2">
          Advice last updated: Today, 9:41 AM
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

    </div>
  );
}

function HealthRecommendations({ recommendations, h, score }) {
  const [checkedActions, setCheckedActions] = useState({});
  const [accepted, setAccepted]             = useState({});
  const [history, setHistory]               = useState(() => {
    try { return JSON.parse(localStorage.getItem('health_rec_history') || '[]'); } catch { return []; }
  });

  const sorted = [...recommendations].sort((a, b) => {
    const order = { 'health-sleep': 1, 'health-mood': 2, 'health-stress': 2.5, 'health-workout': 3 };
    const aOrder = order[a.id] || 99;
    const bOrder = order[b.id] || 99;
    return aOrder - bOrder;
  });
  const top3   = sorted.slice(0, 3);
  const best   = top3[0];

  const getRecTheme = (id) => {
    if (id.includes('sleep')) {
      return {
        borderColor: 'border border-white/5 border-l-[3px] border-l-[#818cf8]',
        tagClass: 'text-[#818cf8] bg-[#818cf8]/10 border border-[#818cf8]/20 font-semibold',
        iconBg: 'bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20',
        icon: <Moon size={16} className="text-[#818cf8]" />
      };
    }
    if (id.includes('mood') || id.includes('stress')) {
      return {
        borderColor: 'border border-white/5 border-l-[3px] border-l-[#10b981]',
        tagClass: 'text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 font-semibold',
        iconBg: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20',
        icon: <Smile size={16} className="text-[#10b981]" />
      };
    }
    return {
      borderColor: 'border border-white/5 border-l-[3px] border-l-[#f43f5e]',
      tagClass: 'text-[#f43f5e] bg-[#f43f5e]/10 border border-[#f43f5e]/20 font-semibold',
      iconBg: 'bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#f43f5e]">
          <path d="M18 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM14 9l-2-2.5-3 1.5-2.5-1.5M12 11.5V15l-3 4M14 13l2.5 4.5M6 14.5L10 12l2-3.5" />
        </svg>
      )
    };
  };

  const getOpportunityIcon = (id) => {
    if (id.includes('sleep')) return <Moon size={20} className="text-purple-400" />;
    if (id.includes('mood') || id.includes('stress')) return <Smile size={20} className="text-emerald-400" />;
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
        <path d="M18 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM14 9l-2-2.5-3 1.5-2.5-1.5M12 11.5V15l-3 4M14 13l2.5 4.5M6 14.5L10 12l2-3.5" />
      </svg>
    );
  };

  const categories = [
    { label: 'Mental Energy', icon: '🧠', score: Math.max(0, Math.min(100, Math.round(100 - (h?.stressLevel || 5) * 7 + (h?.moodAvg || 5) * 5))), color: '#22c55e' },
    { label: 'Fitness',       icon: '🏃', score: Math.max(0, Math.min(100, Math.round((h?.workoutsPerWeek || 0) * 16))),                           color: '#fb923c' },
    { label: 'Nutrition',     icon: '🥦', score: Math.max(0, Math.min(100, Math.round((h?.calories || 0) > 0 ? Math.max(30, 100 - Math.abs((h?.calories || 2000) - 2000) / 20) : 48))), color: '#facc15' },
    { label: 'Recovery',      icon: '❤️', score: Math.max(0, Math.min(100, Math.round((h?.sleepAvg || 7) * 10 + (h?.waterIntake || 4) * 2))),     color: '#10b981' },
    { label: 'Sleep',         icon: '🌙', score: Math.max(0, Math.min(100, Math.round((h?.sleepAvg || 7) / 9 * 100))),                            color: '#a78bfa' },
  ];

  const actionItems = [
    h?.waterIntake < 8  && { id:'water',   text: `Drink ${8 - (h?.waterIntake||0)} more glasses of water`, impact: 'High Impact'   },
    h?.workoutsPerWeek < 3 && { id:'walk',  text: '15 min walk',                                           impact: 'Medium Impact' },
    h?.sleepAvg < 7.5   && { id:'sleep',   text: 'Sleep before 11 PM',                                     impact: 'High Impact'   },
    h?.calories < 1800  && { id:'protein', text: 'Have a protein-rich dinner',                              impact: 'Medium Impact' },
    !h?.sleepAvg        && { id:'log',     text: 'Log today\'s health data',                                impact: 'High Impact'   },
  ].filter(Boolean).slice(0, 4);

  const handleAccept = (rec) => {
    setAccepted(a => ({ ...a, [rec.id]: true }));
    const entry = { title: rec.title, scoreDelta: `+${Math.round(rec.confidence / 12)}`, acceptedAt: new Date().toISOString() };
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem('health_rec_history', JSON.stringify(next));
  };

  const daysAgo = (iso) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`;
  };

  return (
    <div style={{ fontFamily: 'var(--font-primary)' }} className="flex flex-col gap-6 w-full px-1">

      {/* ── PRIORITY RECOMMENDATIONS ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-200 m-0">Priority Recommendations</h2>
          <span title="Sorted by impact on your health score" className="text-xs text-slate-500 cursor-help">ⓘ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {top3.map((rec) => {
            const theme = getRecTheme(rec.id);
            const scoreDelta = Math.round(rec.confidence / 12);
            
            const cardText = rec.text;

            return (
              <div
                key={rec.id}
                className={`rounded-2xl ${theme.borderColor} bg-[#0b0c10] flex flex-col justify-between shadow-lg h-full`}
                style={{ padding: '24px', minHeight: '260px' }}
              >
                <div className="flex flex-col gap-4 flex-1">
                  {/* Tag */}
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${theme.tagClass}`}>
                      High Priority
                    </span>
                  </div>

                  {/* Icon & Description Area */}
                  <div className="flex gap-3.5 items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${theme.iconBg}`}>
                      {theme.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 m-0">
                        {rec.title}
                      </h4>
                      <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }} className="text-[11px] text-slate-400 m-0 mt-2 font-medium leading-relaxed">
                        {cardText}
                      </p>
                    </div>
                  </div>

                  {/* Health Score Increase */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 mt-2 px-1">
                    <span>+{scoreDelta} Health Score</span>
                  </div>
                </div>

                {/* Visible Premium Button sitting inside card padding */}
                 <button
                  onClick={() => handleAccept(rec)}
                  disabled={accepted[rec.id]}
                  style={{
                    height: '48px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backgroundColor: '#161925',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'inherit',
                    fontWeight: '700',
                    fontSize: '12px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    marginTop: '20px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    outline: 'none'
                  }}
                  className="hover:bg-[#1f2335] active:bg-[#252a3f] transition-all disabled:opacity-50"
                >
                  <span>{accepted[rec.id] ? '✓ Accepted' : 'Fix Now'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">

        {/* Today's Biggest Opportunity */}
        {best && (
          <div
            className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col justify-between shadow-lg"
            style={{ padding: '24px', minHeight: '260px' }}
          >
            {/* Top Content Area */}
            <div className="flex flex-col gap-4 flex-1">
              <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-300 m-0">
                Today's Biggest Opportunity
              </p>
              <div className="flex gap-4 items-start mt-1">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  {getOpportunityIcon(best.id)}
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 m-0">
                    {best.title}
                  </h4>
                  <p style={{ lineHeight: '1.6' }} className="text-xs text-slate-400 m-0 mt-2 leading-relaxed font-medium">
                    {best.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Bar Area (Integrated in padded layout) */}
            <div className="flex items-center justify-between mt-6 w-full pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Potential Gain</span>
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-extrabold text-emerald-400 mt-1">+{Math.round(best.confidence / 12)} Health Score</span>
              </div>
              <button
                onClick={() => handleAccept(best)}
                disabled={accepted[best.id]}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  backgroundColor: '#5f5af6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '700',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(95, 90, 246, 0.3)',
                  outline: 'none'
                }}
                className="hover:bg-[#4f4ad6] active:bg-[#3f3ab6] transition-all disabled:opacity-50"
              >
                <span>{accepted[best.id] ? '✓ Accepted' : 'Accept Recommendation'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Recommendation Categories */}
        <div
          className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-4 shadow-lg"
          style={{ padding: '24px', minHeight: '260px' }}
        >
          <div className="flex items-center gap-2">
            <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-300 m-0">
              Recommendation Categories
            </p>
            <span title="Health sub-scores" className="text-xs text-slate-500 cursor-help">ⓘ</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {categories.map(cat => {
              const barColors = {
                'Mental Energy': '#4ade80',
                'Fitness': '#fb923c',
                'Nutrition': '#f59e0b',
                'Recovery': '#10b981',
                'Sleep': '#a78bfa'
              };
              const barColor = barColors[cat.label] || '#8b5cf6';
              return (
                <div key={cat.label} className="flex items-center gap-3.5">
                  <span className="text-sm w-5 text-center shrink-0">{cat.icon}</span>
                  <span style={{ fontFamily: 'var(--font-primary)' }} className="text-xs font-semibold text-slate-300 w-24 shrink-0">
                    {cat.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', backgroundColor: barColor }}
                      className="rounded-full"
                    />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#161925',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'baseline',
                      gap: '2px',
                      justifyContent: 'center',
                      minWidth: '64px'
                    }}
                    className="shrink-0"
                  >
                    <span style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-extrabold text-white">
                      {cat.score}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ACTION PLAN + HISTORY ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">

        {/* Today's Action Plan */}
        <div
          className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col gap-4 shadow-lg"
          style={{ padding: '24px', minHeight: '260px' }}
        >
          <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-300 m-0">
            Today's Action Plan
          </p>
          <div className="flex flex-col gap-3">
            {actionItems.length === 0 && (
              <p className="text-xs text-slate-500 font-medium">Log health data to generate your action plan.</p>
            )}
            {actionItems.map(item => {
              const isChecked = checkedActions[item.id];
              const tagStyle = item.impact === 'High Impact'
                ? 'text-rose-400 bg-rose-500/10 border border-rose-500/15 py-1 px-3 rounded-lg font-bold text-[10px]'
                : 'text-orange-400 bg-orange-500/10 border border-orange-500/15 py-1 px-3 rounded-lg font-bold text-[10px]';

              return (
                <div
                  key={item.id}
                  onClick={() => setCheckedActions(p => ({ ...p, [item.id]: !p[item.id] }))}
                  className="flex items-center justify-between gap-3 cursor-pointer group py-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all active:scale-95 ${
                        isChecked 
                          ? 'border-[#10b981] bg-[#10b981]/15 text-[#10b981]' 
                          : 'border-slate-700 bg-transparent group-hover:border-slate-500'
                      }`}
                    >
                      {isChecked && <Check size={12} className="stroke-[3.5px] text-[#10b981]" />}
                    </div>
                    <span
                      style={{ fontFamily: 'var(--font-primary)' }}
                      className="text-xs font-semibold truncate text-slate-200"
                    >
                      {item.text}
                    </span>
                  </div>
                  <span className={`shrink-0 ${tagStyle}`}>
                    {item.impact}
                  </span>
                </div>
              );
            })}
          </div>
          {actionItems.length > 0 && (
            <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-2">
              <svg className="text-slate-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M9 17h6M9 12h6M9 7h6"></path></svg>
              <span className="text-xs text-slate-500 font-semibold leading-none">
                {actionItems.filter(i => !checkedActions[i.id]).length} recommendations remaining
              </span>
            </div>
          )}
        </div>

        {/* Recent Recommendations (History) */}
        <div
          className="rounded-2xl border border-white/5 bg-[#0b0c10] flex flex-col justify-between shadow-lg h-full"
          style={{ padding: '24px', minHeight: '260px' }}
        >
          <div className="border-b border-white/5 pb-3.5">
            <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-slate-300 m-0">
              Recent Recommendations (History)
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
            {history.length === 0 ? (
              <div className="flex flex-col gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                  <RefreshCw size={18} />
                </div>
                <p style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-[200px]">
                  Accept recommendations above to see your history here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col w-full gap-3 text-left">
                {history.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-3.5 border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-emerald-400 stroke-[3px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: 'var(--font-primary)' }} className="text-xs font-semibold text-slate-200 truncate">
                        {h.title}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        Accepted {daysAgo(h.acceptedAt)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">
                      {h.scoreDelta} Score
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Monospace Status Footer ── */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[9px] text-slate-500 font-mono tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ENGINE CONNECTED | LAST SYNC: 4M AGO
        </div>
        <div>
          SESSION ID: #HX-1071
        </div>
      </div>



    </div>
  );
}


// ── Lab Report Uploader ───────────────────────────────────────────────────────
function LabReportUploader({ health, updateDomain }) {
  const [parsing,  setParsing]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [applied,  setApplied]  = useState(false);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setParsing(true); setResult(null); setError(null); setApplied(false);
    try {
      const data = await parseMedicalReport(file);
      setResult(data);
    } catch (e) {
      if (e.message === 'NO_KEY') {
        setResult(getDemoLabResult());
      } else {
        setError(e.message);
      }
    } finally { setParsing(false); }
  }

  function applyToHealth() {
    if (!result?.healthPatch) return;
    updateDomain('health', { ...health, ...result.healthPatch });
    setApplied(true);
    showToast(`${result.markers?.length || 0} lab markers saved to your health profile`, 'success');
  }

  const STATUS_COLOR = { normal: '#10b981', high: '#f97316', low: '#f59e0b', critical: '#ef4444' };

  return (
    <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧪</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Lab Report Upload</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Upload a blood test or lab report PDF/image — AI extracts all markers</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={parsing}
          style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: parsing ? 'not-allowed' : 'pointer', opacity: parsing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {parsing ? <><div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Parsing…</> : <><Upload size={13} /> Upload Report</>}
        </button>
      </div>

      {error && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 10px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>⚠️ {error}</p>}

      {result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{result.reportType}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{result.labName} · {result.reportDate}</p>
            </div>
            {result.flags?.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>
                {result.flags.length} flag{result.flags.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Markers table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {(result.markers || []).slice(0, 10).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${m.status !== 'normal' ? STATUS_COLOR[m.status] + '30' : 'rgba(255,255,255,0.05)'}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[m.status] || '#10b981', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{m.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[m.status] || '#10b981' }}>{m.value} {m.unit}</span>
                {m.status !== 'normal' && <span style={{ fontSize: 10, color: STATUS_COLOR[m.status], fontWeight: 600 }}>{m.status.toUpperCase()}</span>}
              </div>
            ))}
          </div>

          {result.summary && <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px', lineHeight: 1.5, padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, borderLeft: '2px solid rgba(99,102,241,0.4)' }}>{result.summary}</p>}

          <button onClick={applyToHealth} disabled={applied}
            style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: applied ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#10b981,#059669)', color: applied ? '#34d399' : '#fff', fontSize: 12, fontWeight: 700, cursor: applied ? 'default' : 'pointer' }}>
            {applied ? '✅ Applied to Health Profile' : `Save ${result.markers?.length || 0} Markers to Health Profile →`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Health() {
  const { user } = useAuth();
  const { health, finance, records, updateDomain, addRecords, setRecords, computed, gamification, updateGamification } = useData();
  const healthRecords = records?.health || [];
  const [tab, setTab] = useState('overview');
  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const score = Number(computed?.healthScore?.score) || 0;
  const burnout = computed?.burnout?.risk || 0;
  const [form, setForm] = useState({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '', weight: '', bmi: '' });
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [coachInput, setCoachInput] = useState('');
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [planChecked, setPlanChecked] = useState({});

  // Load health records from backend on mount (for real users)
  useEffect(() => {
    if (!healthApi.isEnabled()) return;
    healthApi.getAll()
      .then(records => { if (records.length > 0) setRecords('health', records); })
      .catch(err => console.warn('Health: backend load failed:', err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build chart data from real logs when available, else fall back to generated demo data
  const trendData = useMemo(() => {
    if (healthRecords.length >= 3) {
      const sorted = [...healthRecords]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30);
      return sorted.map(r => ({
        date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
        sleep: r.sleep ?? null,
        mood: r.mood ?? null,
        stress: r.stress ?? null,
        water: r.water ?? null,
      }));
    }
    // Use data-context values (not raw auth user) to avoid crash for non-demo users
    const safeState = { health: h, finance: { expenses: 0 }, career: { studyHoursDaily: 0 } };
    return generateTrendData(safeState, 30);
  }, [healthRecords, h]);

  // Consecutive-day logging streak
  const streak = useMemo(() => {
    if (healthRecords.length === 0) return 0;
    const uniqueDays = [...new Set(healthRecords.map(r => (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString()).split('T')[0]))].sort().reverse();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let count = 0;
    let cursor = new Date(today);
    for (const d of uniqueDays) {
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      const diff = Math.round((cursor - day) / 86400000);
      if (diff === 0 || diff === 1) { count++; cursor = day; } else break;
    }
    return count;
  }, [healthRecords]);

  // Recent log entries for history panel
  const sortedLogs = useMemo(() =>
    [...healthRecords].sort((a, b) => new Date(b.date) - new Date(a.date)),
  [healthRecords]);
  const recentLogs = useMemo(() =>
    showAllHistory ? sortedLogs : sortedLogs.slice(0, 7),
  [sortedLogs, showAllHistory]);

  const currentState = useMemo(() => ({
    health: h,
    finance: computed?.financeScore?.raw || { income: 0, expenses: 0, savings: 0, investments: 0, subscriptions: 0, debt: 0 },
    career: computed?.careerScore?.raw || { skills: [], dsaPractice: 0, projectsCompleted: 0, studyHoursDaily: 0, codingHoursDaily: 0, gpa: 0, coursesActive: 0 }
  }), [h, computed]);

  const healthInsights = useMemo(() => {
    const all = generateInsights(currentState);
    return all.filter(ins => ins.domains.includes('health')).slice(0, 2);
  }, [currentState]);

  const isFemale = user?.gender === 'female';
  const cycleData = h.menstrualCycle || {};
  const cycleDay = getCycleDay(cycleData.lastPeriodDate, cycleData.cycleLength);
  const phaseKey = getPhaseKey(cycleDay);
  const phase = phaseKey ? PHASES[phaseKey] : null;
  const daysUntil = getDaysUntilNextPeriod(cycleData.lastPeriodDate, cycleData.cycleLength);
  const nearPeriod = isNearPeriod(cycleData.lastPeriodDate, cycleData.cycleLength, cycleData.remindDaysBefore ?? 3);

  // Browser notification for upcoming period
  useEffect(() => {
    if (!isFemale || !nearPeriod || !cycleData.lastPeriodDate) return;
    const notifKey = `period_notif_${new Date().toDateString()}`;
    if (localStorage.getItem(notifKey)) return;
    if (!('Notification' in window)) return;
    const fire = () => {
      const label = daysUntil === 1 ? 'Period expected tomorrow' : `Period in ${daysUntil} days`;
      new Notification('BeyondSelf — Period Reminder', {
        body: `${label}. Stock up on iron-rich foods, magnesium, and stay hydrated.`,
        icon: '/icon-192.png',
        tag: 'period-reminder',
      });
      localStorage.setItem(notifKey, '1');
    };
    if (Notification.permission === 'granted') {
      fire();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') fire(); });
    }
  }, [isFemale, nearPeriod, daysUntil, cycleData.lastPeriodDate]);

  const tabs = [
    { id: 'overview',        label: 'Overview' },
    { id: 'log',             label: 'Log Data' },
    { id: 'cycle',           label: '♀ Cycle' },
    { id: 'wellness',        label: 'Wellness' },
    { id: 'nutrition',       label: 'Nutrition' },
    { id: 'scan',            label: 'Scan AI' },
    { id: 'recommendations', label: 'AI Recommendations' },
  ];

  const handleLog = async (e) => {
    e.preventDefault();
    const updated = { ...h };
    const record = { date: new Date().toISOString() };
    let changes = 0;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    if (form.sleep)    { const v = clamp(Number(form.sleep),          3,  12); updated.sleepAvg        = v; record.sleep           = v; changes++; }
    if (form.stress)   { const v = clamp(parseInt(form.stress, 10),   1,  10); updated.stressLevel     = v; record.stress          = v; changes++; }
    if (form.mood)     { const v = clamp(Number(form.mood),           1,  10); updated.moodAvg         = v; record.mood            = v; changes++; }
    if (form.workout)  { const v = clamp(parseInt(form.workout, 10),  0,   7); updated.workoutsPerWeek = v; record.workoutsPerWeek = v; changes++; }
    if (form.water)    { const v = clamp(parseInt(form.water, 10),    0,  20); updated.waterIntake     = v; record.water           = v; changes++; }
    if (form.calories) { const v = clamp(parseInt(form.calories, 10), 0,5000); updated.calories        = v; record.calories        = v; changes++; }
    if (form.weight)   { const v = clamp(Number(form.weight),        20, 300); updated.weight          = v; record.weight          = v; changes++; }
    if (form.bmi)      { const v = clamp(Number(form.bmi),           10,  60); updated.bmi             = v; record.bmi             = v; changes++; }
    if (changes === 0) { showToast('Please fill at least one field', 'error'); return; }

    // 1. Update local state immediately (optimistic)
    addRecords('health', [record]);
    setForm({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '', weight: '', bmi: '' });
    showToast(`Health data saved (${changes} field${changes > 1 ? 's' : ''})`, 'success');

    // 2. Award XP locally always, then sync with backend if available
    const localXpGain = changes * 10;
    updateGamification({ xp: (gamification?.xp || 0) + localXpGain });
    showToast(`+${localXpGain} XP earned! ⚡`, 'success');

    if (healthApi.isEnabled()) {
      try {
        const { award } = await healthApi.create(record);
        if (award) {
          // Use backend's authoritative total, but never go below what we've earned locally
          updateGamification({
            xp: Math.max((gamification?.xp || 0) + localXpGain, award.totalXp),
            level: award.level,
            streak: award.streak,
            badges: award.newBadges && award.newBadges.length > 0
              ? [...(gamification?.badges || []), ...award.newBadges]
              : (gamification?.badges || [])
          });
          if (award.newBadges && award.newBadges.length > 0) {
            award.newBadges.forEach(badge => {
              showToast(`🏆 New Badge: ${badge.badgeName || badge.badgeId}!`, 'success');
            });
          }
        }
      } catch (err) {
        if (err.message !== 'NOT_AUTHENTICATED' && err.message !== 'UNAUTHORIZED') {
          console.warn('Health: backend save failed:', err.message);
        }
      }
    }
  };

  const handleCoachSend = async () => {
    const msg = coachInput.trim();
    if (!msg || coachLoading) return;
    const userMsg = { role: 'user', content: msg };
    setCoachMessages(prev => [...prev, userMsg]);
    setCoachInput('');
    setCoachLoading(true);
    try {
      const ctx = { domain: 'health', health: h, healthScore: score, userName: user?.name || 'User' };
      const history = coachMessages.map(m => ({ role: m.role, content: m.content }));
      const { response } = await chatWithAI(msg, ctx, history);
      setCoachMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setCoachMessages(prev => [...prev, { role: 'assistant', content: 'Unable to connect right now. Please check your API key in Settings.' }]);
    } finally {
      setCoachLoading(false);
    }
  };

  const handleApplyCalories = (nutrition) => {
    const calories = typeof nutrition === 'number' ? nutrition : (nutrition?.calories ?? 0);
    if (calories > 0) {
      const record = { date: new Date().toISOString(), calories };
      if (nutrition?.protein != null) record.protein = nutrition.protein;
      if (nutrition?.carbs   != null) record.carbs   = nutrition.carbs;
      if (nutrition?.fat     != null) record.fat     = nutrition.fat;
      addRecords('health', [record]);
    }
    setForm(prev => ({ ...prev, calories: calories.toString() }));
    setTab('log');
  };

  const recommendations = useMemo(() => {
    const crossDomain = computed?.crossDomain || [];
    const finStress = crossDomain.find(c => c.id === 'financial-stress');
    const stressSpend = crossDomain.find(c => c.id === 'stress-spending');
    const sleepProductivity = crossDomain.find(c => c.id === 'sleep-productivity');
    const dataPoints = healthRecords.length;
    const confidence = (base) => Math.min(99, Math.round(base + Math.min(10, dataPoints * 0.8)));

    const recs = [];

    // Sleep
    const sleepDeficit = 8 - h.sleepAvg;
    const sleepRisk = h.sleepAvg < 5.5 ? 'critical' : h.sleepAvg < 6.5 ? 'high' : h.sleepAvg < 7 ? 'medium' : 'low';
    if (h.sleepAvg < 7) {
      const prodImpact = sleepProductivity ? ` This causes ~${sleepProductivity.computedImpact.productivityLoss}% career productivity loss.` : '';
      recs.push({
        id: 'health-sleep', icon: '😴', title: 'Sleep Optimization', priority: sleepRisk === 'critical' ? 1 : sleepRisk === 'high' ? 2 : 4,
        text: `You're averaging ${h.sleepAvg}h — ${sleepDeficit.toFixed(1)}h below the 7-8h target. ${sleepRisk === 'critical' ? 'Severe sleep debt detected.' : 'Consistent shortfall accumulates over time.'} Actions: shift bedtime to ${Math.max(21, 23 - Math.ceil(sleepDeficit))}:00, cut caffeine after 14:00, avoid screens 1h before bed.${prodImpact}`,
        confidence: confidence(88), risk: sleepRisk,
      });
    } else {
      recs.push({ id: 'health-sleep', icon: '😴', title: 'Sleep Quality', priority: 6, text: `Solid ${h.sleepAvg}h average — maintain this. To push quality further: consistent wake time within ±30 min daily, 18-20°C room temperature, magnesium glycinate before bed.`, confidence: confidence(85), risk: 'low' });
    }

    // Stress — boosted if cross-domain spending cascade active
    const stressRisk = h.stressLevel > 8 ? 'critical' : h.stressLevel > 6 ? 'high' : h.stressLevel > 4 ? 'medium' : 'low';
    const stressNote = stressSpend ? ` High cortisol is also driving ~₹${stressSpend.computedImpact.excessSpending.toLocaleString()} extra spending/month.` : '';
    const finStressNote = finStress ? ' Financial insecurity detected — address debt/savings to reduce anxiety at its root.' : '';
    recs.push({
      id: 'health-stress', icon: '🧘', title: 'Stress & Recovery', priority: stressRisk === 'critical' ? 1 : stressRisk === 'high' ? 2 : 5,
      text: h.stressLevel > 6
        ? `Stress at ${h.stressLevel}/10 — ${stressRisk === 'critical' ? 'critical level' : 'elevated'}. Daily protocol: 5-min box breathing (4-4-4-4), one 15-min outdoor walk, cap work at ${Math.min(10, 12 - Math.round(h.stressLevel / 2))}h/day.${stressNote}${finStressNote}`
        : `Stress at ${h.stressLevel}/10 — manageable. Protect this by scheduling one "buffer hour" daily with no meetings or screens.${finStressNote}`,
      confidence: confidence(82), risk: stressRisk,
    });

    // Workout
    const workoutGap = 4 - h.workoutsPerWeek;
    const workoutRisk = h.workoutsPerWeek === 0 ? 'high' : h.workoutsPerWeek < 2 ? 'medium' : 'low';
    recs.push({
      id: 'health-workout', icon: '🏃', title: 'Movement & Fitness', priority: workoutRisk === 'high' ? 3 : 5,
      text: h.workoutsPerWeek < 3
        ? `Only ${h.workoutsPerWeek} session${h.workoutsPerWeek !== 1 ? 's' : ''}/week — target is 4. Add ${workoutGap} session${workoutGap > 1 ? 's' : ''}: try ${workoutGap >= 2 ? '2× 25-min cardio + 1 strength' : '20-min HIIT'}. Even a 10-min walk counts. ${h.bmi > 25 ? `Current BMI ${h.bmi} — weight-bearing cardio recommended.` : ''}`
        : `${h.workoutsPerWeek} sessions/week is ${h.workoutsPerWeek >= 5 ? 'excellent' : 'good'}. For the next level: add one mobility/yoga session for injury prevention and recovery acceleration.`,
      confidence: confidence(84), risk: workoutRisk,
    });

    // Hydration
    const hydrationGap = 8 - h.waterIntake;
    recs.push({
      id: 'health-hydration', icon: '💧', title: 'Hydration', priority: h.waterIntake < 5 ? 3 : 6,
      text: h.waterIntake < 8
        ? `At ${h.waterIntake} glasses/day — ${hydrationGap} short of the 8-glass target. Dehydration by even 2% impairs cognitive performance. Fix: fill a 1L bottle in the morning, drink it by noon, refill. Set 3 phone alarms.`
        : `Hydration is optimal at ${h.waterIntake} glasses. Keep morning-front-loading: 2 glasses before 9am activates metabolism.`,
      confidence: confidence(90), risk: h.waterIntake < 5 ? 'high' : h.waterIntake < 7 ? 'medium' : 'low',
    });

    // Nutrition — uses real calorie target if set
    const calTarget = health?.nutritionProfile?.targetCalories || 2000;
    const calDiff = h.calories - calTarget;
    const calRisk = Math.abs(calDiff) > calTarget * 0.3 ? 'high' : Math.abs(calDiff) > calTarget * 0.15 ? 'medium' : 'low';
    recs.push({
      id: 'health-nutrition', icon: '🥗', title: 'Nutrition & Calories', priority: calRisk === 'high' ? 3 : 6,
      text: calDiff > calTarget * 0.15
        ? `At ${h.calories} kcal — ${Math.abs(calDiff)} over your ${calTarget} kcal target. Swap 1 processed snack for fruit/nuts daily. Meal prep 2 lunches on Sunday to avoid impulse eating.`
        : calDiff < -(calTarget * 0.15)
        ? `At ${h.calories} kcal — ${Math.abs(calDiff)} below target. Under-fuelling ${h.workoutsPerWeek > 0 ? 'combined with workouts ' : ''}risks muscle loss and fatigue. Add a protein-rich snack mid-morning.`
        : `Calories near target (${h.calories} vs ${calTarget} kcal). Focus on quality: 30% protein, 40% carbs, 30% fats. Track for 3 days to see if macros are balanced.`,
      confidence: confidence(78), risk: calRisk,
    });

    // Mood — added only if mood is low
    if (h.moodAvg < 5) {
      recs.push({
        id: 'health-mood', icon: '😊', title: 'Mood & Mental Energy', priority: h.moodAvg < 3 ? 1 : 3,
        text: `Mood averaging ${h.moodAvg}/10${h.moodAvg < 3 ? ' — critically low' : ''}. Three high-impact actions: (1) 10-min gratitude journaling before sleep, (2) one social connection per day, (3) reduce doomscrolling by removing social apps from home screen.${finStressNote}`,
        confidence: confidence(80), risk: h.moodAvg < 3 ? 'critical' : 'high',
      });
    }

    const sortedRecs = recs.sort((a, b) => a.priority - b.priority);
    // Explicitly bubble sleep, mood, and workout to the top in that specific order to match columns of Image 2 mockup
    const priorityOrder = ['health-sleep', 'health-mood', 'health-workout'];
    sortedRecs.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a.id);
      const indexB = priorityOrder.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.priority - b.priority;
    });
    return sortedRecs;
  }, [h, healthRecords, computed, finance, health]);

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

  // Daily wellness score — nutrition uses user's target if set, else sensible defaults
  const nutritionScore = (() => {
    if (!h.calories) return 0;
    const target = health?.nutritionProfile?.targetCalories || 2000;
    const dev = Math.abs(h.calories - target) / target;
    if (dev <= 0.05) return 92;
    if (dev <= 0.15) return 78;
    if (dev <= 0.30) return 58;
    return 30;
  })();

  const wellnessFactors = [
    { label: 'Sleep Quality',    score: Math.round(Math.min(100, (h.sleepAvg / 8) * 100)),                    icon: '😴', color: '#8b5cf6', rawValue: h.sleepAvg > 0 ? `${h.sleepAvg}h` : null },
    { label: 'Stress Level',     score: Math.round(Math.max(0, (10 - h.stressLevel) / 10 * 100)),             icon: '😰', color: '#f43f5e', rawValue: h.stressLevel > 0 ? `${h.stressLevel}/10` : null },
    { label: 'Mood',             score: Math.round((h.moodAvg / 10) * 100),                                   icon: '😊', color: '#f59e0b', rawValue: h.moodAvg > 0 ? `${h.moodAvg}/10` : null },
    { label: 'Physical Activity',score: Math.round(Math.min(100, (h.workoutsPerWeek / 5) * 100)),             icon: '💪', color: '#10b981', rawValue: h.workoutsPerWeek > 0 ? `${h.workoutsPerWeek}x/wk` : null },
    { label: 'Hydration',        score: Math.round(Math.min(100, (h.waterIntake / 8) * 100)),                 icon: '💧', color: '#8b5cf6', rawValue: h.waterIntake > 0 ? `${h.waterIntake} gl` : null },
    { label: 'Nutrition',        score: nutritionScore,                                                        icon: '🥗', color: '#f97316', rawValue: h.calories > 0 ? `${h.calories} kcal` : null },
  ];

  return (
    <div className="page-container min-h-screen pb-2 bg-mesh">
      {/* ── Breadcrumbs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8e929b', marginBottom: 20 }}>
        <span>BeyondSelf</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#ffffff' }}>Health &amp; Wellness</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#22c55e', flexShrink: 0 }}>
          <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Health &amp; Wellness</h1>
      </div>
      <p style={{ fontSize: 13, color: '#8e929b', marginTop: 2, marginBottom: 24 }}>Track, understand, and optimize your physical and mental wellbeing.</p>

      {/* ── Period Reminder Banner ── */}
      {nearPeriod && cycleData.lastPeriodDate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 16, borderRadius: 12, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={15} style={{ color: '#f43f5e' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fda4af', margin: 0 }}>
              {daysUntil === 1 ? 'Period expected tomorrow' : `Period in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: 11, color: '#9f1239', margin: '2px 0 0' }}>
              Stock up on iron-rich foods, magnesium, and a heating pad. Head to the Cycle tab for tailored diet tips.
            </p>
          </div>
          <button onClick={() => setTab('cycle')}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(244,63,94,0.2)', color: '#fda4af', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            View →
          </button>
        </motion.div>
      )}

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, gap: 24, overflowX: 'auto', paddingBottom: 0 }}>
        {tabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '12px 4px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
                color: isActive ? '#ffffff' : '#8e929b', position: 'relative', transition: 'color 0.2s ease',
                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          );
        })}
      </div>


      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Row 1: Health Score (1fr) + Metrics 3×2 (2fr) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

            {/* Health Score Detail */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.98) 0%, rgba(11, 13, 26, 0.99) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 16,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                    <svg viewBox="0 0 120 120" width="120" height="120">
                      <defs>
                        <linearGradient id="healthScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'} />
                          <stop offset="100%" stopColor={score >= 70 ? '#34d399' : score >= 45 ? '#facc15' : '#f87171'} />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="48" fill="none"
                        stroke="url(#healthScoreGrad)"
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*48} ${2*Math.PI*48}`}
                        strokeDashoffset={2*Math.PI*48*(1-score/100)}
                        style={{
                          transform: 'rotate(-90deg)',
                          transformOrigin: '60px 60px',
                          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: score >= 70 ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' : score >= 45 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))'
                        }}/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{score}</span>
                      <span style={{ fontSize: 10, color: '#475569', marginTop: 2, fontWeight: 700, letterSpacing: '0.05em' }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--font-display)', marginBottom: 8, margin: '0 0 8px' }}>Health Score</p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      marginBottom: 10,
                      background: score >= 70 ? 'rgba(16, 185, 129, 0.12)' : score >= 45 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171',
                      border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444', display: 'inline-block' }} />
                      {score >= 70 ? 'Good' : score >= 45 ? 'Average' : 'Low'}
                    </span>
                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                      {score >= 45 ? 'Keep maintaining your healthy habits.' : 'Focus on sleep and reduce stress.'}
                    </p>
                  </div>
                </div>

                {/* Health contributors Breakdown panel to elegantly fill vertical space */}
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 18 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>Health Contributors</span>
                  
                  {/* Sleep Tracker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🌙</span> Sleep Quality
                      </span>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>{Math.min(100, Math.round((h.sleepAvg || 5.2) / 8 * 100))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.round((h.sleepAvg || 5.2) / 8 * 100))}%`, background: 'linear-gradient(90deg, #8b5cf6, #c084fc)', height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Workout Tracker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💪</span> Activity Index
                      </span>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>{Math.min(100, Math.round((h.workoutsPerWeek || 1) / 4 * 100))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.round((h.workoutsPerWeek || 1) / 4 * 100))}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>

                  {/* Stress Control */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🔥</span> Stress Control
                      </span>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>{Math.max(0, Math.min(100, Math.round((10 - (h.stressLevel || 8)) / 10 * 100)))}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, Math.round((10 - (h.stressLevel || 8)) / 10 * 100)))}%`, background: 'linear-gradient(90deg, #f43f5e, #fb7185)', height: '100%', borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTab('recommendations')}
                style={{
                  marginTop: 24,
                  padding: '10px 18px',
                  borderRadius: 12,
                  border: `1px solid ${score >= 70 ? 'rgba(16, 185, 129, 0.25)' : score >= 45 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  background: score >= 70 ? 'rgba(16, 185, 129, 0.06)' : score >= 45 ? 'rgba(245, 158, 11, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                  color: score >= 70 ? '#34d399' : score >= 45 ? '#fbbf24' : '#f87171',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-display)',
                  outline: 'none'
                }}
                className="hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              >
                View Insights
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
              </button>
            </div>

            {/* Metrics side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {[
                  { label: 'Avg Sleep', icon: '🌙', color: '#a78bfa', value: `${h.sleepAvg || 5.2}h`, sub: 'per night' },
                  { label: 'Stress',    icon: '🔥', color: '#f43f5e', value: `${h.stressLevel || 8}/10`, sub: (h.stressLevel||8) > 6 ? 'High' : 'Low' },
                  { label: 'Mood',      icon: '😊', color: '#f59e0b', value: `${h.moodAvg || 4}/10`, sub: (h.moodAvg||4) >= 7 ? 'Good' : 'Average' },
                  { label: 'Workouts',  icon: '💪', color: '#22c55e', value: h.workoutsPerWeek || 1, sub: 'per week' },
                  { label: 'Water',     icon: '💧', color: '#3b82f6', value: h.waterIntake || 4, sub: 'glasses/day' },
                  { label: 'Calories',  icon: '🥗', color: '#f97316', value: h.calories ? h.calories.toLocaleString() : '2,800', sub: 'kcal/day' },
                ].map(m => (
                  <div key={m.label} style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: m.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{m.icon}</div>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{m.label}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>{m.value}</p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{m.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Wellness bar */}
              <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>⚡</div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 90, flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px' }}>Wellness Score</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#f43f5e', margin: 0 }}>{score}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>out of 100</p>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: 16 }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, margin: '0 0 10px' }}>Aim for 70+ to maintain strong health.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, score)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 3, background: score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#f43f5e' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: Today's Plan + 7-Day Trends ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

            {/* Today's Plan — data-driven from health profile + interactive checkboxes */}
            {(() => {
              const todayPlan = [
                {
                  id: 'water',
                  text: h.waterIntake >= 8
                    ? `Hydrated ✓  (${h.waterIntake} glasses)`
                    : `Drink ${Math.max(1, 8 - (h.waterIntake||0))} more glasses (${h.waterIntake||0}/8)`,
                  time: '7:30 AM',
                  autoDone: h.waterIntake >= 8,
                  icon: '💧',
                },
                {
                  id: 'workout',
                  text: h.workoutsPerWeek >= 3
                    ? `Active ✓  (${h.workoutsPerWeek} sessions/week)`
                    : `Log a workout (${h.workoutsPerWeek||0}/3 this week)`,
                  time: '8:00 AM',
                  autoDone: h.workoutsPerWeek >= 3,
                  icon: '💪',
                },
                {
                  id: 'calories',
                  text: h.calories > 0
                    ? `Nutrition tracked (${h.calories.toLocaleString()} kcal)`
                    : 'Log today\'s meals',
                  time: '1:00 PM',
                  autoDone: h.calories > 0,
                  icon: '🥗',
                },
                {
                  id: 'sleep',
                  text: h.sleepAvg >= 7
                    ? `Sleep goal met ✓  (${h.sleepAvg}h avg)`
                    : `Sleep target 7h (avg ${h.sleepAvg||0}h)`,
                  time: '10:00 PM',
                  autoDone: h.sleepAvg >= 7,
                  icon: '🌙',
                },
              ];
              const doneCount = todayPlan.filter(t => t.autoDone || !!planChecked[t.id]).length;
              return (
                <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} color="#a1a1aa" />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f3' }}>Today's Plan</span>
                    </div>
                    <span style={{ fontSize: 12, color: doneCount === todayPlan.length ? '#22c55e' : '#71717a' }}>{doneCount} / {todayPlan.length} done</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {todayPlan.map(task => {
                      const done = task.autoDone || !!planChecked[task.id];
                      return (
                        <div key={task.id}
                          onClick={() => !task.autoDone && setPlanChecked(p => ({ ...p, [task.id]: !p[task.id] }))}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: task.autoDone ? 'default' : 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {done
                              ? <CheckCircle size={14} color="#22c55e" />
                              : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #52525b', transition: 'border-color 0.2s' }} />}
                            <span style={{ fontSize: 13, color: done ? '#f0f0f3' : '#a1a1aa', textDecoration: done ? 'none' : 'none' }}>
                              {task.icon} {task.text}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#71717a', flexShrink: 0 }}>{task.time}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                    <button onClick={() => setTab('log')} style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                      + Log today's health →
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 7-Day Health Trends */}
            <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f3' }}>7-Day Health Trends</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', fontSize: 11, color: '#a1a1aa', cursor: 'pointer' }}>
                  7 Days ▾
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {[{ col: '#22c55e', label: 'Health Score' }, { col: '#a78bfa', label: 'Sleep (hrs)' }, { col: '#3b82f6', label: 'Water' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a1a1aa' }}>
                    <span style={{ width: 10, height: 3, background: l.col, borderRadius: 2, display: 'inline-block' }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minHeight: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData.slice(-7)} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={v => {
                      const days = ['Thu','Fri','Sat','Sun','Mon','Tue','Today'];
                      const d = trendData.slice(-7);
                      const idx = d.findIndex(x => x.date === v);
                      return idx >= 0 ? days[idx] : '';
                    }} axisLine={false} tickLine={false} dy={4} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} domain={([dataMin, dataMax]) => [Math.max(0, Math.floor(dataMin * 0.85)), Math.ceil(dataMax * 1.1)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="mood"  stroke="#22c55e" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="sleep" stroke="#a78bfa" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="water" stroke="#3b82f6" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Row 3: AI Health Coach (chat) ── */}
          <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa' }}>
                  <Brain size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f3', margin: 0 }}>AI Health Coach</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Ask anything about your health — powered by AI</p>
                </div>
              </div>

              {/* Context tip */}
              {coachMessages.length === 0 && (
                <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5, margin: '0 0 12px', padding: '10px 12px', background: 'rgba(167,139,250,0.06)', borderRadius: 10, border: '1px solid rgba(167,139,250,0.12)' }}>
                  {h.stressLevel > 7 ? `⚠️ Stress at ${h.stressLevel}/10 is critical. Try asking: "How can I lower my stress quickly?"`
                    : h.sleepAvg > 0 && h.sleepAvg < 6 ? `😴 Sleep at ${h.sleepAvg}h. Try: "What's the best sleep routine for me?"`
                    : h.workoutsPerWeek < 2 ? `💪 Only ${h.workoutsPerWeek} workouts this week. Try: "Give me a beginner workout plan."`
                    : `Ask me anything: "Analyse my health data", "What should I eat today?", "How to improve my score?"`}
                </p>
              )}

              {/* Chat messages */}
              {coachMessages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>
                  {coachMessages.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: m.role === 'user' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      fontSize: 12, color: '#e2e8f0', lineHeight: 1.5,
                    }}>
                      {m.content}
                    </div>
                  ))}
                  {coachLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: '#64748b' }}>
                      Thinking…
                    </div>
                  )}
                </div>
              )}

              {/* Input row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={coachInput}
                  onChange={e => setCoachInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCoachSend()}
                  placeholder="Ask your health coach…"
                  style={{ flex: 1, height: 40, padding: '0 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 12, outline: 'none' }}
                />
                <button
                  onClick={handleCoachSend}
                  disabled={coachLoading || !coachInput.trim()}
                  style={{ height: 40, padding: '0 16px', borderRadius: 10, background: coachInput.trim() ? '#7c3aed' : 'rgba(255,255,255,0.05)', border: 'none', color: coachInput.trim() ? '#fff' : '#475569', fontSize: 12, fontWeight: 700, cursor: coachInput.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}
                >
                  Send
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['Analyse my health data', 'Sleep tips for me', 'Reduce my stress'].map(q => (
                  <button key={q} onClick={() => { setCoachInput(q); }} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', color: '#a78bfa', cursor: 'pointer' }}>{q}</button>
                ))}
              </div>
              {/* Decorative Meditating Figure */}
              <div style={{ position: 'absolute', right: 10, bottom: -10, opacity: 0.75, pointerEvents: 'none' }}>
                <svg width="140" height="140" viewBox="0 0 100 100">
                  <g fill="none" stroke="#a78bfa" strokeWidth="1.2" opacity="0.8">
                    <circle cx="50" cy="20" r="6" />
                    <path d="M50 26 C 44 32, 40 42, 38 55 C 36 62, 40 68, 50 68 C 60 68, 64 62, 62 55 C 60 42, 56 32, 50 26" />
                    <path d="M38 42 C 30 44, 20 52, 18 60" />
                    <path d="M62 42 C 70 44, 80 52, 82 60" />
                    <path d="M40 68 C 35 72, 20 75, 18 80" />
                    <path d="M60 68 C 65 72, 80 75, 82 80" />
                    <ellipse cx="50" cy="80" rx="32" ry="5" opacity="0.15" strokeWidth="0" fill="#a78bfa" />
                  </g>
                  <circle cx="25" cy="30" r="1" fill="#d8b4fe" opacity="0.6" />
                  <circle cx="78" cy="25" r="1.5" fill="#d8b4fe" opacity="0.5" className="animate-pulse" />
                  <circle cx="72" cy="50" r="1" fill="#d8b4fe" opacity="0.4" />
                  <circle cx="20" cy="55" r="1.5" fill="#d8b4fe" opacity="0.5" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
                  <text x="22" y="36" fontSize="10" fill="#d8b4fe" opacity="0.5">+</text>
                  <text x="75" y="42" fontSize="12" fill="#d8b4fe" opacity="0.4">+</text>
                  <text x="70" y="18" fontSize="10" fill="#d8b4fe" opacity="0.5">+</text>
                </svg>
              </div>
            </div>

        </div>
      )}

      {tab === 'log' && (
        <div style={{ fontFamily: 'var(--font-primary)' }} className="flex flex-col gap-5 w-full px-1">
          {/* ── Title ── */}
          <h2 style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-1">
            Log Today's Health Data
          </h2>

          {/* ── Orange Streak Banner ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
            borderRadius: '16px', padding: '14px 20px', width: '100%'
          }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                🔥
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)' }} className="text-xs font-bold text-[#f97316] m-0">Start Your Streak!</p>
                <p style={{ fontFamily: 'var(--font-primary)' }} className="text-[10px] text-[#f97316]/75 m-0 mt-0.5">Keep it up — consistency is everything.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span style={{ fontFamily: 'var(--font-mono)' }} className="text-xs font-bold text-[#f97316] bg-[#f97316]/10 px-3 py-1 rounded-md border border-[#f97316]/15">
                {healthRecords.length} entries
              </span>
              <button
                onClick={() => setTab('scan')}
                style={{ fontFamily: 'var(--font-display)' }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 text-[#d8b4fe] hover:bg-[#8b5cf6]/20 transition-all text-xs font-bold cursor-pointer"
              >
                <Eye size={12} /> Scan with AI Vision
              </button>
            </div>
          </div>

          {/* ── Input Grid (4-column mockup grid) ── */}
          <form onSubmit={handleLog} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {[
                { key: 'sleep',    label: 'Sleep (hours)',       placeholder: '7.5',  icon: <Moon size={16} />,     color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', maxVal: 10 },
                { key: 'mood',     label: 'Mood (1–10)',          placeholder: '7',    icon: <Smile size={16} />,    color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', maxVal: 10 },
                { key: 'stress',   label: 'Stress (1–10)',        placeholder: '4',    icon: <Activity size={16} />, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', maxVal: 10 },
                { key: 'workout',  label: 'Workouts this week',  placeholder: '3',    icon: <Dumbbell size={16} />, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', maxVal: 5 },
                { key: 'water',    label: 'Water (glasses)',      placeholder: '8',    icon: <Droplets size={16} />, color: '#38bdf8', bg: 'rgba(59, 130, 246, 0.12)', maxVal: 12 },
                { key: 'calories', label: 'Calories (kcal)',      placeholder: '2200', icon: <Flame size={16} />,    color: '#fb923c', bg: 'rgba(234, 88, 12, 0.12)', maxVal: 3000 },
                { key: 'weight',   label: 'Body Weight (kg)',     placeholder: '70',   icon: <Scale size={16} />,     color: '#c084fc', bg: 'rgba(167, 139, 250, 0.12)', maxVal: 120 },
                { key: 'bmi',      label: 'BMI',                  placeholder: '22.5', icon: <User size={16} />,     color: '#a78bfa', bg: 'rgba(45, 212, 191, 0.12)', maxVal: 35 }
              ].map(f => {
                const currentVal = Number(form[f.key] || f.placeholder);
                const percent = Math.min(100, Math.max(0, Math.round((currentVal / f.maxVal) * 100)));

                return (
                  <div key={f.key} style={{
                    background: 'linear-gradient(135deg, rgba(16, 20, 37, 0.6) 0%, rgba(13, 16, 30, 0.7) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12
                  }}>
                    <div className="flex items-center gap-4 w-full">
                      {/* Circular Icon Container */}
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: f.bg, border: `1px solid ${f.color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: f.color, flexShrink: 0,
                        boxShadow: `0 0 10px ${f.color}08`
                      }}>
                        {f.icon}
                      </div>
                      {/* Input stack */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <label style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] font-semibold text-slate-400 leading-none">
                          {f.label}
                        </label>
                        <input
                          type="number"
                          value={form[f.key]}
                          onChange={e => {
                            const raw = e.target.value;
                            const num = parseFloat(raw);
                            if (raw === '' || raw === '-') { setForm(p => ({ ...p, [f.key]: raw })); return; }
                            setForm(p => ({ ...p, [f.key]: isNaN(num) ? raw : String(Math.min(f.maxVal, Math.max(0, num))) }));
                          }}
                          placeholder={f.placeholder}
                          step={f.key === 'sleep' || f.key === 'weight' || f.key === 'bmi' ? '0.1' : '1'}
                          min="0"
                          max={f.maxVal}
                          style={{
                            width: '100%', background: 'transparent', border: 'none',
                            outline: 'none', color: '#ffffff', fontSize: '20px', fontWeight: '800',
                            fontFamily: 'var(--font-display)', padding: 0, marginTop: '4px'
                          }}
                          className="placeholder-slate-600 focus:text-white"
                        />
                      </div>
                    </div>
                    {/* Horizontal Progress Bar */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                      <div style={{ width: `${percent}%`, backgroundColor: f.color }} className="h-full rounded-full transition-all duration-300" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Footer Row (Encrypted status + Save Button) ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '4px', padding: '12px 2px 0'
            }}>
              <span style={{ fontFamily: 'var(--font-display)' }} className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold tracking-wider">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                🔒 Encrypted
              </span>
              <button
                type="submit"
                style={{ height: '44px', backgroundColor: '#8b5cf6', borderRadius: '12px', padding: '0 24px', fontFamily: 'var(--font-display)' }}
                className="text-white font-bold text-xs tracking-wide cursor-pointer transition-all flex items-center gap-2 active:scale-[0.98] hover:bg-[#7c3aed] shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Save Health Data
              </button>
            </div>
          </form>

          {/* ── Recent Log History (Full Width) ── */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Recent Log History
              </span>
              <button
                type="button"
                onClick={() => setShowAllHistory(v => !v)}
                style={{ fontFamily: 'var(--font-display)' }}
                className="flex items-center gap-1.5 text-[#8b5cf6] hover:text-[#7c3aed] transition-all text-xs font-bold cursor-pointer bg-none border-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M9 17h6M9 12h6M9 7h6"></path></svg>
                {showAllHistory ? 'Show Less' : `View All (${sortedLogs.length})`}
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <div className="flex flex-col gap-3 py-16 items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Activity size={20} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)' }} className="text-[13px] font-bold text-slate-300">Empty Log History</p>
                  <p style={{ fontFamily: 'var(--font-primary)' }} className="text-[11px] text-slate-500 mt-1 font-medium">Your daily wellness logs will safely compile here.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {/* Headers */}
                <div className="grid grid-cols-[150px_1fr_40px] py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 px-4">
                  <span>DATE</span>
                  <span>SUMMARY</span>
                  <span className="text-right"></span>
                </div>
                {/* Rows */}
                <div className="flex flex-col">
                  <AnimatePresence initial={false}>
                    {recentLogs.map((entry, idx) => {
                      const date = new Date(entry.date);
                      const parts = [];
                      if (entry.sleep != null)            parts.push(`🌙 ${entry.sleep}h sleep`);
                      if (entry.mood != null)             parts.push(`Mood ${entry.mood}`);
                      if (entry.stress != null)           parts.push(`Stress ${entry.stress}`);
                      if (entry.workoutsPerWeek != null)  parts.push(`💪 ${entry.workoutsPerWeek}x`);
                      if (entry.water != null)            parts.push(`💧 ${entry.water} glasses`);
                      if (entry.calories != null)         parts.push(`🔥 ${entry.calories} kcal`);
                      if (entry.weight != null)           parts.push(`⚖️ ${entry.weight} kg`);
                      if (entry.bmi != null)              parts.push(`📏 BMI ${entry.bmi}`);

                      return (
                        <motion.div
                          key={entry.id || idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-[150px_1fr_40px] py-4 items-center border-b border-white/5 hover:bg-white/[0.01] transition-all px-4"
                        >
                          <div className="flex items-center gap-2.5">
                            <svg className="text-slate-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M9 12h6M9 16h6"></path></svg>
                            <span style={{ fontFamily: 'var(--font-primary)' }} className="text-xs font-semibold text-slate-200">
                              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-primary)' }} className="text-xs font-medium text-slate-300">
                            {parts.join(' • ')}
                          </div>
                          <div className="text-right text-slate-500">
                            <button
                              type="button"
                              title="Delete entry"
                              onClick={() => setRecords('health', healthRecords.filter(r => r !== entry))}
                              className="text-slate-600 hover:text-red-400 cursor-pointer bg-transparent border-none transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* ── Monospace Status Footer ── */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-[9px] text-slate-500 font-mono tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ENGINE CONNECTED | {healthRecords.length > 0 ? `${healthRecords.length} RECORDS LOADED` : 'DEMO MODE'}
            </div>
            <div>
              STREAK: {streak} DAY{streak !== 1 ? 'S' : ''}
            </div>
          </div>
        </div>
      )}


      {tab === 'scan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ScanVisionPanel onApplyCalories={handleApplyCalories} />
          <LabReportUploader health={health} updateDomain={updateDomain} />
        </div>
      )}

      {tab === 'nutrition' && (
        <NutritionPanel healthData={health} updateDomain={updateDomain} cyclePhaseKey={phaseKey} isFemale={isFemale} />
      )}

      {tab === 'wellness' && (() => {
        const card = { background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };
        const overallWellness = Math.round(wellnessFactors.reduce((s, f) => s + f.score, 0) / wellnessFactors.length);
        const wellnessColor = overallWellness >= 70 ? '#22c55e' : overallWellness >= 45 ? '#f59e0b' : '#f43f5e';
        const wellnessLabel = overallWellness >= 70 ? 'Thriving' : overallWellness >= 45 ? 'Moderate' : 'Needs Care';

        const immuneScore = Math.round((Math.min(h.sleepAvg/8,1)*40) + (Math.min(h.waterIntake/8,1)*30) + (Math.max(0,(10-h.stressLevel)/10)*30));
        const cogScore    = Math.round((Math.min(h.sleepAvg/8,1)*45) + (Math.max(0,(10-h.stressLevel)/10)*35) + (Math.min(h.moodAvg/10,1)*20));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── ROW 1: Overall Wellness Score + Factor Breakdown ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 12 }}>

              {/* Wellness Score Ring */}
              <div style={{ ...card, padding: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 110, height: 110 }}>
                  <svg viewBox="0 0 110 110" width="110" height="110">
                    <circle cx="55" cy="55" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
                    <circle cx="55" cy="55" r="44" fill="none" stroke={wellnessColor} strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*44} ${2*Math.PI*44}`}
                      strokeDashoffset={2*Math.PI*44*(1-overallWellness/100)}
                      style={{ transform:'rotate(-90deg)', transformOrigin:'55px 55px', filter: `drop-shadow(0 0 8px ${wellnessColor}60)` }}/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{overallWellness}</span>
                    <span style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>/ 100</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Wellness Score</p>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 999, background: wellnessColor + '18', color: wellnessColor, border: `1px solid ${wellnessColor}44` }}>
                    {wellnessLabel}
                  </span>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div style={{ ...card, padding: '18px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Factor Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {wellnessFactors.map((wf, i) => (
                    <motion.div key={wf.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: wf.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{wf.icon}</div>
                      <div style={{ width: 110, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500, display: 'block' }}>{wf.label}</span>
                        {wf.rawValue && <span style={{ fontSize: 10, color: wf.color, fontWeight: 700 }}>{wf.rawValue}</span>}
                      </div>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${wf.score}%` }} transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 99, background: wf.color, boxShadow: `0 0 6px ${wf.color}50` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: wf.color, width: 34, textAlign: 'right', flexShrink: 0 }}>{wf.score}%</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ROW 2: Emotional Wellness ── */}
            <div style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>❤️</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Emotional Wellness</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  {
                    icon: h.moodAvg < 4 ? '😔' : h.moodAvg < 6 ? '😐' : '😊',
                    label: 'Emotional State',
                    value: h.moodAvg < 4 ? 'Needs Attention' : h.moodAvg < 6 ? 'Moderate' : 'Good',
                    desc: h.moodAvg < 4 ? 'Take a recovery day and connect with friends.' : 'Emotional wellbeing is stable.',
                    color: h.moodAvg < 4 ? '#f43f5e' : h.moodAvg < 6 ? '#f59e0b' : '#22c55e',
                  },
                  {
                    icon: h.stressLevel > 7 && h.sleepAvg < 6 ? '🚨' : h.stressLevel > 5 ? '⚠️' : '✅',
                    label: 'Burnout Pattern',
                    value: h.stressLevel > 7 && h.sleepAvg < 6 ? 'High Risk' : h.stressLevel > 5 ? 'Watch Closely' : 'Sustainable',
                    desc: h.stressLevel > 7 ? 'Stress + sleep pattern suggests burnout risk.' : 'Current pace is sustainable.',
                    color: h.stressLevel > 7 ? '#f43f5e' : h.stressLevel > 5 ? '#f59e0b' : '#22c55e',
                  },
                  {
                    icon: '🧘',
                    label: 'Recovery Suggestion',
                    value: h.stressLevel > 6 ? 'Active Recovery' : 'Maintain Balance',
                    desc: h.stressLevel > 6 ? '10-min meditation, a nature walk, or journaling.' : 'Keep up your current routines.',
                    color: '#8b5cf6',
                  },
                ].map((card2, i) => (
                  <motion.div key={card2.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ background: card2.color + '0c', border: `1px solid ${card2.color}30`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{card2.icon}</div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: card2.color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{card2.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>{card2.value}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{card2.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── ROW 3: Daily Health Summary ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  label: 'Energy Level', icon: '⚡', color: '#f59e0b',
                  value: h.sleepAvg >= 7 && h.stressLevel < 6 && h.waterIntake >= 7 ? 'High' : h.sleepAvg >= 6 && h.stressLevel < 7 ? 'Moderate' : 'Low',
                  desc: h.sleepAvg >= 7 && h.stressLevel < 6 && h.waterIntake >= 7
                    ? 'Sleep, stress & hydration all green.'
                    : h.sleepAvg >= 6 && h.stressLevel < 7
                    ? `+${(7-h.sleepAvg).toFixed(1)}h sleep would push you to high.`
                    : `${h.sleepAvg < 5.5 ? `Only ${h.sleepAvg}h sleep` : `Stress ${h.stressLevel}/10`} is draining reserves.`,
                  score: h.sleepAvg >= 7 && h.stressLevel < 6 ? 85 : h.sleepAvg >= 6 ? 60 : 30,
                },
                {
                  label: 'Recovery Status', icon: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? '✅' : '⚠️', color: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? '#22c55e' : '#f59e0b',
                  value: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? 'Balanced' : h.workoutsPerWeek >= 3 ? 'Underslept' : 'Under-recovered',
                  desc: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? `${h.workoutsPerWeek}x workouts + ${h.sleepAvg}h sleep.` : h.workoutsPerWeek >= 3 ? 'Training without adequate recovery.' : 'Add 1-2 movement sessions per week.',
                  score: h.workoutsPerWeek >= 3 && h.sleepAvg >= 7 ? 88 : h.workoutsPerWeek >= 2 ? 55 : 30,
                },
                {
                  label: 'Immune Health', icon: '🛡️', color: immuneScore >= 80 ? '#22c55e' : immuneScore >= 55 ? '#f59e0b' : '#f43f5e',
                  value: immuneScore >= 80 ? 'Strong' : immuneScore >= 55 ? 'Moderate' : 'Compromised',
                  desc: immuneScore >= 80 ? 'Sleep, hydration & stress all supporting immunity.' : `${h.sleepAvg < 7 ? 'Sleep' : h.waterIntake < 6 ? 'Hydration' : 'Stress'} is the weak link.`,
                  score: immuneScore,
                },
                {
                  label: 'Cognitive Performance', icon: '🧠', color: cogScore >= 80 ? '#8b5cf6' : cogScore >= 55 ? '#f59e0b' : '#f43f5e',
                  value: cogScore >= 80 ? 'Optimal' : cogScore >= 55 ? 'Moderate' : 'Impaired',
                  desc: cogScore >= 80 ? 'Focus & working memory at peak.' : cogScore >= 55 ? `${h.sleepAvg < 7 ? 'Sleep deficit' : 'Elevated stress'} limiting capacity.` : 'Prioritise recovery today.',
                  score: cogScore,
                },
              ].map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{item.icon}</div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: 0 }}>{item.label}</p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.score}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>{item.value}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px', lineHeight: 1.4 }}>{item.desc}</p>
                  <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.score}%` }} transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 99, background: item.color }} />
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        );
      })()}

      {tab === 'recommendations' && (
        <HealthRecommendations recommendations={recommendations} h={h} score={score} />
      )}

      {tab === 'cycle' && (
        <CycleTrackerPanel
          cycleData={cycleData}
          cycleDay={cycleDay}
          phaseKey={phaseKey}
          phase={phase}
          daysUntil={daysUntil}
          onSave={(updates) => updateDomain('health', { menstrualCycle: { ...cycleData, ...updates } })}
        />
      )}
    </div>
  );
}

// ── Nutritionix Food Tracker Panel ───────────────────────────────────────────

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Other'];

const SUGGESTIONS = [
  '2 eggs and toast', '1 cup oats with banana', 'dal rice and salad',
  'chicken breast with broccoli', '1 bowl poha', 'paneer paratha with dahi',
  '2 roti with sabji', 'greek yogurt with almonds', '1 banana and peanut butter',
  'biryani 1 cup', 'rajma chawal', '3 idli with sambar',
];

function FoodTrackerPanel({ health, updateDomain, addRecords }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mealType, setMealType] = useState('Lunch');
  const foodLog = health?.foodLog || [];
  const today = new Date().toISOString().split('T')[0];
  const todayLog = foodLog.filter(e => e.date === today);

  const todayTotals = todayLog.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein:  acc.protein  + (e.protein  || 0),
    carbs:    acc.carbs    + (e.carbs    || 0),
    fat:      acc.fat      + (e.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const targetCal = health?.nutritionProfile?.targetCalories || 2000;
  const calPct = Math.min(100, Math.round((todayTotals.calories / targetCal) * 100));
  const calColor = calPct > 105 ? '#f43f5e' : calPct >= 80 ? '#22c55e' : '#f59e0b';

  const handleAnalyze = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await analyzeFood(trimmed);
      setResult(r);
    } catch (err) {
      setError(err.message || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLog = () => {
    if (!result) return;
    const entry = {
      id: Date.now(),
      date: today,
      mealType,
      query: query.trim(),
      calories: result.total.calories,
      protein:  result.total.protein,
      carbs:    result.total.carbs,
      fat:      result.total.fat,
      fiber:    result.total.fiber,
      sodium:   result.total.sodium,
      items:    result.items,
      isMock:   result.isMock,
    };
    const updated = [...foodLog, entry];
    updateDomain('health', { foodLog: updated });
    // Also push a health record for calorie tracking
    addRecords('health', [{ date: new Date().toISOString(), calories: result.total.calories, protein: result.total.protein, carbs: result.total.carbs, fat: result.total.fat }]);
    showToast(`${mealType} logged — ${result.total.calories} kcal`, 'success');
    setResult(null);
    setQuery('');
  };

  const handleDelete = (id) => {
    updateDomain('health', { foodLog: foodLog.filter(e => e.id !== id) });
  };

  const card = { background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };
  const scoreColor = result ? (result.healthScore >= 70 ? '#22c55e' : result.healthScore >= 45 ? '#f59e0b' : '#f43f5e') : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Daily Progress Bar ── */}
      <div style={{ ...card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Today's Intake</p>
          <span style={{ fontSize: 11, color: '#64748b' }}>{today}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Calories', val: Math.round(todayTotals.calories), target: targetCal, unit: 'kcal', color: calColor },
            { label: 'Protein',  val: Math.round(todayTotals.protein),  target: 60,  unit: 'g', color: '#10b981' },
            { label: 'Carbs',    val: Math.round(todayTotals.carbs),    target: 250, unit: 'g', color: '#f59e0b' },
            { label: 'Fat',      val: Math.round(todayTotals.fat),      target: 70,  unit: 'g', color: '#ef4444' },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: m.color, margin: '0 0 6px', lineHeight: 1 }}>{m.val}</p>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', borderRadius: 99, background: m.color, width: `${Math.min(100, Math.round((m.val / m.target) * 100))}%`, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 9, color: '#475569', margin: '4px 0 0' }}>/ {m.target} {m.unit}</p>
            </div>
          ))}
        </div>
        {/* Calorie bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${calPct}%` }} transition={{ duration: 0.8 }}
              style={{ height: '100%', borderRadius: 99, background: calColor, boxShadow: `0 0 8px ${calColor}50` }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: calColor, minWidth: 36, textAlign: 'right' }}>{calPct}%</span>
        </div>
      </div>

      {/* ── Search Panel ── */}
      <div style={{ ...card, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', flexShrink: 0 }}>
            <Apple size={16} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Food Search</p>
            <p style={{ fontSize: 10, color: '#64748b', margin: '1px 0 0' }}>
              Natural language — "2 eggs and toast", "1 cup dal rice"
              {!hasNutritionixKey() && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· Mock data</span>}
            </p>
          </div>
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder='e.g. "2 eggs and 1 cup oats"'
            className="input-premium"
            style={{ flex: 1 }}
          />
          <select value={mealType} onChange={e => setMealType(e.target.value)}
            className="input-premium" style={{ width: 110 }}>
            {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => handleAnalyze()} disabled={loading || !query.trim()}
            style={{ padding: '0 18px', borderRadius: 10, border: 'none', background: loading ? 'rgba(249,115,22,0.3)' : 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading
              ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Analyzing…</>
              : 'Analyze →'}
          </button>
        </div>

        {/* Quick suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: error || result ? 14 : 0 }}>
          {SUGGESTIONS.slice(0, 8).map(s => (
            <button key={s} onClick={() => { setQuery(s); handleAnalyze(s); }}
              style={{ fontSize: 10, padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p style={{ fontSize: 12, color: '#f87171', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, margin: 0 }}>⚠️ {error}</p>}

        {/* Result */}
        {result && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* Mock badge */}
              {result.isMock && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#fbbf24' }}>⚡ Mock data — add Nutritionix keys in Settings → Integrations for live lookup</span>
                </div>
              )}
              {result.unrecognized && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>
                  ⚠️ Could not identify: {result.unrecognized.join(', ')} — used estimates.
                </div>
              )}

              {/* Per-item rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {result.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>{item.name}</span>
                      <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>{item.qty}</span>
                      {item.estimated && <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 6 }}>~est</span>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316', textAlign: 'right' }}>{item.calories} kcal</span>
                    <span style={{ fontSize: 11, color: '#10b981', textAlign: 'right' }}>{item.protein}g P</span>
                    <span style={{ fontSize: 11, color: '#f59e0b', textAlign: 'right' }}>{item.carbs}g C</span>
                    <span style={{ fontSize: 11, color: '#ef4444', textAlign: 'right' }}>{item.fat}g F</span>
                  </div>
                ))}
              </div>

              {/* Totals row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, padding: '12px', background: 'rgba(249,115,22,0.06)', borderRadius: 12, border: '1px solid rgba(249,115,22,0.15)', marginBottom: 14 }}>
                {[
                  { label: 'Total Cal', val: result.total.calories, unit: 'kcal', color: '#f97316' },
                  { label: 'Protein',   val: result.total.protein,  unit: 'g',    color: '#10b981' },
                  { label: 'Carbs',     val: result.total.carbs,    unit: 'g',    color: '#f59e0b' },
                  { label: 'Fat',       val: result.total.fat,      unit: 'g',    color: '#ef4444' },
                  { label: 'Score',     val: result.healthScore,    unit: '/100', color: scoreColor },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: m.color, margin: 0, lineHeight: 1 }}>{m.val}<span style={{ fontSize: 10, marginLeft: 2 }}>{m.unit}</span></p>
                  </div>
                ))}
              </div>

              {/* Log button */}
              <button onClick={handleLog}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Log as {mealType} ({result.total.calories} kcal) →
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Today's Log ── */}
      {todayLog.length > 0 && (
        <div style={{ ...card, padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>
            Today's Meals
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>{todayLog.length} entr{todayLog.length === 1 ? 'y' : 'ies'}</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayLog.map((entry, i) => (
              <motion.div key={entry.id || i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  {entry.mealType === 'Breakfast' ? '🌅' : entry.mealType === 'Lunch' ? '☀️' : entry.mealType === 'Dinner' ? '🌙' : '🍎'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', margin: 0, textTransform: 'capitalize' }}>{entry.query}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>
                    {entry.mealType} · {entry.calories} kcal · {entry.protein}g P · {entry.carbs}g C · {entry.fat}g F
                  </p>
                </div>
                <button onClick={() => handleDelete(entry.id)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {todayLog.length === 0 && !result && (
        <div style={{ ...card, padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🥗</div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No meals logged today. Search for food above to start tracking.</p>
        </div>
      )}
    </div>
  );
}

// ── Menstrual Cycle Tracker Panel ────────────────────────────────────────────
function CycleTrackerPanel({ cycleData, cycleDay, phaseKey, phase, daysUntil, onSave }) {
  const [lastPeriod, setLastPeriod] = useState(cycleData.lastPeriodDate || '');
  const [cycleLength, setCycleLength] = useState(cycleData.cycleLength || 28);
  const [remindDays, setRemindDays] = useState(cycleData.remindDaysBefore ?? 3);
  const [saved, setSaved] = useState(false);
  const [notifStatus, setNotifStatus] = useState(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const diet = phaseKey ? PHASE_DIET[phaseKey] : null;
  const card = { background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 };

  const handleSave = () => {
    onSave({ lastPeriodDate: lastPeriod, cycleLength: Number(cycleLength), remindDaysBefore: Number(remindDays) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Phase progress ring (SVG)
  const ringRadius = 46;
  const ringCirc = 2 * Math.PI * ringRadius;
  const phaseProgress = cycleDay && cycleLength ? cycleDay / cycleLength : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Row 1: Cycle Status + Setup ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>

        {/* Phase Ring */}
        <div style={{ ...card, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Current Phase</p>
          <div style={{ position: 'relative', width: 110, height: 110 }}>
            <svg viewBox="0 0 110 110" width="110" height="110">
              <circle cx="55" cy="55" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              {cycleDay && (
                <circle cx="55" cy="55" r={ringRadius} fill="none"
                  stroke={phase?.color || '#64748b'} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${ringCirc * phaseProgress} ${ringCirc}`}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '55px 55px', filter: `drop-shadow(0 0 8px ${phase?.color || '#64748b'}60)` }}
                />
              )}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{phase?.emoji || '🌀'}</span>
              {cycleDay && <span style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>Day {cycleDay}</span>}
            </div>
          </div>
          {phase ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: phase.color }}>{phase.name} Phase</span>
              {daysUntil !== null && (
                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
                  {daysUntil <= 1 ? '🔴 Period expected tomorrow' : daysUntil <= 3 ? `🔴 Period in ${daysUntil} days` : `Next period in ${daysUntil} days`}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: 0 }}>Set your last period date to see your phase.</p>
          )}
        </div>

        {/* Setup Form */}
        <div style={{ ...card, padding: '20px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px' }}>Cycle Settings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Last Period Start Date</label>
              <input type="date" value={lastPeriod} onChange={e => setLastPeriod(e.target.value)}
                className="input-premium" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Cycle Length (days)</label>
              <input type="number" value={cycleLength} onChange={e => setCycleLength(e.target.value)}
                min="21" max="40" className="input-premium" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Remind me before period (days)</label>
              <select value={remindDays} onChange={e => setRemindDays(Number(e.target.value))} className="input-premium" style={{ width: '100%' }}>
                {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''} before</option>)}
              </select>
            </div>
            <button onClick={handleSave}
              style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#f43f5e,#e11d48)', color: saved ? '#34d399' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {saved ? '✅ Saved' : 'Save Settings →'}
            </button>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setLastPeriod(today);
                onSave({ lastPeriodDate: today, cycleLength: Number(cycleLength), remindDaysBefore: Number(remindDays) });
                showToast('Period logged for today!', 'success');
              }}
              style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.08)', color: '#fda4af', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🔴 Log Period Started Today
            </button>
            {notifStatus !== 'unsupported' && notifStatus !== 'granted' && (
              <button
                onClick={() => {
                  Notification.requestPermission().then(p => {
                    setNotifStatus(p);
                    if (p === 'granted') showToast('Period reminders enabled!', 'success');
                  });
                }}
                style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🔔 Enable Period Reminders
              </button>
            )}
            {notifStatus === 'granted' && (
              <p style={{ fontSize: 10, color: '#34d399', textAlign: 'center', margin: 0 }}>🔔 Browser reminders are ON</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Diet Recommendations ── */}
      {diet && (
        <div style={{ ...card, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: (phase?.bg || 'rgba(99,102,241,0.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: `1px solid ${phase?.border || 'rgba(99,102,241,0.2)'}` }}>
              🥗
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{diet.focus}</p>
              <p style={{ fontSize: 10, color: phase?.color || '#64748b', margin: '2px 0 0' }}>{phase?.name} Phase Diet</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: phase?.bg, color: phase?.color, border: `1px solid ${phase?.border}` }}>
              {diet.calorie_note}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Eat */}
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>✅ Eat More</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {diet.foods.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color: '#22c55e', fontSize: 10, marginTop: 2, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Avoid */}
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>⚠️ Limit / Avoid</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {diet.avoid.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color: '#f87171', fontSize: 10, marginTop: 2, flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tip + extras row */}
          <div style={{ background: phase?.bg, border: `1px solid ${phase?.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, margin: 0 }}>💡 {diet.tip}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>💊 Supplements</p>
              {diet.supplements.map((s, i) => (
                <p key={i} style={{ fontSize: 11.5, color: '#cbd5e1', margin: '0 0 3px' }}>• {s}</p>
              ))}
            </div>
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>🏃 Workout</p>
              <p style={{ fontSize: 11.5, color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>{diet.workout}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Phase Timeline ── */}
      <div style={{ ...card, padding: '18px 20px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Cycle Phases</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {Object.entries(PHASES).map(([key, p]) => {
            const isActive = key === phaseKey;
            return (
              <motion.div key={key} animate={{ scale: isActive ? 1.03 : 1 }}
                style={{ padding: '12px', borderRadius: 12, background: isActive ? p.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? p.border : 'rgba(255,255,255,0.06)'}`, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{p.emoji}</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: isActive ? p.color : '#94a3b8', margin: '0 0 3px' }}>{p.name}</p>
                <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>Day {p.days[0]}–{p.days[1]}</p>
                {isActive && <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: p.color + '22', color: p.color }}>NOW</span>}
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
