import { useState, useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { healthApi } from '../services/backendApi';
import { generateTrendData, generateInsights } from '../data/demoData';
import { analyzeMealImage, analyzeSupplementImage, hasApiKey, saveApiKey, getDemoMealResult, getDemoSupplementResult } from '../services/visionService';
import { generateMealPlan, regenerateSingleMeal } from '../services/nutritionService';
import { ScoreRing, GlassCard, PageHeader, TabBar, showToast, SecurityBadge, RecommendationCard } from '../components/ui/Components';
import { loadFeedback, sortByFeedback } from '../services/recommendationFeedbackService';
import { CartesianGrid, AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Moon, Flame, Smile, Dumbbell, Droplets, UtensilsCrossed, Eye, Upload, X, Key, CheckCircle, Pill, RefreshCw, Calendar, Check, Brain, Activity } from 'lucide-react';

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
                    onClick={() => { onApplyCalories(result.calories); showToast(`Logged ${result.foodName} — ${result.calories} kcal`, 'success', 5000); }}
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

// ── Nutrition Panel ─────────────────────────────────────────────────────────────
function NutritionPanel({ healthData, updateDomain }) {
  const profile = healthData?.nutritionProfile;
  const plan = healthData?.dailyMealPlan;
  
  const [editing, setEditing] = useState(!profile);
  const [loading, setLoading] = useState(false);
  const [loadingMeal, setLoadingMeal] = useState(null);
  const [form, setForm] = useState(profile || {
    dietaryPreference: 'Veg',
    allergies: '',
    cuisine: 'North Indian',
    targetCalories: healthData.calories || (healthData.weight ? Math.round(healthData.weight * 24 * 1.2) : 2000)
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updatedProfile = { ...form, targetCalories: Number(form.targetCalories) };
    try {
      const newPlan = await generateMealPlan(updatedProfile);
      updateDomain('health', { 
        ...healthData, 
        nutritionProfile: updatedProfile, 
        dailyMealPlan: newPlan 
      });
      setEditing(false);
      showToast('Nutrition profile & meal plan generated!', 'success');
    } catch (err) {
      showToast('Failed to generate plan. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const newPlan = await generateMealPlan(profile);
      updateDomain('health', { ...healthData, dailyMealPlan: newPlan });
      showToast('New meal plan generated!', 'success');
    } catch (err) {
      showToast('Failed to regenerate plan. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateSingleMeal = async (mealType, currentMealName) => {
    setLoadingMeal(mealType);
    try {
      const newMeal = await regenerateSingleMeal(profile, mealType, currentMealName);
      
      const updatedMeals = plan.meals.map(m => m.type === mealType ? newMeal : m);
      
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

  if (editing) {
    return (
      <GlassCard>
        <div className="mb-6">
          <h3 className="dash-section-title mb-1 text-[18px]">Nutrition Onboarding</h3>
          <p className="text-[13px] text-[#71717a]">Set your preferences to get AI-generated Indian meal plans tailored to your goals.</p>
        </div>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Dietary Preference</label>
              <select value={form.dietaryPreference} onChange={e => setForm({...form, dietaryPreference: e.target.value})} className="input-premium w-full text-[13px]">
                <option value="Veg">Vegetarian</option>
                <option value="Non-Veg">Non-Vegetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Regional Cuisine</label>
              <select value={form.cuisine} onChange={e => setForm({...form, cuisine: e.target.value})} className="input-premium w-full text-[13px]">
                <option value="North Indian">North Indian</option>
                <option value="South Indian">South Indian</option>
                <option value="Bengali">Bengali</option>
                <option value="Maharashtrian">Maharashtrian</option>
                <option value="Pan-Indian">Pan-Indian (Mixed)</option>
                <option value="Other">Other / No Preference</option>
              </select>
            </div>
            <div>
              <label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Food Allergies / Intolerances (Optional)</label>
              <input type="text" value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} placeholder="e.g. peanuts, dairy" className="input-premium w-full" />
            </div>
            <div>
              <label className="text-[12px] text-[#a1a1aa] font-medium mb-2 block">Daily Caloric Target (kcal)</label>
              <input type="number" value={form.targetCalories} onChange={e => setForm({...form, targetCalories: e.target.value})} className="input-premium w-full" min="1000" max="5000" required />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-white/[0.04]">
            {profile && <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-[#a1a1aa] hover:text-[#f0f0f3] hover:border-white/[0.14] transition-all mr-3">Cancel</button>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Generating Plan...' : 'Save & Generate Plan'}
            </button>
          </div>
        </form>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative z-10">
      
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Calories */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-orange-500/5 blur-xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
            <Flame size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Total Calories</p>
            <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">{plan?.totalCalories || 0}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Target: {profile.targetCalories} kcal</p>
          </div>
        </motion.div>

        {/* Card 2: Protein */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Protein</p>
            <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">{plan?.macros?.protein || 0}g</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total ingested</p>
          </div>
        </motion.div>

        {/* Card 3: Carbs */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Carbs</p>
            <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">{plan?.macros?.carbs || 0}g</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total ingested</p>
          </div>
        </motion.div>

        {/* Card 4: Fats */}
        <motion.div 
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4.5 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-rose-500/5 blur-xl pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-extrabold font-mono uppercase tracking-widest">Fats</p>
            <p className="text-xl font-black text-slate-100 mt-0.5 font-mono">{plan?.macros?.fat || 0}g</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Total ingested</p>
          </div>
        </motion.div>
      </div>

      {/* Action Bar (replaces Search bar in Transactions) */}
      <div className="mt-4 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <UtensilsCrossed size={16} className="text-slate-400" />
             <h3 className="text-sm font-extrabold text-slate-100">Meal Plan Logs <span className="text-[10px] text-slate-500 font-bold ml-2">ⓘ</span></h3>
          </div>
          <p className="text-[11px] text-slate-400">Review your daily nutritional intake and adjust preferences.</p>
        </div>
        <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-white/[0.05]">
           <button onClick={() => setEditing(true)} className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors">
             Edit Preferences
           </button>
           <button onClick={handleRegenerate} disabled={loading} className="px-4 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors">
             {loading ? 'Generating...' : 'Regenerate Plan'}
           </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 h-full relative z-10">
             <div className="w-12 h-12 rounded-full border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(99,102,241,0.15)] mb-4">
               <RefreshCw className="animate-spin text-indigo-400" size={20} />
             </div>
             <p className="text-sm font-bold text-slate-300 mb-1">Crafting your meal plan...</p>
             <p className="text-[11px] text-slate-500">Analyzing nutritional balance and preferences</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 relative z-10 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent pr-1">
             {plan?.meals?.map((meal, idx) => (
               <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                 className="rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.03] transition-all p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
               >
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                     <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                       <UtensilsCrossed size={16} />
                     </div>
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="text-[9px] uppercase tracking-widest font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{meal.type}</span>
                         <h4 className="text-[13px] font-bold text-slate-200">{meal.name}</h4>
                       </div>
                       <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                         {loadingMeal === meal.type ? <span className="text-indigo-400 animate-pulse">Finding alternative...</span> : meal.description}
                       </p>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-center shrink-0 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 w-full sm:w-auto mt-2 sm:mt-0">
                     <div className="flex gap-4">
                       <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Protein</span>
                          <span className="text-[11px] font-mono text-emerald-400">{meal.macros.protein}g</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Carbs</span>
                          <span className="text-[11px] font-mono text-amber-400">{meal.macros.carbs}g</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Fats</span>
                          <span className="text-[11px] font-mono text-rose-400">{meal.macros.fat}g</span>
                       </div>
                     </div>
                     
                     <div className="flex flex-col items-end border-l border-white/5 pl-4 ml-2">
                       <span className="text-[13px] font-black font-mono text-slate-200">{meal.calories}</span>
                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Kcal</span>
                     </div>

                     <button 
                       onClick={() => handleRegenerateSingleMeal(meal.type, meal.name)}
                       disabled={loadingMeal === meal.type}
                       className="ml-2 w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100"
                       title="Swap meal"
                     >
                       <RefreshCw size={12} className={loadingMeal === meal.type ? 'animate-spin text-indigo-400' : ''} />
                     </button>
                  </div>
               </motion.div>
             ))}
          </div>
        )}
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

  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);
  const top3   = sorted.slice(0, 3);
  const best   = top3[0];

  const priorityMeta = (risk) => {
    if (risk === 'critical' || risk === 'high')   return { label: 'High Priority',   labelColor: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   btnBg: 'rgba(239,68,68,0.15)',   btnText: '#f87171', btnLabel: 'Fix Now'     };
    if (risk === 'medium')                         return { label: 'Medium Priority', labelColor: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)',  btnBg: 'rgba(251,146,60,0.15)',  btnText: '#fb923c', btnLabel: 'Start Plan'  };
    return                                                { label: 'Low Priority',    labelColor: '#4ade80', bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.2)',  btnBg: 'rgba(74,222,128,0.12)',  btnText: '#4ade80', btnLabel: 'View Tips'   };
  };

  const icons = { '😴': '🌙', '🧘': '🧘', '🏃': '🏃', '💧': '💧', '🥗': '🥦', '😊': '😊' };

  // Category scores derived from health data
  const categories = [
    { label: 'Mental Energy', icon: '🧠', score: Math.max(0, Math.min(100, Math.round(100 - (h?.stressLevel || 5) * 7 + (h?.moodAvg || 5) * 5))), color: '#4ade80' },
    { label: 'Fitness',       icon: '🏃', score: Math.max(0, Math.min(100, Math.round((h?.workoutsPerWeek || 0) * 16))),                           color: '#fb923c' },
    { label: 'Nutrition',     icon: '🥦', score: Math.max(0, Math.min(100, Math.round((h?.calories || 0) > 0 ? Math.max(30, 100 - Math.abs((h?.calories || 2000) - 2000) / 20) : 48))), color: '#facc15' },
    { label: 'Recovery',      icon: '❤️', score: Math.max(0, Math.min(100, Math.round((h?.sleepAvg || 7) * 10 + (h?.waterIntake || 4) * 2))),     color: '#4ade80' },
    { label: 'Sleep',         icon: '🌙', score: Math.max(0, Math.min(100, Math.round((h?.sleepAvg || 7) / 9 * 100))),                            color: '#a78bfa' },
  ];

  // Action plan — top 4 short action items
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* ── PRIORITY RECOMMENDATIONS ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>Priority Recommendations</span>
            <span title="Sorted by impact on your health score" style={{ fontSize: 11, color: '#475569', cursor: 'help' }}>ⓘ</span>
          </div>
          <button style={{ fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, alignItems: 'stretch' }}>
          {top3.map((rec) => {
            const m = priorityMeta(rec.risk);
            const scoreDelta = Math.round(rec.confidence / 12);
            const subtitle = rec.text.split('.')[0] + '.';
            const body     = rec.text.split('.').slice(1, 3).join('.').trim();
            return (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 10, padding: '10px 12px 8px', display: 'flex', flexDirection: 'column' }}>
                {/* Priority label */}
                <span style={{ fontSize: 9, fontWeight: 700, color: m.labelColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{m.label}</span>
                {/* Icon + title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.btnBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{rec.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', marginBottom: 1 }}>{rec.title}</p>
                    <p style={{ fontSize: 9.5, color: '#94a3b8' }}>{subtitle}</p>
                  </div>
                </div>
                {/* Body — fixed min-height so all cards match */}
                <p style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.4, minHeight: 28, flex: 1 }}>{body}</p>
                {/* Score */}
                <p style={{ fontSize: 9.5, fontWeight: 700, color: m.labelColor, marginTop: 5, marginBottom: 5 }}>↑ +{scoreDelta} Health Score</p>
                {/* CTA — always at bottom */}
                <button
                  onClick={() => handleAccept(rec)}
                  disabled={accepted[rec.id]}
                  style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${m.border}`, background: accepted[rec.id] ? 'rgba(74,222,128,0.15)' : m.btnBg, color: accepted[rec.id] ? '#4ade80' : m.btnText, fontSize: 10.5, fontWeight: 700, cursor: accepted[rec.id] ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  {accepted[rec.id] ? '✓ Accepted' : m.btnLabel}
                  {!accepted[rec.id] && <span style={{ fontSize: 12 }}>›</span>}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Today's Biggest Opportunity */}
        {best && (
          <div style={{ background: 'rgba(12,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Today's Biggest Opportunity</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{best.icon}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>{best.title}</p>
                <p style={{ fontSize: 10.5, color: '#94a3b8', lineHeight: 1.4 }}>{best.text.slice(0, 120)}…</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Potential Gain</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#818cf8' }}>+{Math.round(best.confidence / 12)} <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Health Score</span></p>
              </div>
              <button
                onClick={() => handleAccept(best)}
                disabled={accepted[best.id]}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: accepted[best.id] ? 'rgba(74,222,128,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: accepted[best.id] ? '#4ade80' : '#fff', fontSize: 11, fontWeight: 700, cursor: accepted[best.id] ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                {accepted[best.id] ? '✓ Accepted' : 'Accept Recommendation'} {!accepted[best.id] && '›'}
              </button>
            </div>
          </div>
        )}

        {/* Recommendation Categories */}
        <div style={{ background: 'rgba(12,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Recommendation Categories</p>
            <span title="Health sub-scores" style={{ fontSize: 11, color: '#475569', cursor: 'help' }}>ⓘ</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {categories.map(cat => (
              <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, width: 16, flexShrink: 0 }}>{cat.icon}</span>
                <span style={{ fontSize: 10.5, color: '#94a3b8', width: 90, flexShrink: 0 }}>{cat.label}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${cat.score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ height: '100%', background: cat.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', width: 24, textAlign: 'right' }}>{cat.score}</span>
                <span style={{ fontSize: 9.5, color: '#475569' }}>/100</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACTION PLAN + HISTORY ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

        {/* Today's Action Plan */}
        <div style={{ background: 'rgba(12,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 7 }}>Today's Action Plan</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {actionItems.length === 0 && (
              <p style={{ fontSize: 10.5, color: '#475569' }}>Log health data to generate your action plan.</p>
            )}
            {actionItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setCheckedActions(p => ({ ...p, [item.id]: !p[item.id] }))}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: checkedActions[item.id] ? 'none' : '2px solid rgba(255,255,255,0.15)', background: checkedActions[item.id] ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                  {checkedActions[item.id] && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ flex: 1, fontSize: 11, color: checkedActions[item.id] ? '#475569' : '#e2e8f0', textDecoration: checkedActions[item.id] ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item.text}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: item.impact === 'High Impact' ? '#f87171' : '#fb923c', flexShrink: 0 }}>{item.impact}</span>
              </div>
            ))}
          </div>
          {actionItems.length > 0 && (
            <div style={{ marginTop: 7, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11 }}>📋</span>
              <span style={{ fontSize: 10.5, color: '#475569' }}>{actionItems.filter(i => !checkedActions[i.id]).length} recommendations remaining</span>
            </div>
          )}
        </div>

        {/* Recent Recommendations History */}
        <div style={{ background: 'rgba(12,14,22,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>Recent Recommendations (History)</p>
            <button style={{ fontSize: 10.5, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.length === 0 && (
              <p style={{ fontSize: 10.5, color: '#475569' }}>Accept recommendations above to see your history here.</p>
            )}
            {history.slice(0, 4).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{h.title}</p>
                  <p style={{ fontSize: 9.5, color: '#475569' }}>Accepted {daysAgo(h.acceptedAt)}</p>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4ade80' }}>{h.scoreDelta} Score</span>
              </div>
            ))}
          </div>
          {(Object.values(accepted).some(Boolean) || history.length > 0) && (
            <div style={{ marginTop: 7, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' }}>Great job! You're building healthy habits.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Health() {
  const { user } = useAuth();
  const { health, finance, records, updateDomain, addRecords, setRecords, computed } = useData();
  const healthRecords = records?.health || [];
  const [tab, setTab] = useState('overview');
  const h = { sleepAvg: 0, stressLevel: 0, moodAvg: 0, workoutsPerWeek: 0, waterIntake: 0, calories: 0, bmi: 0, ...(health || {}) };
  const score = Number(computed?.healthScore?.score) || 0;
  const burnout = computed?.burnout?.risk || 0;
  const [form, setForm] = useState({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '', weight: '', bmi: '' });

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
  const recentLogs = useMemo(() =>
    [...healthRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7),
  [healthRecords]);

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
    { id: 'overview',        label: 'Overview' },
    { id: 'log',             label: 'Log Data' },
    { id: 'scan',            label: 'Scan AI' },
    { id: 'wellness',        label: 'Wellness' },
    { id: 'nutrition',       label: 'Nutrition' },
    { id: 'recommendations', label: 'AI Recommendations' },
  ];

  const handleLog = async (e) => {
    e.preventDefault();
    const updated = { ...h };
    const record = { date: new Date().toISOString() };
    let changes = 0;
    if (form.sleep)    { updated.sleepAvg       = Number(form.sleep);          record.sleep    = Number(form.sleep);          changes++; }
    if (form.stress)   { updated.stressLevel    = parseInt(form.stress, 10);   record.stress   = parseInt(form.stress, 10);   changes++; }
    if (form.mood)     { updated.moodAvg        = Number(form.mood);           record.mood     = Number(form.mood);           changes++; }
    if (form.workout)  { updated.workoutsPerWeek = parseInt(form.workout, 10); record.workoutsPerWeek = parseInt(form.workout, 10); changes++; }
    if (form.water)    { updated.waterIntake    = parseInt(form.water, 10);    record.water    = parseInt(form.water, 10);    changes++; }
    if (form.calories) { updated.calories       = parseInt(form.calories, 10); record.calories = parseInt(form.calories, 10); changes++; }
    if (form.weight)   { updated.weight         = Number(form.weight);         record.weight   = Number(form.weight);         changes++; }
    if (form.bmi)      { updated.bmi            = Number(form.bmi);            record.bmi      = Number(form.bmi);            changes++; }
    if (changes === 0) { showToast('Please fill at least one field', 'error'); return; }

    // 1. Update local state immediately (optimistic)
    updateDomain('health', updated);
    addRecords('health', [record]);
    setForm({ sleep: '', mood: '', stress: '', workout: '', water: '', calories: '', weight: '', bmi: '' });
    showToast(`Health data saved (${changes} field${changes > 1 ? 's' : ''})`, 'success');

    // 2. Persist to backend (non-blocking for real users)
    if (healthApi.isEnabled()) {
      try {
        await healthApi.create(record);
      } catch (err) {
        if (err.message !== 'NOT_AUTHENTICATED' && err.message !== 'UNAUTHORIZED') {
          console.warn('Health: backend save failed:', err.message);
        }
      }
    }
  };

  const handleApplyCalories = (calories) => {
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

    return recs.sort((a, b) => a.priority - b.priority);
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
    { label: 'Sleep Quality',    score: Math.round(Math.min(100, (h.sleepAvg / 8) * 100)),                    icon: '😴', color: '#8b5cf6' },
    { label: 'Stress Level',     score: Math.round(Math.max(0, (10 - h.stressLevel) / 10 * 100)),             icon: '😰', color: '#f43f5e' },
    { label: 'Mood',             score: Math.round((h.moodAvg / 10) * 100),                                   icon: '😊', color: '#f59e0b' },
    { label: 'Physical Activity',score: Math.round(Math.min(100, (h.workoutsPerWeek / 5) * 100)),             icon: '💪', color: '#10b981' },
    { label: 'Hydration',        score: Math.round(Math.min(100, (h.waterIntake / 8) * 100)),                 icon: '💧', color: '#06b6d4' },
    { label: 'Nutrition',        score: nutritionScore,                                                        icon: '🥗', color: '#f97316' },
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
            <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                  <svg viewBox="0 0 120 120" width="120" height="120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"/>
                    <circle cx="60" cy="60" r="48" fill="none"
                      stroke={score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e'}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${2*Math.PI*48} ${2*Math.PI*48}`}
                      strokeDashoffset={2*Math.PI*48*(1-score/100)}
                      style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px', transition:'stroke-dashoffset 1.2s ease' }}/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>/ 100</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, margin: '0 0 12px' }}>Health Score</p>
                  <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999, marginBottom: 12,
                    background: (score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e')+'18',
                    color: score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e',
                    border: `1px solid ${score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e'}44` }}>
                    {score >= 70 ? 'Good' : score >= 45 ? 'Average' : 'Low'}
                  </span>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                    {score >= 45 ? 'Keep maintaining your\nhealthy habits.' : 'Focus on sleep and\nreduce stress.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setTab('recommendations')}
                style={{ marginTop: 32, padding: '8px 16px', borderRadius: 8,
                  border: `1px solid ${score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e'}44`,
                  background: (score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e')+'0f',
                  color: score>=70?'#22c55e':score>=45?'#f59e0b':'#f43f5e',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
                View Insights →
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

            {/* Today's Plan */}
            <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#a1a1aa" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f3' }}>Today's Plan</span>
                </div>
                <span style={{ fontSize: 12, color: '#71717a' }}>3 / 4 completed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { text: 'Drink 8 glasses of water', time: '7:30 AM', done: true },
                  { text: '30 min workout',           time: '8:00 AM', done: true },
                  { text: 'Eat a healthy meal',       time: '1:00 PM', done: true },
                  { text: 'Meditate for 10 min',      time: '9:30 PM', done: false },
                ].map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.done
                        ? <CheckCircle size={14} color="#22c55e" />
                        : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #52525b' }} />}
                      <span style={{ fontSize: 13, color: task.done ? '#f0f0f3' : '#a1a1aa' }}>{task.text}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#71717a' }}>{task.time}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                <button style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                  View full plan →
                </button>
              </div>
            </div>

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
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="mood"  stroke="#22c55e" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="sleep" stroke="#a78bfa" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Area type="monotone" dataKey="water" stroke="#3b82f6" fill="transparent" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Row 3: AI Health Coach ── */}
          <div style={{ background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa' }}>
                <Brain size={20} />
              </div>
              <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f3', margin: '0 0 4px' }}>AI Health Coach</p>
                <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.5, margin: 0 }}>
                  Your stress levels are slightly elevated in the evenings. Try a 10-minute breathing exercise before bed to improve sleep quality and recovery.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <button style={{ padding: '6px 12px', borderRadius: 8, background: '#2e1065', color: '#d8b4fe', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Start Breathing Exercise →
                  </button>
                  <button style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    💡 More tips
                  </button>
                </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* ── Title ── */}
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f3', margin: '0 0 2px 0' }}>Log Today's Health Data</h2>

          {/* ── Streak / entries / scan banner ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)',
            borderRadius: 8, padding: '5px 10px',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔥</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#f97316', whiteSpace: 'nowrap' }}>
                {streak > 0 ? `${streak}-Day Logging Streak!` : 'Start Your Streak!'}
              </p>
              <p style={{ margin: 0, fontSize: 9.5, color: 'rgba(249,115,22,0.6)' }}>
                Keep it up — consistency is everything.
              </p>
            </div>
            <span style={{ fontSize: 9.5, color: 'rgba(249,115,22,0.55)', fontFamily: 'monospace', flexShrink: 0, marginRight: 6 }}>
              {healthRecords.length} entries
            </span>
            <button
              onClick={() => setTab('scan')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: 6, padding: '4px 8px', color: '#c4b5fd',
                fontSize: 9.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <Eye size={10} /> Scan with AI Vision
            </button>
          </div>

          {/* ── Input Grid ── */}
          <form onSubmit={handleLog}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {[
                { key: 'sleep',    label: 'Sleep (hours)',       placeholder: '7.5',  icon: '🌙', iconBg: '#4f46e5', step: '0.5', min: 0,  max: 14 },
                { key: 'mood',     label: 'Mood (1–10)',          placeholder: '7',    icon: '😊', iconBg: '#d97706', step: '1',   min: 1,  max: 10 },
                { key: 'stress',   label: 'Stress (1–10)',        placeholder: '4',    icon: '💗', iconBg: '#dc2626', step: '1',   min: 1,  max: 10 },
                { key: 'workout',  label: 'Workouts this week',  placeholder: '3',    icon: '💪', iconBg: '#16a34a', step: '1',   min: 0,  max: 14 },
                { key: 'water',    label: 'Water (glasses)',      placeholder: '8',    icon: '💧', iconBg: '#0284c7', step: '1',   min: 0,  max: 20 },
                { key: 'calories', label: 'Calories (kcal)',      placeholder: '2200', icon: '🔥', iconBg: '#ea580c', step: '1',   min: 0 },
                { key: 'weight',   label: 'Body Weight (kg)',     placeholder: '70',   icon: '⚖️', iconBg: '#7c3aed', step: '0.1', min: 20, max: 300 },
                { key: 'bmi',      label: 'BMI',                  placeholder: '22.5', icon: '🧍', iconBg: '#0f766e', step: '0.1', min: 10, max: 50 },
              ].map(f => (
                <div key={f.key} style={{
                  background: 'linear-gradient(135deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8, padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: 0,
                }}>
                  {/* Icon + label row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      background: f.iconBg + '25', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, flexShrink: 0,
                    }}>{f.icon}</div>
                    <label style={{ fontSize: 9.5, color: '#9ca3af', fontWeight: 500, lineHeight: 1 }}>{f.label}</label>
                  </div>
                  {/* Thin separator */}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 3 }} />
                  {/* Value input */}
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      outline: 'none', color: '#f0f0f3', fontSize: 13, fontWeight: 700,
                      fontFamily: 'inherit', padding: 0, boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* ── Save Footer ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 6, padding: '5px 2px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                🔒 Encrypted
              </span>
              <button type="submit" style={{
                background: 'rgba(139,92,246,0.9)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '5px 12px', fontSize: 10.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                boxShadow: '0 3px 10px rgba(139,92,246,0.3)',
              }}>
                🗂️ Save Health Data
              </button>
            </div>
          </form>

          {/* ── Recent Log History ── */}
          {recentLogs.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8, padding: '5px 10px', marginTop: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#f0f0f3' }}>Recent Log History</h3>
                <button style={{ background: 'none', border: 'none', fontSize: 10, color: '#8b5cf6', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔄 View All History
                </button>
              </div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '75px 1fr', paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
                <span style={{ fontSize: 9, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Summary</span>
              </div>
              <div style={{ maxHeight: 72, overflowY: 'auto', paddingRight: 4 }}>
                {recentLogs.map((entry, i) => {
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
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      style={{
                        display: 'grid', gridTemplateColumns: '75px 1fr',
                        padding: '4px 0', borderBottom: i < recentLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontSize: 10, color: '#d1d5db' }}>
                        {parts.join(' • ')}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}


      {tab === 'scan' && (
        <ScanVisionPanel onApplyCalories={handleApplyCalories} />
      )}

      {tab === 'nutrition' && (
        <NutritionPanel healthData={health} updateDomain={updateDomain} />
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
                      <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500, width: 110, flexShrink: 0 }}>{wf.label}</span>
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
    </div>
  );
}
