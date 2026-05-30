import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../components/ui/Components';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { analyzeDocument, hasApiKey, saveApiKey, getDemoMealResult } from '../services/visionService';
import { authFetch } from '../services/backendApi';
import { Upload as UploadIcon, FileText, X, Key, CheckCircle, Scan, ShieldCheck, ChevronRight, Clock, Link as LinkIcon } from 'lucide-react';
import { SiGithub, SiLeetcode, SiNotion, SiRazorpay, SiGooglefit, SiGooglecalendar } from 'react-icons/si';

const CARD = { background:'rgba(15,20,35,0.98)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 };

const fileTypes = [
  { type: 'csv', label: 'CSV Spreadsheet', icon: '📊', desc: 'Import expense reports, health logs, study hours', accept: '.csv' },
  { type: 'xlsx', label: 'Excel Workbook', icon: '📗', desc: 'Import financial statements, course records', accept: '.xlsx,.xls' },
  { type: 'pdf', label: 'PDF Document', icon: '📄', desc: 'Import bank statements, medical reports, resumes', accept: '.pdf' },
  { type: 'json', label: 'JSON Data', icon: '🔧', desc: 'Import from other fitness/finance apps', accept: '.json' },
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
  const [showFormats, setShowFormats] = useState(true);
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
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#8250df]/10 border border-[#8250df]/20 flex items-center justify-center">
            <Scan size={22} className="text-[#b392f0]" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#f0f0f3]">Smart Document Scanner</h3>
            <p className="text-[13px] text-[#8b949e]">Scan salary slips, bills, hospital reports and more</p>
          </div>
        </div>
        <button
          onClick={() => setShowFormats(p => !p)}
          className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-xl border border-[#30363d] bg-[#21262d] text-[#c9d1d9] font-medium transition-colors hover:text-white hover:bg-[#30363d]"
        >
          See supported formats <span className="text-[10px] ml-1">{showFormats ? '▼' : '▶'}</span>
        </button>
      </div>

      {/* Supported doc types row */}
      {showFormats && (
        <div className="flex flex-wrap gap-2.5 mb-6">
          {Object.entries(DOC_TYPES).filter(([k]) => k !== 'unknown').map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[12px] px-3.5 py-1.5 rounded-full bg-[#21262d] border border-[#30363d] text-[#c9d1d9] font-medium">
              <span>{v.icon}</span> {v.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[12px] px-3.5 py-1.5 rounded-full bg-[#21262d] border border-[#30363d] text-[#c9d1d9] font-medium">+ More</span>
        </div>
      )}

      <AnimatePresence>
        {showKeyPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] space-y-3">
              <p className="text-[12px] text-[#8b949e]">Enter your Groq API key from <span className="text-amber-400 font-medium">console.groq.com</span></p>
              <div className="flex gap-2">
                <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveKey()} placeholder="gsk_..." className="input-premium flex-1 font-mono text-[13px]" />
                <button onClick={handleSaveKey} disabled={!keyInput.trim()} className="px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[13px] font-medium disabled:opacity-40 transition-all hover:bg-amber-500/30">Save</button>
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
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden bg-[#0d1117] flex flex-col items-center justify-center ${preview ? 'border-[#30363d] cursor-default' : `cursor-pointer ${dragOver ? 'border-[#8250df] bg-[#8250df]/[0.04]' : 'border-[#30363d] hover:border-[#8b949e]'}`}`}
        style={{ minHeight: preview ? 'auto' : '220px' }}
      >
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ''; }} />

        {!preview ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-14 h-14 rounded-full bg-[#161b22] border border-[#30363d] shadow-lg shadow-indigo-500/10 flex items-center justify-center">
              <UploadIcon size={24} className="text-[#b392f0]" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-[#f0f0f3]">Drop document image here or click to browse</p>
              <p className="text-[13px] text-[#8b949e] mt-1.5">Take a photo on mobile • Salary slips, bills, lab reports & more</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            <img src={preview} alt="document" className="w-full max-h-[300px] object-contain rounded-2xl" />
            {scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(8px)' }}>
                <div className="w-12 h-12 rounded-full border-4 border-[#8250df] border-t-transparent animate-spin" />
                <p className="text-[14px] text-[#f0f0f3] font-bold mt-2">Reading document with AI…</p>
              </div>
            )}
            {!scanning && (
              <button onClick={e => { e.stopPropagation(); reset(); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#161b22] border border-[#30363d] shadow-lg flex items-center justify-center hover:bg-[#30363d] transition-colors">
                <X size={14} className="text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-[13px] text-red-400 font-medium">
          {error}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="mt-6 space-y-4">
            {isDemo && (
              <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center gap-3">
                <span className="text-amber-400 text-lg">⚠️</span>
                <p className="text-[12px] text-amber-300"><span className="font-bold text-[13px]">Demo mode</span> — API quota exceeded. Get a free key at console.groq.com</p>
              </div>
            )}

            {/* Doc type header */}
            <div className="flex items-center justify-between p-5 rounded-2xl border border-[#30363d] bg-[#0d1117]">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{meta.icon}</span>
                <div>
                  <p className="text-[15px] font-bold text-[#f0f0f3]">{meta.label} Detected</p>
                  <p className="text-[13px] text-[#8b949e] mt-0.5">{result.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[12px] px-3 py-1 rounded-lg font-bold border" style={{ color: meta.color, background: `${meta.color}15`, borderColor: `${meta.color}30` }}>
                  {result.confidence}% confident
                </span>
              </div>
            </div>

            {/* Extracted fields */}
            <div className="grid sm:grid-cols-2 gap-3">
              {result.fields?.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#30363d] bg-[#0d1117]">
                  <span className="text-[12px] text-[#8b949e] font-semibold">{f.label}</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: categoryColor(f.category) }}>{f.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Log button */}
            {result.logTo !== 'none' && result.autoFill && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#30363d]">
                <button
                  onClick={() => { onLogData(result); reset(); }}
                  className="flex-1 px-5 py-3 rounded-xl border text-[14px] font-bold shadow-lg transition-all hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}15)`, borderColor: `${meta.color}40`, color: meta.color }}
                >
                  {meta.logLabel}
                </button>
                <button onClick={() => fileRef.current?.click()} className="flex-1 px-5 py-3 rounded-xl border border-[#30363d] bg-[#21262d] text-[14px] font-bold text-[#c9d1d9] hover:text-white hover:bg-[#30363d] transition-colors">
                  Scan Another
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Upload() {
  const { user, token } = useAuth();
  const { health, finance, career, timeline, goals, setUserData, updateDomain } = useData();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importHistory, setImportHistory] = useState([]);

  const fetchHistory = async () => {
    if (!user || !token) return;
    try {
      const res = await authFetch('/uploads/history');
      setImportHistory(res);
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
      const history = await authFetch('/uploads', {
        method: 'POST',
        body: formData,
      });
      
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
      const records = await authFetch(`/records/${preview.domain}/import/${preview.id}`);
      
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

  const sCard = CARD;

  const FILE_FORMATS = [
    { type:'csv',  icon:'📊', iconBg:'rgba(16,185,129,0.15)',  label:'CSV Spreadsheet', desc:'Import expense reports, health logs, study hours',         accept:'.csv' },
    { type:'xlsx', icon:'📗', iconBg:'rgba(16,185,129,0.15)',  label:'Excel Workbook',  desc:'Import financial statements, course records',              accept:'.xlsx,.xls' },
    { type:'pdf',  icon:'📄', iconBg:'rgba(239,68,68,0.15)',   label:'PDF Document',    desc:'Import bank statements, medical reports, resumes',         accept:'.pdf' },
    { type:'json', icon:'</>',iconBg:'rgba(99,102,241,0.15)',  label:'JSON Data',        desc:'Import from other fitness/finance apps',                   accept:'.json' },
  ];

  return (
    <div className="w-full max-w-[1200px] mx-auto min-h-screen pb-20 pt-6 px-4 sm:px-8 flex flex-col gap-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
          <UploadIcon size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-[#f0f0f3] leading-tight">Data Import Center</h1>
          <p className="text-[14px] text-[#8b949e] mt-1">Upload files or connect apps to feed your Digital Twin with real data.</p>
        </div>
      </div>



      {/* ── Smart Document Scanner ── */}
      <SmartDocScanner onLogData={handleDocLog} />

      {/* ── Upload File ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#58a6ff]/10 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-[#58a6ff]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#f0f0f3]">Upload File</p>
              <p className="text-[13px] text-[#8b949e] mt-0.5">Supports CSV, Excel, PDF, JSON & more</p>
            </div>
          </div>
          <button onClick={() => document.getElementById('file-input-main').click()}
            className="px-5 py-2.5 rounded-xl border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#f0f0f3] text-[13px] font-bold transition-colors">
            Browse files
          </button>
        </div>
        <input id="file-input-main" type="file" className="hidden" accept=".csv,.xlsx,.xls,.pdf,.json"
          onChange={e => handleFile(e.target.files[0])} />

        {/* Format cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {FILE_FORMATS.map(ft => (
            <div key={ft.type}
              className="flex items-center gap-4 p-4 rounded-xl bg-[#0d1117] border border-[#30363d] hover:border-[#8b949e] cursor-pointer transition-colors group"
              onClick={() => document.getElementById('file-input-main').click()}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-[20px]" style={{ background: ft.iconBg }}>
                {ft.type === 'json' ? <span className="text-[#8250df] font-bold text-[15px]">{'</>'}</span> : ft.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#f0f0f3] mb-0.5 truncate">{ft.label}</p>
                <p className="text-[12px] text-[#8b949e] leading-snug line-clamp-2">{ft.desc}</p>
              </div>
              <ChevronRight size={18} className="text-[#8b949e] group-hover:text-[#f0f0f3] flex-shrink-0 transition-colors" />
            </div>
          ))}
        </div>

        {uploading && (
          <div className="flex items-center gap-3 mt-5 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <p className="text-[13px] font-medium text-indigo-300">Parsing {uploadedFile?.name}...</p>
          </div>
        )}
      </div>

      {/* ── File Preview ── */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}>
            <div className="bg-[#161b22] p-6 rounded-2xl border border-indigo-500/30">
              <p className="text-[16px] font-bold text-[#f0f0f3] mb-5">📋 Preview: {preview.name}</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[['Records Found', preview.records, 'text-blue-400'],['Columns', preview.columns.length, 'text-purple-400'],['File Size', preview.size, 'text-emerald-400']].map(([l,v,c]) => (
                  <div key={l} className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-center">
                    <p className={`text-[20px] font-bold mb-1 ${c}`}>{v}</p>
                    <p className="text-[12px] text-[#8b949e] font-medium">{l}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto mb-6 rounded-xl border border-[#30363d]">
                {preview.sampleRows?.length > 0 ? (
                  <table className="w-full text-left border-collapse bg-[#0d1117]">
                    <thead>
                      <tr className="border-b border-[#30363d]">
                        {Object.keys(preview.sampleRows[0]).map(col => (
                          <th key={col} className="p-3 text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]">
                      {preview.sampleRows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="p-3 text-[13px] text-[#c9d1d9] truncate max-w-[200px]">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-[13px] text-[#8b949e] text-center p-6 bg-[#0d1117]">No readable data found.</p>}
              </div>
              <div className="flex gap-4">
                <button disabled={importing||uploading} onClick={confirmImport}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-[14px] font-bold disabled:opacity-50 transition-all">
                  Import {preview.records} Records ✓
                </button>
                <button disabled={importing||uploading} onClick={() => { setPreview(null); setUploadedFile(null); }}
                  className="px-6 py-3 rounded-xl border border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:text-white hover:bg-[#30363d] text-[14px] font-bold transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import History ── */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0 text-[#8b949e]">
            <Clock size={20} />
          </div>
          <p className="text-[16px] font-bold text-[#f0f0f3]">Import History</p>
        </div>
        {importHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="w-16 h-16 opacity-40">
               <span className="text-[64px]">📦</span>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-bold text-[#f0f0f3]">No data imported yet</p>
              <p className="text-[14px] text-[#8b949e] mt-1.5">Start importing your data to build your Digital Twin</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {importHistory.map((h, i) => (
              <motion.div key={h.id || i} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                <span className="text-[24px]">{h.fileType==='csv'?'📊':h.fileType==='xlsx'?'📗':'📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#f0f0f3] mb-1 truncate">{h.originalFilename||h.file}</p>
                  <p className="text-[12px] text-[#8b949e] font-medium">
                    {h.uploadedAt ? new Date(h.uploadedAt).toLocaleDateString() : h.date} • {h.recordCount||h.records} records
                    {h.detectedDomain && <span className="ml-2 px-2 py-0.5 rounded-md bg-[#21262d] border border-[#30363d] text-[10px] uppercase">{h.detectedDomain}</span>}
                  </p>
                </div>
                <span className={`text-[11px] px-3 py-1 rounded-full font-bold flex-shrink-0 ${h.status?.toLowerCase()==='success' ? 'bg-[#56d364]/10 text-[#56d364] border border-[#56d364]/20' : 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'}`}>
                  {h.status?.toLowerCase()==='success' ? '✓ Imported' : `⚠ ${h.status}`}
                </span>
                <button onClick={async () => { if (h.id) { await authFetch(`/uploads/${h.id}`,{method:'DELETE'}); fetchHistory(); showToast('Import deleted','info'); }}}
                  className="text-[12px] text-[#f87171] opacity-60 hover:opacity-100 font-medium transition-opacity px-2">
                  Delete
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
