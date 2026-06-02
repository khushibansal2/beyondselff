import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../components/ui/Components';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { analyzeDocument, saveApiKey } from '../services/visionService';
import { authFetch } from '../services/backendApi';

const DOC_TYPES = {
  salary_slip:    { label: 'Salary Slip',      icon: '💰', color: '#10b981', logLabel: 'Log income to Finance' },
  hospital_bill:  { label: 'Hospital Bill',    icon: '🏥', color: '#ef4444', logLabel: 'Log medical expense to Finance' },
  lab_report:     { label: 'Lab Report',       icon: '🧪', color: '#8b5cf6', logLabel: 'Log health markers' },
  utility_bill:   { label: 'Utility Bill',     icon: '⚡', color: '#f59e0b', logLabel: 'Log expense to Finance' },
  bank_statement: { label: 'Bank Statement',   icon: '🏦', color: '#8b5cf6', logLabel: 'Log transactions to Finance' },
  invoice:        { label: 'Invoice',          icon: '🧾', color: '#f97316', logLabel: 'Log expense to Finance' },
  unknown:        { label: 'Document',         icon: '📄', color: '#71717a', logLabel: 'Review extracted data' },
};

const DEMO_DOCS = {
  salary_slip: { docType:'salary_slip', confidence:91, summary:'Salary slip for April 2024 from TechCorp Pvt Ltd', fields:[{label:'Employer',value:'TechCorp Pvt Ltd',category:'employer'},{label:'Employee',value:'Demo User',category:'employee'},{label:'Month',value:'April 2024',category:'period'},{label:'Gross Salary',value:'₹72,000',category:'income'},{label:'Net Salary',value:'₹61,500',category:'income'},{label:'PF Deduction',value:'₹5,400',category:'deduction'},{label:'TDS',value:'₹5,100',category:'deduction'}], logTo:'finance', autoFill:{income:61500} },
  hospital_bill: { docType:'hospital_bill', confidence:89, summary:'Hospital bill of ₹6,800 from City Hospital dated 10 Apr 2024', fields:[{label:'Hospital',value:'City Hospital',category:'provider'},{label:'Patient',value:'Demo User',category:'patient'},{label:'Date',value:'10 Apr 2024',category:'date'},{label:'Diagnosis',value:'Viral Fever',category:'medical'},{label:'Consultation',value:'₹800',category:'amount'},{label:'Medicines',value:'₹2,000',category:'amount'},{label:'Total',value:'₹6,800',category:'amount'}], logTo:'finance', autoFill:{expenses:6800,expenseCategory:'medical'} },
};

/* ─── Cybernetic Corner Overlays ────────────────────────────────── */
function CyberCorners({ color = '#8b5cf6' }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, pointerEvents: 'none' }} />
    </>
  );
}

