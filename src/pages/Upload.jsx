import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, PageHeader, SecurityBadge, showToast } from '../components/ui/Components';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

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

export default function Upload() {
  const { user, token } = useAuth();
  const { health, finance, career, timeline, goals, setUserData } = useData();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [connectedApis, setConnectedApis] = useState(new Set());
  const [importHistory, setImportHistory] = useState([]);

  const fetchHistory = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`http://localhost:8080/api/uploads/history`, {
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
      const res = await fetch('http://localhost:8080/api/uploads', {
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
      const res = await fetch(`http://localhost:8080/api/records/${preview.domain}/import/${preview.id}`, {
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

  const toggleApi = async (name) => {
    if (name === 'GitHub' && !connectedApis.has(name)) {
      if (importing) return;
      setImporting(true);
      const username = window.prompt("Enter your GitHub username to sync:");
      if (!username) { setImporting(false); return; }
      
      try {
        showToast(`Syncing with GitHub...`, 'info');
        const res = await fetch(`http://localhost:8080/api/sync/github?githubUsername=${username}`, { 
          method: 'POST',
          headers: { 'Authorization': token }
        });
        
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        setConnectedApis(prev => new Set(prev).add(name));
        showToast(`Synced ${data.repos} repos and ${data.commits} commits from GitHub!`, 'success');
        fetchHistory();
        
        // Update dashboard immediately
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
      }
      return;
    }

    setConnectedApis(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); showToast(`Disconnected from ${name}`, 'info'); }
      else { next.add(name); showToast(`Connected to ${name}!`, 'success'); }
      return next;
    });
  };

  return (
    <div className="p-4 md:p-8 pb-24 lg:pb-8 bg-mesh min-h-screen">
      <PageHeader title="Data Import Center" subtitle="Upload files or connect apps to feed your Digital Twin with real data." icon="📂" />

      <SecurityBadge />

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
                    await fetch(`http://localhost:8080/api/uploads/${h.id}`, { method: 'DELETE' });
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
    </div>
  );
}
