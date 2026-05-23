import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, PageHeader, SecurityBadge, showToast } from '../components/ui/Components';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { analyzeDocument, hasApiKey, saveApiKey, getDemoMealResult } from '../services/visionService';
import { Upload as UploadIcon, FileText, X, Key, CheckCircle, Scan } from 'lucide-react';

const fileTypes = [
  { type: 'csv', label: 'CSV Spreadsheet', icon: '📊', desc: 'Import expense reports, health logs, study hours', accept: '.csv' },
  { type: 'xlsx', label: 'Excel Workbook', icon: '📗', desc: 'Import financial statements, course records', accept: '.xlsx,.xls' },
  { type: 'pdf', label: 'PDF Document', icon: '📄', desc: 'Import bank statements, medical reports, resumes', accept: '.pdf' },
  { type: 'json', label: 'JSON Data', icon: '🔧', desc: 'Import from other fitness/finance apps', accept: '.json' },
];

const mockApiSources = [
  { name: 'Google Fit', icon: '❤️', connected: false, desc: 'Sync steps, heart rate, workouts, sleep data' },
  { name: 'Razorpay / UPI', icon: '💳', connected: false, desc: 'Sync transaction history and spending patterns' },
  { name: 'GitHub', icon: '💻', connected: false, desc: 'Sync coding activity, contributions, repositories' },
  { name: 'LeetCode', icon: '🧩', connected: false, desc: 'Sync DSA practice stats and problem-solving history' },
  { name: 'Google Calendar', icon: '📅', connected: false, desc: 'Sync study schedules, deadlines, productivity blocks' },
  { name: 'Notion / Todoist', icon: '📝', connected: false, desc: 'Sync task completion, goal tracking, productivity' },
];

const DOC_TYPES = {
  salary_slip:    { label: 'Salary Slip',      icon: '💰', color: '#10b981', logLabel: 'Log income to Finance' },
  hospital_bill:  { label: 'Hospital Bill',    icon: '🏥', color: '#ef4444', logLabel: 'Log medical expense to Finance' },
  lab_report:     { label: 'Lab Report',       icon: '🧪', color: '#8b5cf6', logLabel: 'Log health markers' },
  utility_bill:   { label: 'Utility Bill',     icon: '⚡', color: '#f59e0b', logLabel: 'Log expense to Finance' },
  bank_statement: { label: 'Bank Statement',   icon: '🏦', color: '#06b6d4', logLabel: 'Log transactions to Finance' },
  invoice:        { label: 'Invoice',          icon: '🧾', color: '#f97316', logLabel: 'Log expense to Finance' },
  unknown:        { label: 'Document',         icon: '📄', color: '#71717a', logLabel: 'Review extracted data' },
};

const DEMO_DOCS = {
  salary_slip: { docType:'salary_slip', confidence:91, summary:'Salary slip for April 2024 from TechCorp Pvt Ltd', fields:[{label:'Employer',value:'TechCorp Pvt Ltd',category:'employer'},{label:'Employee',value:'Demo User',category:'employee'},{label:'Month',value:'April 2024',category:'period'},{label:'Gross Salary',value:'₹72,000',category:'income'},{label:'Net Salary',value:'₹61,500',category:'income'},{label:'PF Deduction',value:'₹5,400',category:'deduction'},{label:'TDS',value:'₹5,100',category:'deduction'}], logTo:'finance', autoFill:{income:61500} },
  hospital_bill: { docType:'hospital_bill', confidence:89, summary:'Hospital bill of ₹6,800 from City Hospital dated 10 Apr 2024', fields:[{label:'Hospital',value:'City Hospital',category:'provider'},{label:'Patient',value:'Demo User',category:'patient'},{label:'Date',value:'10 Apr 2024',category:'date'},{label:'Diagnosis',value:'Viral Fever',category:'medical'},{label:'Consultation',value:'₹800',category:'amount'},{label:'Medicines',value:'₹2,000',category:'amount'},{label:'Total',value:'₹6,800',category:'amount'}], logTo:'finance', autoFill:{expenses:6800,expenseCategory:'medical'} },
};