/* ─── Smart Doc Scanner Component ────────────────────────────────── */
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
    return '#94a3b8';
  };

  return (
    <div 
      className="glass-card" 
      style={{
        padding: 24, 
        borderRadius: 20, 
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13, 20, 35, 0.45)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CyberCorners color="rgba(139,92,246,0.3)" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 0 15px rgba(139,92,246,0.1)'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px rgba(139,92,246,0.4))' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', margin: '0 0 2px', letterSpacing: '-0.01em' }}>Smart Document Scanner</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Analyze physical bills, salary slips & medical reports using computer vision</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowKeyPanel(p => !p)}
              style={{
                fontSize: 11.5, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                background: showKeyPanel ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', 
                border: `1px solid ${showKeyPanel ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)'}`,
                color: showKeyPanel ? '#fbbf24' : '#94a3b8', fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              🔑 Groq Key
            </button>
            <button
              onClick={() => setShowFormats(p => !p)}
              className="cyber-button-cyan"
              style={{
                fontSize: 11.5, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Scan Types {showFormats ? '▼' : '▶'}
            </button>
          </div>
        </div>

        {showFormats && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
            {Object.entries(DOC_TYPES).filter(([k]) => k !== 'unknown').map(([k, v]) => (
              <span key={k} style={{
                fontSize: 11.5, padding: '5px 12px', borderRadius: 99,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s'
              }}>
                <span style={{ fontSize: 13 }}>{v.icon}</span> <span style={{ fontWeight: 600 }}>{v.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showKeyPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ 
              padding: 16, borderRadius: 14, border: '1px solid rgba(245,158,11,0.18)', 
              background: 'rgba(245,158,11,0.03)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <p style={{ fontSize: 12, color: '#fcd34d', margin: 0, fontWeight: 600 }}>Custom Groq API Key Setup</p>
              </div>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '0 0 4px', lineHeight: 1.4 }}>
                A custom key is required to scan files when the default quota is exceeded. Get one free from <strong>console.groq.com</strong>.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="password" 
                  value={keyInput} 
                  onChange={e => setKeyInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSaveKey()} 
                  placeholder="Paste your gsk_... key here" 
                  className="cyber-input"
                  style={{ flex: 1, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 12, fontFamily: 'monospace' }} 
                />
                <button 
                  onClick={handleSaveKey} 
                  disabled={!keyInput.trim()} 
                  style={{ 
                    padding: '0 18px', borderRadius: 10, border: 'none', 
                    background: keyInput.trim() ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)', 
                    color: keyInput.trim() ? '#0f172a' : '#475569', fontSize: 12, fontWeight: 700, cursor: keyInput.trim() ? 'pointer' : 'default',
                    transition: 'all 0.2s', boxShadow: keyInput.trim() ? '0 0 10px rgba(251,191,36,0.3)' : 'none'
                  }}
                >
                  Save Key
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cyber Drag Area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileRef.current?.click()}
        style={{
          borderRadius: 16, 
          border: `2px dashed ${dragOver ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`, 
          background: dragOver ? 'rgba(139,92,246,0.05)' : 'rgba(0,0,0,0.15)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          cursor: preview ? 'default' : 'pointer', 
          minHeight: preview ? 'auto' : 190, 
          position: 'relative', 
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
          boxShadow: dragOver ? 'inset 0 0 20px rgba(139,92,246,0.1)' : 'none'
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ''; }} />

        {!preview ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', background: 'rgba(139,92,246,0.04)',
              border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(139,92,246,0.05)', animation: 'float 4s ease-in-out infinite'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>Drag & Drop Document Image</p>
              <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '0 0 14px', lineHeight: 1.4 }}>Take a photo on mobile or upload high-contrast JPG, PNG, WEBP files</p>
              <span className="cyber-button-cyan" style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, fontWeight: 700, display: 'inline-block' }}>
                Browse Camera / File System
              </span>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', padding: 12, display: 'flex', justifyContent: 'center' }}>
            <img src={preview} alt="document preview" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block', borderRadius: 12 }} />
            
            {/* Visual sweeping laser line during scan */}
            {scanning && (
              <div style={{
                position: 'absolute',
                left: 12,
                right: 12,
                top: 12,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)',
                boxShadow: '0 0 15px #8b5cf6, 0 0 5px #8b5cf6',
                animation: 'scanline 2s linear infinite',
                zIndex: 10
              }} />
            )}

            {scanning && (
              <div style={{ position: 'absolute', inset: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(9,13,22,0.85)', backdropFilter: 'blur(4px)', borderRadius: 12 }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div>
                  <p style={{ fontSize: 13.5, color: '#f1f5f9', fontWeight: 800, margin: '0 0 3px', textAlign: 'center' }}>Scanning Quantum Ingestion Port...</p>
                  <p style={{ fontSize: 11, color: '#8b5cf6', margin: 0, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Extracting key value pairs</p>
                </div>
              </div>
            )}

            {!scanning && (
              <button 
                onClick={e => { e.stopPropagation(); reset(); }} 
                style={{ 
                  position: 'absolute', top: 20, right: 20, width: 30, height: 30, borderRadius: '50%', 
                  background: 'rgba(9,13,22,0.9)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(9,13,22,0.9)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#f87171', lineHeight: 1.4 }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Extraction Failure</strong>
          {error}
        </div>
      )}

      {/* Results View */}
      <AnimatePresence>
        {result && !scanning && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isDemo && (
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#fcd34d', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 800 }}>⚡ Cybernetic Demo Mode:</span> Groq API key quota reached. Demo sample rendered with mockup data values.
              </div>
            )}

            {/* Document Header */}
            <div 
              className="glass-card"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16,
                borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }}>{meta.icon}</span>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 850, color: '#f1f5f9', margin: '0 0 3px' }}>{meta.label} Ingested</h4>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 500 }}>{result.summary}</p>
                </div>
              </div>
              <span style={{
                fontSize: 10.5, padding: '4px 10px', borderRadius: 8, fontWeight: 700,
                background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35`,
                textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: `0 0 10px ${meta.color}10`
              }}>{result.confidence}% confidence</span>
            </div>

            {/* Extracted Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {result.fields?.map((f, i) => {
                const cColor = categoryColor(f.category);
                return (
                  <div 
                    key={i} 
                    className="glass-card" 
                    style={{
                      padding: '12px 16px', 
                      borderRadius: 12, 
                      border: '1px solid rgba(255,255,255,0.04)', 
                      background: 'rgba(9, 13, 22, 0.4)',
                      borderLeft: `3px solid ${cColor}`,
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{f.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cColor, textShadow: `0 0 8px ${cColor}20` }}>{f.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {result.logTo !== 'none' && result.autoFill && (
              <div style={{ display: 'flex', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => { onLogData(result); reset(); }}
                  style={{
                    flex: 2, padding: '12px 18px', borderRadius: 12, border: `1px solid ${meta.color}50`,
                    background: `linear-gradient(135deg, ${meta.color}25 0%, ${meta.color}08 100%)`,
                    color: meta.color, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: `0 0 15px ${meta.color}20`
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${meta.color}35 0%, ${meta.color}15 100%)`; e.currentTarget.style.boxShadow = `0 0 20px ${meta.color}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${meta.color}25 0%, ${meta.color}08 100%)`; e.currentTarget.style.boxShadow = `0 0 15px ${meta.color}20`; }}
                >
                  {meta.logLabel} ✓
                </button>
                <button 
                  onClick={() => fileRef.current?.click()} 
                  style={{ 
                    flex: 1, padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', 
                    background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
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

/* ─── Main Component ─────────────────────────────────────────────── */
export default function Upload() {
  const { user, token } = useAuth();
  const { health, finance, career, timeline, goals, setUserData, updateDomain } = useData();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [importing, setImporting] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);

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

    try {
      const history = await authFetch('/uploads', { method: 'POST', body: formData });
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
    fetchHistory();
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

  const FILE_FORMATS = [
    { type:'csv',  icon:'📊', iconBg:'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label:'CSV Spreadsheet', desc:'Import expense reports, health logs, study hours', accept:'.csv', hoverGlow: 'glass-card-glow-emerald' },
    { type:'xlsx', icon:'📗', iconBg:'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label:'Excel Workbook',  desc:'Import financial statements, course records', accept:'.xlsx,.xls', hoverGlow: 'glass-card-glow-emerald' },
    { type:'pdf',  icon:'📄', iconBg:'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label:'PDF Document',    desc:'Import bank statements, medical reports, resumes', accept:'.pdf', hoverGlow: 'glass-card-glow-rose' },
    { type:'json', icon:'⚙️', iconBg:'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', label:'JSON Data',        desc:'Import from other fitness/finance apps', accept:'.json', hoverGlow: 'glass-card-glow-indigo' },
  ];

  return (
    <div style={{ 
      padding: '28px 32px 80px', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #090d16 0%, #06090e 100%)', 
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* ── Custom Styled Animation Keyframes ────────────────────── */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); }
          50% { transform: translateY(260px); }
          100% { transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-light {
          0% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); opacity: 0.8; }
          50% { box-shadow: 0 0 12px rgba(16, 185, 129, 0.8); opacity: 1; }
          100% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.4); opacity: 0.8; }
        }
        @keyframes pulse-light-orange {
          0% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.4); opacity: 0.8; }
          50% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.8); opacity: 1; }
          100% { box-shadow: 0 0 4px rgba(245, 158, 11, 0.4); opacity: 0.8; }
        }
        .cyber-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
        }
        .glass-card {
          background: rgba(13, 20, 35, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card-glow-cyan:hover {
          border-color: rgba(139, 92, 246, 0.35) !important;
          box-shadow: 0 8px 32px 0 rgba(139, 92, 246, 0.08), 0 0 25px rgba(139, 92, 246, 0.12) !important;
          transform: translateY(-2px);
        }
        .glass-card-glow-indigo:hover {
          border-color: rgba(99, 102, 241, 0.35) !important;
          box-shadow: 0 8px 32px 0 rgba(99, 102, 241, 0.08), 0 0 25px rgba(99, 102, 241, 0.12) !important;
          transform: translateY(-2px);
        }
        .glass-card-glow-emerald:hover {
          border-color: rgba(16, 185, 129, 0.35) !important;
          box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.08), 0 0 25px rgba(16, 185, 129, 0.12) !important;
          transform: translateY(-2px);
        }
        .glass-card-glow-rose:hover {
          border-color: rgba(239, 68, 68, 0.35) !important;
          box-shadow: 0 8px 32px 0 rgba(239, 68, 68, 0.08), 0 0 25px rgba(239, 68, 68, 0.12) !important;
          transform: translateY(-2px);
        }
        .cyber-button-cyan {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.04) 100%);
          border: 1px solid rgba(139, 92, 246, 0.28);
          color: #22d3ee;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cyber-button-cyan:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.32) 0%, rgba(139, 92, 246, 0.08) 100%);
          border-color: #22d3ee;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
          transform: translateY(-1px);
        }
        .cyber-button-indigo {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.04) 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #818cf8;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cyber-button-indigo:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0.08) 100%);
          border-color: #818cf8;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
          transform: translateY(-1px);
        }
        .cyber-input {
          background: rgba(5, 8, 15, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          transition: all 0.2s ease;
        }
        .cyber-input:focus {
          border-color: rgba(139, 92, 246, 0.5) !important;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.3) !important;
          outline: none !important;
        }
        .preview-table::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .preview-table::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .preview-table::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .preview-table::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.3);
        }
      `}</style>

      {/* Cyber Grid & Glowing Ambient Blurs */}
      <div className="cyber-grid" style={{ position: 'absolute', inset: 0, opacity: 0.7, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 280, height: 280, background: 'rgba(99,102,241,0.08)', filter: 'blur(110px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '8%', width: 340, height: 340, background: 'rgba(139,92,246,0.06)', filter: 'blur(130px)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 0 15px rgba(99,102,241,0.1)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.4))' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 850, color: '#f1f5f9', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Data Import Center</h1>
          <p style={{ fontSize: 12.5, color: '#94a3b8', margin: 0 }}>Sync external profile, finance, carbon and health variables straight into your digital twin</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
        
        {/* Smart Document Scanner Section */}
        <SmartDocScanner onLogData={handleDocLog} />

        {/* Upload File Card */}
        <div 
          className="glass-card" 
          onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={e => { e.preventDefault(); setFileDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{
            padding: 24, 
            borderRadius: 20, 
            border: `1px solid ${fileDragOver ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
            background: fileDragOver ? 'rgba(99,102,241,0.03)' : 'rgba(13, 20, 35, 0.45)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <CyberCorners color="rgba(99,102,241,0.3)" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(56,166,255,0.06)', border: '1px solid rgba(56,166,255,0.2)'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: '0 0 2px' }}>Upload Structured File</h4>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Drag spreadsheet data here or browse storage</p>
              </div>
            </div>
            <button
              onClick={() => document.getElementById('file-input-main').click()}
              className="cyber-button-indigo"
              style={{
                fontSize: 11.5, padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Browse Storage
            </button>
            <input id="file-input-main" type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.xls,.pdf,.json" onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Formats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {FILE_FORMATS.map(ft => (
              <div
                key={ft.type} 
                onClick={() => document.getElementById('file-input-main').click()}
                className={`glass-card ${ft.hoverGlow}`}
                style={{
                  padding: 16, 
                  borderRadius: 14, 
                  border: '1px solid rgba(255,255,255,0.04)',
                  background: 'rgba(9, 13, 22, 0.4)', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 19, background: ft.iconBg, border: `1px solid ${ft.border}`, flexShrink: 0
                }}>{ft.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#cbd5e1', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ft.label}</p>
                  <p style={{ fontSize: 10.5, color: '#64748b', margin: 0, lineHeight: 1.3 }}>{ft.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(129,140,248,0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 12.5, color: '#818cf8', margin: 0, fontWeight: 700 }}>Extracting matrix and scanning column headers for {uploadedFile?.name}...</p>
            </div>
          )}
        </div>

        {/* File Preview */}
        <AnimatePresence>
          {preview && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div 
                className="glass-card"
                style={{
                  padding: 24, 
                  borderRadius: 20, 
                  border: '1px solid rgba(99,102,241,0.25)',
                  background: 'rgba(13, 20, 35, 0.45)',
                  position: 'relative'
                }}
              >
                <CyberCorners color="rgba(99,102,241,0.4)" />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📋</span> Schema Diagnostic: {preview.name}
                  </h3>
                  <span style={{
                    fontSize: 10.5, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
                    background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>{preview.type} Ingested</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  {[
                    { label: 'Ingested Records', val: preview.records, color: '#8b5cf6', glow: 'rgba(139,92,246,0.2)' },
                    { label: 'Mapped Columns', val: preview.columns.length, color: '#818cf8', glow: 'rgba(129,140,248,0.2)' },
                    { label: 'Payload Weight', val: preview.size, color: '#10b981', glow: 'rgba(16,185,129,0.2)' }
                  ].map(stat => (
                    <div key={stat.label} className="glass-card" style={{ padding: '16px 12px', borderRadius: 14, background: 'rgba(9, 13, 22, 0.5)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ fontSize: 24, fontWeight: 850, color: stat.color, margin: '0 0 3px', lineHeight: 1, textShadow: `0 0 10px ${stat.glow}` }}>{stat.val}</p>
                      <p style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div 
                  className="preview-table"
                  style={{ 
                    overflowX: 'auto', 
                    borderRadius: 14, 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    marginBottom: 20,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                >
                  {preview.sampleRows?.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(9, 13, 22, 0.3)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                          {Object.keys(preview.sampleRows[0]).map(col => (
                            <th key={col} style={{ padding: '12px 14px', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleRows.map((row, i) => (
                          <tr 
                            key={i} 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.03)', 
                              background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                          >
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ padding: '12px 14px', fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 180 }}>{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ fontSize: 12, color: '#64748b', padding: '24px 20px', margin: 0, textAlign: 'center' }}>No readable payload matrices found.</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    disabled={importing || uploading} 
                    onClick={confirmImport}
                    style={{
                      flex: 2, padding: 13, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff',
                      fontSize: 13, fontWeight: 800, boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 25px rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {importing ? 'Processing Twin Ingestion...' : `Ingest ${preview.records} Records into Profile ✓`}
                  </button>
                  <button
                    disabled={importing || uploading} 
                    onClick={() => { setPreview(null); setUploadedFile(null); }}
                    style={{
                      flex: 1, padding: 13, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)', color: '#cbd5e1', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    Cancel Ingest
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Import History */}
        <div 
          className="glass-card"
          style={{
            padding: 24, 
            borderRadius: 20, 
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(13, 20, 35, 0.45)',
            position: 'relative'
          }}
        >
          <CyberCorners color="rgba(255,255,255,0.15)" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#cbd5e1'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Import Ingestion Audit Logs</h4>
              <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>Historic telemetry sheets pulled into the matrix database</p>
            </div>
          </div>

          {importHistory.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.05))' }}>📦</span>
              <div>
                <p style={{ fontSize: 13, margin: '0 0 4px', fontWeight: 700, color: '#cbd5e1' }}>Telemetry Logs Vacant</p>
                <p style={{ fontSize: 11.5, margin: 0, color: '#64748b' }}>Upload external sheets to populate past sync audit trail</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {importHistory.map((h, i) => {
                const isSuccess = h.status?.toLowerCase() === 'success';
                return (
                  <motion.div
                    key={h.id || i} 
                    initial={{ opacity: 0, x: -8 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.04 }}
                    className="glass-card"
                    style={{
                      padding: '14px 18px', 
                      borderRadius: 14, 
                      border: '1px solid rgba(255,255,255,0.04)', 
                      background: 'rgba(9, 13, 22, 0.4)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      gap: 16
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: h.fileType === 'csv' ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.06)',
                        border: `1px solid ${h.fileType === 'csv' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
                      }}>
                        {h.fileType === 'csv' ? '📊' : h.fileType === 'xlsx' ? '📗' : '📄'}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', margin: '0 0 3px' }}>{h.originalFilename || h.file}</p>
                        <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{h.uploadedAt ? new Date(h.uploadedAt).toLocaleDateString() : h.date}</span>
                          <span style={{ color: '#475569' }}>•</span>
                          <span>{h.recordCount || h.records} rows</span>
                          {h.detectedDomain && (
                            <>
                              <span style={{ color: '#475569' }}>•</span>
                              <span style={{ 
                                fontSize: 9.5, padding: '2px 8px', borderRadius: 6, 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
                                color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700 
                              }}>{h.detectedDomain}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{
                        fontSize: 10.5, padding: '4px 10px', borderRadius: 8, fontWeight: 700,
                        background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        color: isSuccess ? '#34d399' : '#fbbf24',
                        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isSuccess ? '#10b981' : '#f59e0b',
                          animation: isSuccess ? 'pulse-light 1.8s infinite' : 'pulse-light-orange 1.8s infinite'
                        }} />
                        {isSuccess ? 'Twin Active' : `Suspended: ${h.status}`}
                      </span>
                      
                      <button
                        onClick={async () => { if (h.id) { await authFetch(`/uploads/${h.id}`, { method: 'DELETE' }); fetchHistory(); showToast('Import record deleted', 'info'); } }}
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.06)', 
                          border: '1px solid rgba(239, 68, 68, 0.2)', 
                          padding: '6px 14px', 
                          borderRadius: 8, 
                          cursor: 'pointer', 
                          fontSize: 11.5, 
                          color: '#f87171', 
                          fontWeight: 700, 
                          transition: 'all 0.2s' 
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
