/**
 * VoiceLogger — global floating voice command panel.
 *
 * Reuses the existing Web Speech API pipeline from voiceService.js.
 * Lives in ProtectedRoute so it persists across all authenticated pages.
 *
 * States: idle → listening → processing → confirm → success → idle
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createVoiceRecognition } from '../services/voiceService';
import { extractLogEntry, DOMAIN_META, ACTION_LABELS } from '../services/voiceLogService';
import { logSession } from '../services/studyService';
import { useData } from '../context/DataContext';
import { showToast } from './ui/Components';

// ── Sound wave visualizer ──────────────────────────────────────────────────
function SoundWave({ active }) {
  const heights = [35, 60, 85, 100, 85, 60, 35];
  return (
    <div className="flex items-center gap-0.5 h-5">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className="w-0.5 rounded-full bg-current"
          animate={active ? {
            height: [`${h * 0.3}%`, `${h}%`, `${h * 0.3}%`],
          } : { height: '30%' }}
          transition={{ duration: 0.5 + i * 0.05, delay: i * 0.07, repeat: active ? Infinity : 0, ease: 'easeInOut' }}
          style={{ minHeight: 2 }}
        />
      ))}
    </div>
  );
}

// ── Pulse rings (listening indicator) ────────────────────────────────────
function PulseRings({ color }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1 + i * 0.5, opacity: 0 }}
          transition={{ duration: 1.5, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Entity row ─────────────────────────────────────────────────────────────
function EntityRow({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[11px] font-semibold text-slate-200">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
const STAGES = { IDLE: 'idle', LISTENING: 'listening', PROCESSING: 'processing', CONFIRM: 'confirm', SUCCESS: 'success', ERROR: 'error' };

export default function VoiceLogger() {
  const { health, finance, career, gamification, updateDomain, addRecords, addTimelineEvent, updateGamification } = useData();

  const [stage, setStage] = useState(STAGES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [xpEarned, setXpEarned] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const recognitionRef = useRef(null);
  const stageRef = useRef(STAGES.IDLE);
  // Always holds the latest committed transcript — avoids stale closure in callbacks
  const transcriptRef = useRef('');
  // Holds latest doExtract so recognition's onEnd closure always calls the current version
  const doExtractRef = useRef(null);

  // Keep stageRef in sync
  useEffect(() => { stageRef.current = stage; }, [stage]);

  const resetToIdle = useCallback(() => {
    setStage(STAGES.IDLE);
    transcriptRef.current = '';
    setTranscript('');
    setLiveText('');
    setParsed(null);
    setErrorMsg('');
    setExpanded(false);
  }, []);

  // Stable extraction function — receives text as argument, no stale closure on state
  const doExtract = useCallback(async (text) => {
    if (!text?.trim()) { resetToIdle(); return; }
    try {
      const result = await extractLogEntry(text);
      if (!result || result.domain === 'unknown' || result.confidence < 0.35) {
        setErrorMsg(`Could not understand: "${text}". Try: "Spent 450 on Swiggy" or "Worked out 30 minutes".`);
        setStage(STAGES.ERROR);
        return;
      }
      setParsed(result);
      setStage(STAGES.CONFIRM);
    } catch {
      setErrorMsg('AI extraction failed. Please try again.');
      setStage(STAGES.ERROR);
    }
  }, [resetToIdle]);

  // Keep doExtractRef current so the recognition closure always has the latest version
  useEffect(() => { doExtractRef.current = doExtract; }, [doExtract]);

  // Init recognition once — callbacks use refs so they never go stale
  useEffect(() => {
    recognitionRef.current = createVoiceRecognition(
      ({ finalTranscript, interimTranscript }) => {
        if (finalTranscript) {
          const updated = (transcriptRef.current + ' ' + finalTranscript).trim();
          transcriptRef.current = updated;   // ref always current, no re-render lag
          setTranscript(updated);
          setLiveText('');
        } else if (interimTranscript) {
          setLiveText(interimTranscript);
        }
      },
      (err) => {
        if (err === 'no-speech' || err === 'aborted') { resetToIdle(); return; }
        setErrorMsg('Microphone error: ' + err);
        setStage(STAGES.ERROR);
      },
      () => {
        // onEnd — fires when recognition stops naturally (auto) or via .stop()
        // Only act if still LISTENING; manual stop already transitions to PROCESSING
        if (stageRef.current === STAGES.LISTENING) {
          const capturedText = transcriptRef.current;  // always latest — no stale closure
          stageRef.current = STAGES.PROCESSING;
          setStage(STAGES.PROCESSING);
          setLiveText('');
          doExtractRef.current?.(capturedText);        // call directly, no useEffect needed
        }
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition not supported in this browser', 'error');
      return;
    }
    transcriptRef.current = '';
    setTranscript('');
    setLiveText('');
    setParsed(null);
    setExpanded(true);
    setStage(STAGES.LISTENING);
    try {
      recognitionRef.current.start();
    } catch {
      // Already running — stop and restart
      recognitionRef.current.stop();
      setTimeout(() => { recognitionRef.current.start(); }, 200);
    }
  };

  const stopListening = () => {
    // Capture text NOW before any async state commits
    const capturedText = transcriptRef.current;
    // Mark as PROCESSING so onEnd's LISTENING check is false (prevents double-call)
    stageRef.current = STAGES.PROCESSING;
    setStage(STAGES.PROCESSING);
    setLiveText('');
    recognitionRef.current?.stop();
    // Trigger extraction directly — no useEffect dependency chain needed
    doExtract(capturedText);
  };

  // ── Commit the log entry to DataContext ────────────────────────────────
  const handleConfirm = async () => {
    if (!parsed) return;
    const { domain, action, entities, xpReward, humanReadable } = parsed;
    const now = new Date().toISOString();

    try {
      // ── Finance ─────────────────────────────────────────────────────
      if (domain === 'finance') {
        const amount = entities.amount || 0;
        if (action === 'expense') {
          const cat = (entities.category || 'Others').toLowerCase();
          updateDomain('finance', {
            expenses: (finance?.expenses || 0) + amount,
            categoryTotals: {
              ...(finance?.categoryTotals || {}),
              [cat]: ((finance?.categoryTotals || {})[cat] || 0) + amount,
            },
          });
          addRecords('finance', [{ date: now, amount, category: cat }]);
          addTimelineEvent({ type: 'Voice: Expense', text: humanReadable, sentiment: 'neutral', domain: 'finance' });
        } else if (action === 'income') {
          updateDomain('finance', { income: amount });
          addTimelineEvent({ type: 'Voice: Income', text: humanReadable, sentiment: 'positive', domain: 'finance' });
        }
      }

      // ── Health ──────────────────────────────────────────────────────
      if (domain === 'health') {
        const healthUpdate = {};
        if (action === 'workout' && entities.durationMinutes) {
          healthUpdate.workoutsPerWeek = Math.min(7, (health?.workoutsPerWeek || 0) + 1);
          healthUpdate.activeMinutes = (health?.activeMinutes || 0) + entities.durationMinutes;
        }
        if (action === 'sleep' && entities.sleepHours) {
          healthUpdate.sleepAvg = entities.sleepHours;
        }
        if (action === 'meal' && entities.calories) {
          healthUpdate.caloriesAvg = entities.calories;
        }
        if (action === 'mood' && entities.mood) {
          healthUpdate.moodAvg = entities.mood;
        }
        if (action === 'stress' && entities.stressLevel) {
          healthUpdate.stressLevel = entities.stressLevel;
        }
        if (action === 'water' && entities.waterIntake) {
          healthUpdate.waterIntake = entities.waterIntake;
        }
        if (Object.keys(healthUpdate).length) {
          updateDomain('health', healthUpdate);
          addRecords('health', [{ date: now, ...healthUpdate }]);
        }
        addTimelineEvent({ type: `Voice: ${ACTION_LABELS[action] || 'Health'}`, text: humanReadable, sentiment: 'positive', domain: 'health' });
      }

      // ── Career ──────────────────────────────────────────────────────
      if (domain === 'career' && action === 'study') {
        const hours = entities.studyHours || 0;
        const mins = entities.durationMinutes || Math.round(hours * 60);
        updateDomain('career', { studyHoursDaily: Math.max(career?.studyHoursDaily || 0, hours) });
        addRecords('career', [{ date: now, studyHours: hours, topic: entities.topic }]);
        addTimelineEvent({ type: 'Voice: Study', text: humanReadable, sentiment: 'positive', domain: 'career' });

        // Also log to study sessions DB (with offline fallback via studyService)
        try {
          await logSession({
            durationMinutes: mins || 30,
            topic: entities.topic || 'General',
            focusQuality: 3,
            mentalFatigue: 3,
            environment: 'HOME',
          });
        } catch { /* studyService has its own offline fallback */ }
      }

      // ── Gamification ────────────────────────────────────────────────
      const xp = xpReward || 10;
      const currentXP = gamification?.xp || 0;
      const newXP = currentXP + xp;
      const newLevel = Math.floor(newXP / 100) + 1;

      // Badge logic
      const badges = [...(gamification?.badges || [])];
      if (newXP >= 100 && !badges.includes('First Century')) badges.push('First Century');
      if (domain === 'health' && action === 'workout' && !badges.includes('Workout Warrior')) badges.push('Workout Warrior');
      if (domain === 'finance' && !badges.includes('Budget Tracker')) badges.push('Budget Tracker');
      if (domain === 'career' && !badges.includes('Scholar')) badges.push('Scholar');

      updateGamification({ xp: newXP, level: newLevel, badges });

      setXpEarned(xp);
      setStage(STAGES.SUCCESS);
      showToast(`✅ ${humanReadable} (+${xp} XP)`, 'success');

      // Auto-return to idle after success animation
      setTimeout(resetToIdle, 2200);
    } catch (err) {
      console.error('VoiceLogger commit error:', err);
      showToast('Failed to save log entry', 'error');
      resetToIdle();
    }
  };

  // ── Toggle button click ────────────────────────────────────────────────
  const handleMicClick = () => {
    if (stage === STAGES.IDLE) { startListening(); return; }
    if (stage === STAGES.LISTENING) { stopListening(); return; }
    if (stage === STAGES.CONFIRM || stage === STAGES.ERROR) { resetToIdle(); return; }
  };

  const meta = parsed ? (DOMAIN_META[parsed.domain] || DOMAIN_META.unknown) : null;

  return (
    <div className="fixed bottom-8 right-6 md:right-8 z-40 flex flex-col items-end gap-3">

      {/* ── Expandable card ─────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && stage !== STAGES.IDLE && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-80 rounded-2xl border border-white/10 bg-[#111]/90 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {stage === STAGES.LISTENING && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                {stage === STAGES.PROCESSING && <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
                {stage === STAGES.CONFIRM && <span className="text-base">{meta?.icon}</span>}
                {stage === STAGES.SUCCESS && <span className="text-base">🎉</span>}
                {stage === STAGES.ERROR && <span className="text-base">⚠️</span>}
                <span className="text-xs font-semibold text-slate-200">
                  {stage === STAGES.LISTENING && 'Listening...'}
                  {stage === STAGES.PROCESSING && 'Extracting intent...'}
                  {stage === STAGES.CONFIRM && (ACTION_LABELS[parsed?.action] || 'Confirm entry')}
                  {stage === STAGES.SUCCESS && 'Logged!'}
                  {stage === STAGES.ERROR && 'Could not parse'}
                </span>
              </div>
              <button onClick={resetToIdle} className="text-slate-500 hover:text-slate-300 text-xs transition-all">✕</button>
            </div>

            {/* ── LISTENING stage ──────────────────────────────────── */}
            {stage === STAGES.LISTENING && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-rose-400">
                    <SoundWave active={true} />
                  </div>
                  <p className="text-xs text-rose-300 font-medium">Recording voice command…</p>
                </div>
                {(transcript || liveText) && (
                  <p className="text-xs text-slate-300 leading-relaxed px-1 italic">
                    "{liveText || transcript}"
                  </p>
                )}
                <div className="text-[10px] text-slate-500 px-1 space-y-0.5">
                  <p>Try saying:</p>
                  <p className="text-slate-400">"I spent 450 on Swiggy"</p>
                  <p className="text-slate-400">"Worked out 30 minutes"</p>
                  <p className="text-slate-400">"Studied DSA for 2 hours"</p>
                </div>
                <button onClick={stopListening}
                  className="w-full py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition-all">
                  Done Speaking →
                </button>
              </div>
            )}

            {/* ── PROCESSING stage ─────────────────────────────────── */}
            {stage === STAGES.PROCESSING && (
              <div className="p-6 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-400 text-center">AI extracting intent from:<br /><span className="text-slate-300 italic">"{transcript}"</span></p>
              </div>
            )}

            {/* ── CONFIRM stage ────────────────────────────────────── */}
            {stage === STAGES.CONFIRM && parsed && meta && (
              <div className="p-4 space-y-3">
                {/* Domain badge */}
                <div className={`flex items-center gap-2 p-2 rounded-xl ${meta.bg} border ${meta.border}`}>
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <p className={`text-xs font-bold ${meta.text}`}>{meta.label} · {ACTION_LABELS[parsed.action] || parsed.action}</p>
                    <p className="text-[10px] text-slate-500">Confidence: {Math.round(parsed.confidence * 100)}% · via {parsed.source === 'ai' ? '🤖 AI' : '🔍 Regex'}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">+{parsed.xpReward} XP</span>
                </div>

                {/* Transcript */}
                <p className="text-[10px] text-slate-500 italic px-1">"{transcript}"</p>

                {/* Entities */}
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                  <EntityRow label="Amount" value={parsed.entities.amount ? `₹${parsed.entities.amount.toLocaleString()}` : null} />
                  <EntityRow label="Merchant" value={parsed.entities.merchant} />
                  <EntityRow label="Category" value={parsed.entities.category} />
                  <EntityRow label="Type" value={parsed.entities.transactionType} />
                  <EntityRow label="Calories" value={parsed.entities.calories ? `${parsed.entities.calories} kcal` : null} />
                  <EntityRow label="Duration" value={parsed.entities.durationMinutes ? `${parsed.entities.durationMinutes} min` : null} />
                  <EntityRow label="Sleep" value={parsed.entities.sleepHours ? `${parsed.entities.sleepHours}h` : null} />
                  <EntityRow label="Mood" value={parsed.entities.mood ? `${parsed.entities.mood}/10` : null} />
                  <EntityRow label="Water" value={parsed.entities.waterIntake ? `${parsed.entities.waterIntake} glasses` : null} />
                  <EntityRow label="Topic" value={parsed.entities.topic} />
                  <EntityRow label="Study" value={parsed.entities.studyHours ? `${parsed.entities.studyHours}h` : null} />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={resetToIdle}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-slate-400 text-xs hover:border-white/20 hover:text-slate-300 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleConfirm}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold ${meta.bg} border ${meta.border} ${meta.text} hover:brightness-125 transition-all`}>
                    Log It ✓
                  </button>
                </div>
              </div>
            )}

            {/* ── SUCCESS stage ────────────────────────────────────── */}
            {stage === STAGES.SUCCESS && (
              <div className="p-6 flex flex-col items-center gap-3">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                  <span className="text-4xl">✅</span>
                </motion.div>
                <p className="text-sm font-semibold text-emerald-400 text-center">{parsed?.humanReadable}</p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-bold text-amber-300">+{xpEarned} XP earned!</span>
                </motion.div>
              </div>
            )}

            {/* ── ERROR stage ──────────────────────────────────────── */}
            {stage === STAGES.ERROR && (
              <div className="p-4 space-y-3">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-xs text-rose-300 leading-relaxed">{errorMsg}</p>
                </div>
                <button onClick={startListening}
                  className="w-full py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 text-xs hover:bg-white/[0.07] transition-all">
                  Try Again 🎤
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating mic button ──────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        {stage === STAGES.LISTENING && <PulseRings color="#f43f5e" />}

        <motion.button
          onClick={handleMicClick}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
          title="Voice Logger — log health, finance, career by speaking"
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all border-2 select-none
            ${stage === STAGES.LISTENING
              ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/40'
              : stage === STAGES.PROCESSING
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/40'
              : stage === STAGES.CONFIRM
              ? `${meta?.bg || 'bg-emerald-600'} border-emerald-400/60 text-white shadow-emerald-500/30`
              : stage === STAGES.SUCCESS
              ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/40'
              : stage === STAGES.ERROR
              ? 'bg-rose-700 border-rose-500 text-white'
              : 'bg-gradient-to-br from-violet-600 to-indigo-700 border-violet-400/50 text-white shadow-violet-500/30'
            }`}
        >
          {stage === STAGES.IDLE && <span className="text-xl">🎤</span>}
          {stage === STAGES.LISTENING && (
            <div className="text-white">
              <SoundWave active={true} />
            </div>
          )}
          {stage === STAGES.PROCESSING && (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {stage === STAGES.CONFIRM && <span className="text-xl">✓</span>}
          {stage === STAGES.SUCCESS && <span className="text-xl">🎉</span>}
          {stage === STAGES.ERROR && <span className="text-xl">↩</span>}
        </motion.button>

        {/* Idle tooltip */}
        {stage === STAGES.IDLE && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-[#1a1a1a] border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden xl:block">
            Voice Log
          </div>
        )}
      </div>

      {/* ── Help text under button ─────────────────────────────────── */}
      {stage === STAGES.IDLE && (
        <p className="text-[9px] text-slate-600 text-center hidden md:block">Voice Log</p>
      )}
    </div>
  );
}