function SmartDocScanner({ onLogData }) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const fileRef = useRef(null);

  const keyConfigured = !!(apiKey || import.meta.env.VITE_GROQ_API_KEY);

  const handleSaveKey = () => {
    const k = keyInput.trim();
    saveApiKey(k);
    setApiKey(k);
    setKeyInput('');
    setShowKeyPanel(false);
    showToast('API key saved', 'success');
  };

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please upload an image of the document (PNG, JPG, WEBP)', 'error');
      return;
    }
    setError(null);
    setResult(null);
    setIsDemo(false);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const data = await analyzeDocument(file);
      setResult(data);
    } catch (err) {
      if (err.message === 'QUOTA_EXCEEDED') {
        setIsDemo(true);
        setResult(DEMO_DOCS.salary_slip);
      } else {
        setError(err.message);
        if (err.message.includes('API key')) setShowKeyPanel(true);
      }
    } finally {
      setScanning(false);
    }
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const reset = () => { setPreview(null); setResult(null); setError(null); setIsDemo(false); };

  const meta = result ? (DOC_TYPES[result.docType] || DOC_TYPES.unknown) : null;

  const categoryColor = (cat) => {
    if (cat === 'income') return '#10b981';
    if (cat === 'deduction' || cat === 'amount') return '#f97316';
    if (cat === 'medical') return '#ef4444';
    return '#a1a1aa';
  };

  return (
    <GlassCard className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Scan size={18} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#f0f0f3]">Smart Document Scanner</h3>
            <p className="text-[12px] text-[#71717a]">Scan salary slips, hospital bills, lab reports & more</p>
          </div>
        </div>
        <button
          onClick={() => setShowKeyPanel(p => !p)}
          className={`flex items-center gap-2 text-[12px] px-3.5 py-2 rounded-xl border transition-all font-medium ${keyConfigured ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
        >
          {keyConfigured ? <CheckCircle size={13} /> : <Key size={13} />}
          {keyConfigured ? 'AI Ready' : 'Set Groq Key'}
        </button>
      </div>

      {/* Supported doc types row */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(DOC_TYPES).filter(([k]) => k !== 'unknown').map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#71717a] font-medium">
            <span>{v.icon}</span>{v.label}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {showKeyPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mb-5 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] space-y-3">
              <p className="text-[11px] text-[#71717a]">Enter your Groq API key from <span className="text-amber-400 font-medium">console.groq.com</span></p>
              <div className="flex gap-2">
                <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveKey()} placeholder="gsk_..." className="input-premium flex-1 font-mono text-[12px]" />
                <button onClick={handleSaveKey} disabled={!keyInput.trim()} className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[12px] font-medium disabled:opacity-40 transition-all">Save</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${preview ? 'border-white/[0.06] cursor-default' : `cursor-pointer hover:border-white/[0.14] ${dragOver ? 'border-violet-500/50 bg-violet-500/[0.04]' : 'border-white/[0.08] bg-white/[0.02]'}`}`}
        style={{ minHeight: preview ? 'auto' : '160px' }}
      >
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ''; }} />

        {!preview ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <FileText size={20} className="text-[#52525b]" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-[#a1a1aa]">Drop document image here or click to browse</p>
              <p className="text-[11px] text-[#52525b] mt-1">Take a photo on mobile · Salary slips, bills, lab reports</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="document" className="w-full max-h-64 object-contain rounded-2xl" />
            {scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(8px)' }}>
                <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                <p className="text-[13px] text-violet-300 font-medium">Reading document with AI…</p>
              </div>
            )}
            {!scanning && (
              <button onClick={e => { e.stopPropagation(); reset(); }} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-black/80 transition-all">
                <X size={12} className="text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-[12px] text-red-400">
          {error}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="mt-5 space-y-4">
            {isDemo && (
              <div className="px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-2.5">
                <span className="text-amber-400 text-sm">⚠️</span>
                <p className="text-[11px] text-amber-300"><span className="font-semibold">Demo mode</span> — API quota exceeded. Get a free key at console.groq.com</p>
              </div>
            )}

            {/* Doc type header */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold text-[#f0f0f3]">{meta.label} Detected</p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">{result.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ color: meta.color, background: `${meta.color}15` }}>
                  {result.confidence}% confident
                </span>
              </div>
            </div>

            {/* Extracted fields */}
            <div className="grid sm:grid-cols-2 gap-2.5">
              {result.fields?.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <span className="text-[11px] text-[#71717a] font-medium">{f.label}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: categoryColor(f.category) }}>{f.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Log button */}
            {result.logTo !== 'none' && result.autoFill && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => { onLogData(result); reset(); }}
                  className="btn-primary flex-1"
                  style={{ background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}15)`, borderColor: `${meta.color}40`, color: meta.color }}
                >
                  {meta.logLabel}
                </button>
                <button onClick={() => fileRef.current?.click()} className="flex-1 px-5 py-2.5 rounded-xl border border-white/[0.08] text-[13px] font-medium text-[#a1a1aa] hover:text-[#f0f0f3] hover:border-white/[0.14] transition-all">
                  Scan Another
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default function Upload() {
  const { user, token } = useAuth();
  const { health, finance, career, timeline, goals, setUserData, updateDomain } = useData();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [connectedApis, setConnectedApis] = useState(new Set());
  const [importHistory, setImportHistory] = useState([]);
  const [githubModal, setGithubModal] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');

  const fetchHistory = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/uploads/history`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        setImportHistory(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, token]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadedFile(file);
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    // userId is now extracted securely from the JWT token on the backend

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/uploads`, {
        method: 'POST',
        headers: { 'Authorization': token },
        body: formData,
      });
      
      if (!res.ok) throw new Error(await res.text());
      const history = await res.json();
      
      const sampleRows = history.sampleData ? JSON.parse(history.sampleData) : [];
      const columns = history.columnHeaders ? JSON.parse(history.columnHeaders) : [];

      setPreview({
        id: history.id,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.name.split('.').pop().toUpperCase(),
        records: history.recordCount,
        valid: history.validCount,
        domain: history.detectedDomain,
        columns: columns,
        sampleRows: sampleRows
      });
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const [importing, setImporting] = useState(false);

  const confirmImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      showToast(`Fetching ${preview.valid} records from ${preview.name}...`, 'info');
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/records/${preview.domain}/import/${preview.id}`, {
        headers: { 'Authorization': token }
      });
      if (!res.ok) throw new Error("Failed to fetch parsed records.");
      const records = await res.json();
      
      let newTimeline = [...timeline];
      let newHealth = { ...health };
      let newFinance = { ...finance };
      let newCareer = { ...career };

      if (preview.domain === 'health') {
        let totalSleep = 0, totalWorkouts = 0, totalStress = 0;
        records.forEach(r => {
          totalSleep += (r.sleepHours || 0);
          totalStress += (r.stressLevel || 0);
          totalWorkouts += (r.workoutMinutes > 0 ? 1 : 0);
        });
        
        if (records.length > 0) {
          newHealth.sleepAvg = parseFloat(((newHealth.sleepAvg || 7) + (totalSleep / records.length)) / 2).toFixed(1);
          newHealth.stressLevel = Math.max(1, Math.floor(((newHealth.stressLevel || 5) + (totalStress / records.length)) / 2));
          newHealth.workoutsPerWeek = (newHealth.workoutsPerWeek || 0) + totalWorkouts;
        }
        
        newTimeline.unshift({ type: 'positive', domain: 'health', message: `Imported ${records.length} health logs`, date: new Date().toISOString() });
      } 
      else if (preview.domain === 'finance') {
        let expenses = 0, income = 0;
        records.forEach(r => {
          if (r.transactionType && r.transactionType.toLowerCase() === 'debit') expenses += (r.amount || 0);
          else if (r.transactionType && r.transactionType.toLowerCase() === 'credit') income += (r.amount || 0);
        });
        
        newFinance.expenses = (newFinance.expenses || 0) + expenses;
        newFinance.savings = (newFinance.savings || 0) + income - expenses;
        newTimeline.unshift({ type: expenses > income ? 'negative' : 'positive', domain: 'finance', message: `Imported ${records.length} transactions: -$${expenses}`, date: new Date().toISOString() });
      } 
      else if (preview.domain === 'career') {
        let newSkills = new Set(newCareer.skills || []);
        let addedProjects = 0;
        
        records.forEach(r => {
          if (r.extractedSkills) {
            r.extractedSkills.split(',').forEach(s => newSkills.add(s.trim()));
          }
          if (r.extractedProjects) addedProjects++;
          if (r.studyHours) newCareer.studyHoursDaily = parseFloat((((newCareer.studyHoursDaily || 0) + r.studyHours) / 2).toFixed(1));
          if (r.codingHours) newCareer.codingHoursDaily = parseFloat((((newCareer.codingHoursDaily || 0) + r.codingHours) / 2).toFixed(1));
          if (r.dsaProblems) newCareer.dsaPractice = (newCareer.dsaPractice || 0) + r.dsaProblems;
        });

        newCareer.skills = Array.from(newSkills);
        newCareer.projectsCompleted = (newCareer.projectsCompleted || 0) + addedProjects;
        newTimeline.unshift({ type: 'positive', domain: 'career', message: `Imported career records: Added skills and projects`, date: new Date().toISOString() });
      }

      setUserData({ health: newHealth, finance: newFinance, career: newCareer, timeline: newTimeline, goals: goals }, 'imported');
      
      setUploadedFile(null);
      setPreview(null);
      showToast('Dashboard successfully updated with live data!', 'success');
    } catch (err) {
      showToast('Failed to apply import: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
    fetchHistory(); // Refresh history table
  };

  const submitGithub = async (e) => {
    e.preventDefault();
    setGithubModal(false);
    if (!githubUsername) return;
    setImporting(true);
    try {
      showToast(`Syncing with GitHub...`, 'info');
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/sync/github?githubUsername=${githubUsername}`, { 
        method: 'POST',
        headers: { 'Authorization': token }
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setConnectedApis(prev => new Set(prev).add('GitHub'));
      showToast(`Synced ${data.repos} repos and ${data.commits} commits from GitHub!`, 'success');
      fetchHistory();
      
      setUserData({
        health,
        finance,
        career: { ...career, projectsCompleted: (career.projectsCompleted || 0) + Math.floor(data.repos / 2) },
        timeline: [{ type: 'positive', domain: 'career', message: `Synced GitHub: ${data.repos} repos`, date: new Date().toISOString() }, ...timeline],
        goals: goals
      }, 'imported');
    } catch (err) {
      showToast(`Failed to sync GitHub: ${err.message}`, 'error');
    } finally {
      setImporting(false);
      setGithubUsername('');
    }
  };

  const toggleApi = async (name) => {
    if (name === 'GitHub' && !connectedApis.has(name)) {
      if (importing) return;
      setGithubModal(true);
      return;
    }

    setConnectedApis(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); showToast(`Disconnected from ${name}`, 'info'); }
      else { next.add(name); showToast(`Connected to ${name}!`, 'success'); }
      return next;
    });
  };

  const handleDocLog = (result) => {
    const fill = result.autoFill || {};
    const type = result.docType;
    const label = DOC_TYPES[type]?.label || 'Document';

    if (result.logTo === 'finance' || result.logTo === 'both') {
      const updated = { ...finance };
      if (fill.income)   updated.income   = (Number(updated.income)   || 0) + Number(fill.income);
      if (fill.expenses) updated.expenses = (Number(updated.expenses) || 0) + Number(fill.expenses);
      updateDomain('finance', updated);
    }

    const summary = fill.income
      ? `+₹${Number(fill.income).toLocaleString()} income from ${label}`
      : fill.expenses
        ? `-₹${Number(fill.expenses).toLocaleString()} expense from ${label}`
        : `${label} scanned and logged`;

    showToast(summary, 'success');
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Data Import Center" subtitle="Upload files or connect apps to feed your Digital Twin with real data." icon="📂" />

      <SecurityBadge />

      {/* Smart Document Scanner */}
      <div className="mt-6">
        <SmartDocScanner onLogData={handleDocLog} />
      </div>

      {/* File Upload Zone */}
      <GlassCard className="mt-6 mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>📤 Upload File</h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20'}`}
          onClick={() => document.getElementById('file-input').click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-2 border-white/20 border-t-blue-500 rounded-full" />
              <p className="text-sm text-slate-400">Parsing {uploadedFile?.name}...</p>
            </div>
          ) : (
            <>
              <span className="text-4xl block mb-3">📁</span>
              <p className="text-sm text-slate-300 mb-1">Drop your file here or click to browse</p>
              <p className="text-xs text-slate-500">Supports CSV, Excel, PDF, JSON</p>
            </>
          )}
        </div>
        <input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls,.pdf,.json" onChange={e => handleFile(e.target.files[0])} />

        {/* Supported formats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {fileTypes.map(ft => (
            <div key={ft.type} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
              <span className="text-xl block mb-1">{ft.icon}</span>
              <p className="text-xs font-medium">{ft.label}</p>
              <p className="text-[9px] text-slate-500 mt-1">{ft.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* File Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard className="mb-6 glow-blue">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">📋 Preview: {preview.name}</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/[0.02] text-center">
                  <p className="text-lg font-bold text-blue-400">{preview.records}</p>
                  <p className="text-[10px] text-slate-500">Records Found</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] text-center">
                  <p className="text-lg font-bold text-purple-400">{preview.columns.length}</p>
                  <p className="text-[10px] text-slate-500">Columns</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] text-center">
                  <p className="text-lg font-bold text-emerald-400">{preview.size}</p>
                  <p className="text-[10px] text-slate-500">File Size</p>
                </div>
              </div>

              <div className="overflow-x-auto mb-4">
                {preview.sampleRows && preview.sampleRows.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {Object.keys(preview.sampleRows[0]).map(col => (
                          <th key={col} className="text-left py-2 px-3 text-slate-500 uppercase tracking-wider">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="py-2 px-3 text-slate-300">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">No readable data found in this file.</p>
                )}
              </div>

              <div className="flex gap-3">
                <button disabled={importing || uploading} onClick={confirmImport} className="btn-primary text-sm disabled:opacity-50">Import {preview.records} Records ✓</button>
                <button disabled={importing || uploading} onClick={() => { setPreview(null); setUploadedFile(null); }} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Connections */}
      <GlassCard className="mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>🔗 Connect Apps</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockApiSources.map(api => {
            const connected = connectedApis.has(api.name);
            return (
              <motion.div key={api.name} whileHover={{ scale: 1.01 }}
                className={`p-4 rounded-xl border transition-all ${connected ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{api.icon}</span>
                    <span className="text-sm font-medium">{api.name}</span>
                  </div>
                  {connected && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Connected</span>}
                </div>
                <p className="text-xs text-slate-500 mb-3">{api.desc}</p>
                <button onClick={() => toggleApi(api.name)}
                  className={`text-xs px-4 py-1.5 rounded-lg w-full transition-all ${connected ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}>
                  {connected ? 'Disconnect' : 'Connect'}
                </button>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {/* Import History */}
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>📜 Import History</h3>
        <div className="space-y-2">
          {importHistory.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No data imported yet.</p>
          ) : importHistory.map((h, i) => (
            <motion.div key={h.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] text-sm">
              <span className="text-lg">{h.fileType === 'csv' ? '📊' : h.fileType === 'xlsx' ? '📗' : '📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 truncate">{h.originalFilename || h.file}</p>
                <p className="text-[10px] text-slate-500">
                  {h.uploadedAt ? new Date(h.uploadedAt).toLocaleDateString() : h.date} • {h.recordCount || h.records} records 
                  {h.detectedDomain && <span className="ml-2 capitalize opacity-70">({h.detectedDomain})</span>}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${h.status === 'SUCCESS' || h.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {(h.status || '').toLowerCase() === 'success' ? '✓ Imported' : '⚠ ' + h.status}
              </span>
              <button 
                onClick={async () => {
                  if (h.id) {
                    await fetch(`${import.meta.env.VITE_API_BASE}/uploads/${h.id}`, { method: 'DELETE' });
                    fetchHistory();
                    showToast('Import deleted', 'info');
                  }
                }}
                className="text-[10px] text-red-400 opacity-50 hover:opacity-100 transition-opacity ml-2"
              >
                Delete
              </button>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* GitHub Sync Modal */}
      <AnimatePresence>
        {githubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setGithubModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
              <h3 className="text-xl font-bold mb-2">Connect GitHub</h3>
              <p className="text-xs text-slate-400 mb-6">Enter your username to sync coding activity and project history.</p>
              
              <form onSubmit={submitGithub}>
                <input 
                  type="text" 
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. torvalds"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 mb-4"
                  autoFocus
                  required
                />
                <button type="submit" className="w-full btn-primary py-3 rounded-xl text-sm font-medium">Sync Account</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
