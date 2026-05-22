import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { parseVoiceIntent } from '../../services/voiceParser';
import { transcribeAudio } from '../../services/transcriptionService';
import { useNavigate, useLocation } from 'react-router-dom';
import { showToast } from './Components';

const MIC_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  CONFIRM: 'confirm',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
  FALLBACK: 'fallback',
};

// Pick the best supported mimeType for recording
function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function VoiceController() {
  const ctx = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [micState, setMicState] = useState(MIC_STATE.IDLE);
  const [transcript, setTranscript] = useState('');
  const [parsedIntent, setParsedIntent] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Keep finance ref fresh to avoid stale closure in executeLog
  const financeRef = useRef(ctx.finance);
  useEffect(() => { financeRef.current = ctx.finance; }, [ctx.finance]);

  // ── resetState (defined FIRST so all callbacks can reference it) ──────────
  const resetState = useCallback((closePanel = true) => {
    setParsedIntent(null);
    setTranscript('');
    setErrorMsg('');
    setFallbackInput('');
    setShowTextInput(false);
    setMicState(MIC_STATE.IDLE);
    if (closePanel) setIsOpen(false);
  }, []);

  // ── Process any transcript (voice or typed) ───────────────────────────────
  const processTranscript = useCallback((text) => {
    if (!text.trim()) return;
    setMicState(MIC_STATE.PROCESSING);
    setTranscript(text.trim());

    setTimeout(() => {
      const intent = parseVoiceIntent(text.trim());
      if (intent.action === 'coach') {
        setIsOpen(false);
        resetState();
        navigate(`/coach?q=${encodeURIComponent(text.trim())}`);
      } else if (intent.action === 'log') {
        setParsedIntent(intent);
        setMicState(MIC_STATE.CONFIRM);
      } else {
        // Route ambiguous commands to coach for AI interpretation
        setIsOpen(false);
        resetState();
        navigate(`/coach?q=${encodeURIComponent(text.trim())}`);
      }
    }, 350);
  }, [navigate, resetState]);

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Start backend MediaRecorder recording ─────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState(MIC_STATE.UNSUPPORTED);
      setErrorMsg('Audio capture is not supported in this browser.');
      setShowTextInput(true);
      setIsOpen(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });

        if (audioBlob.size < 100) {
          setErrorMsg('No audio detected. Please speak clearly and try again.');
          setMicState(MIC_STATE.ERROR);
          return;
        }

        setMicState(MIC_STATE.UPLOADING);

        try {
          const result = await transcribeAudio(audioBlob);
          if (result.transcript?.trim()) {
            setTranscript(result.transcript);
            processTranscript(result.transcript);
          } else {
            setErrorMsg('Transcription returned empty. Try speaking more clearly or use the text input below.');
            setMicState(MIC_STATE.ERROR);
            setShowTextInput(true);
          }
        } catch (err) {
          console.warn('[VoiceController] Backend transcription failed, falling back to text input:', err.message);
          // Graceful fallback: show text input if backend is down (e.g., Spring Boot not running)
          setMicState(MIC_STATE.FALLBACK);
          setShowTextInput(true);
          setErrorMsg('');
        }
      };

      mediaRecorder.start();
      setMicState(MIC_STATE.LISTENING);
      setTranscript('');
      setParsedIntent(null);
      setErrorMsg('');

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') stopRecording();
      }, 10000);

    } catch (err) {
      console.warn('[VoiceController] getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('🔒 Microphone access denied. Click the lock icon in your browser address bar → Allow microphone.');
      } else {
        setErrorMsg('🎙️ No microphone found. Use the text input below to type your command.');
      }
      setMicState(MIC_STATE.ERROR);
      setShowTextInput(true);
      setIsOpen(true);
    }
  }, [processTranscript, stopRecording]);

  // ── Mic button click ──────────────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (micState === MIC_STATE.LISTENING) {
      stopRecording();
      return;
    }
    if (micState === MIC_STATE.UPLOADING || micState === MIC_STATE.PROCESSING) return;

    resetState(false);
    setIsOpen(true);
    startRecording();
  }, [micState, stopRecording, resetState, startRecording]);

  // ── Execute confirmed log ─────────────────────────────────────────────────
  const executeLog = useCallback(() => {
    if (!parsedIntent) return;

    let domainData = { ...parsedIntent.data };
    if (domainData.__delta_expense !== undefined) {
      const current = Number(financeRef.current?.expenses) || 0;
      domainData = { expenses: current + domainData.__delta_expense };
    }

    ctx.updateDomain(parsedIntent.domain, domainData);
    ctx.addTimelineEvent({
      type: 'Voice Log',
      text: `Voice command: "${transcript}"`,
      sentiment: 'positive',
      domain: parsedIntent.domain,
      date: new Date().toISOString(),
    });

    showToast(`✅ Voice logged to ${parsedIntent.domain}`, 'success');
    resetState();
  }, [parsedIntent, transcript, ctx, resetState]);

  // ── Fallback typed command ────────────────────────────────────────────────
  const handleFallbackSubmit = useCallback((e) => {
    e.preventDefault();
    if (!fallbackInput.trim()) return;
    const txt = fallbackInput.trim();
    setFallbackInput('');
    setShowTextInput(false);
    processTranscript(txt);
  }, [fallbackInput, processTranscript]);

  // ── Don't render on public pages ─────────────────────────────────────────
  const hiddenRoutes = ['/', '/login', '/signup'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  // ── Derived UI ────────────────────────────────────────────────────────────
  const micBg = {
    [MIC_STATE.IDLE]:        'bg-blue-600 hover:bg-blue-500',
    [MIC_STATE.LISTENING]:   'bg-red-500 scale-110',
    [MIC_STATE.UPLOADING]:   'bg-cyan-500',
    [MIC_STATE.PROCESSING]:  'bg-amber-500',
    [MIC_STATE.CONFIRM]:     'bg-emerald-600',
    [MIC_STATE.ERROR]:       'bg-red-700 hover:bg-red-600',
    [MIC_STATE.UNSUPPORTED]: 'bg-slate-600',
    [MIC_STATE.FALLBACK]:    'bg-indigo-600 hover:bg-indigo-500',
  }[micState] || 'bg-blue-600';

  const micIcon = {
    [MIC_STATE.IDLE]:        '🎤',
    [MIC_STATE.LISTENING]:   '■',
    [MIC_STATE.UPLOADING]:   '☁️',
    [MIC_STATE.PROCESSING]:  '⏳',
    [MIC_STATE.CONFIRM]:     '✅',
    [MIC_STATE.ERROR]:       '⚠️',
    [MIC_STATE.UNSUPPORTED]: '🚫',
    [MIC_STATE.FALLBACK]:    '⌨️',
  }[micState] || '🎤';

  const stateLabel = {
    [MIC_STATE.IDLE]:        '🎤 Voice Input',
    [MIC_STATE.LISTENING]:   null, // rendered with pulsing dot below
    [MIC_STATE.UPLOADING]:   null,
    [MIC_STATE.PROCESSING]:  null,
    [MIC_STATE.CONFIRM]:     '✨ Confirm Action',
    [MIC_STATE.ERROR]:       '⚠️ Error',
    [MIC_STATE.UNSUPPORTED]: '🚫 Not Supported',
    [MIC_STATE.FALLBACK]:    '⌨️ Type Your Command',
  }[micState] ?? '';

  return (
    <>
      {/* Floating mic button */}
      <button
        onClick={handleMicClick}
        disabled={micState === MIC_STATE.UPLOADING || micState === MIC_STATE.PROCESSING}
        className={`fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-xl shadow-blue-500/20 transition-all duration-200 z-50 text-white ${micBg} ${micState === MIC_STATE.LISTENING ? 'animate-pulse' : ''}`}
        title={micState === MIC_STATE.FALLBACK ? 'Type your command' : 'Voice Command (or type)'}
        aria-label="Voice Command"
      >
        {micIcon}
      </button>

      {/* Expandable panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="voice-panel"
            initial={{ opacity: 0, y: 48, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed bottom-40 md:bottom-24 right-6 w-80 p-5 rounded-2xl border bg-slate-900/98 backdrop-blur-xl border-white/10 shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                {micState === MIC_STATE.LISTENING && (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    Listening (tap to stop)...
                  </>
                )}
                {micState === MIC_STATE.UPLOADING && (
                  <><div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> Transcribing...</>
                )}
                {micState === MIC_STATE.PROCESSING && (
                  <><div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Parsing intent...</>
                )}
                {stateLabel && <span>{stateLabel}</span>}
              </h3>
              <button onClick={resetState} className="text-slate-500 hover:text-white transition-colors text-lg" aria-label="Close">✕</button>
            </div>

            {/* Live transcript display */}
            {(micState === MIC_STATE.LISTENING || micState === MIC_STATE.IDLE || micState === MIC_STATE.UPLOADING || micState === MIC_STATE.PROCESSING) && (
              <div className="min-h-[52px] p-3 rounded-xl bg-black/40 border border-white/5 text-sm mb-3 leading-relaxed">
                {transcript ? (
                  <span className="text-white">{transcript}</span>
                ) : (
                  <span className="text-slate-500 italic">
                    {micState === MIC_STATE.LISTENING
                      ? 'Speak now, then tap mic to process...'
                      : micState === MIC_STATE.UPLOADING
                      ? 'Transcribing your audio securely...'
                      : micState === MIC_STATE.PROCESSING
                      ? 'Parsing intent...'
                      : 'Tap mic or type below. Examples shown ↓'}
                  </span>
                )}
              </div>
            )}

            {/* CONFIRM state */}
            {micState === MIC_STATE.CONFIRM && parsedIntent && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                  {parsedIntent.message}
                </div>
                <div className="text-xs text-slate-500 italic px-1">From: "{transcript}"</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={executeLog} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                    ✓ Save
                  </button>
                  <button onClick={resetState} className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors">
                    ✕ Cancel
                  </button>
                </div>
                <button onClick={() => { resetState(false); startRecording(); }} className="w-full py-1.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 text-xs transition-colors">
                  🔁 Try Again
                </button>
              </motion.div>
            )}

            {/* ERROR state */}
            {micState === MIC_STATE.ERROR && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed">
                  {errorMsg || 'An error occurred. Please try again.'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { resetState(false); startRecording(); }} className="py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors">
                    🎤 Retry
                  </button>
                  <button onClick={() => { setMicState(MIC_STATE.FALLBACK); setErrorMsg(''); setShowTextInput(true); }} className="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors">
                    ⌨️ Type Instead
                  </button>
                </div>
              </div>
            )}

            {/* FALLBACK/UNSUPPORTED text input */}
            {(micState === MIC_STATE.FALLBACK || micState === MIC_STATE.UNSUPPORTED || showTextInput) && (
              <div className="space-y-2">
                {micState === MIC_STATE.FALLBACK && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed">
                    <p className="font-semibold mb-0.5">Backend not reachable</p>
                    <p>Type your command below — same smart parser applies.</p>
                  </div>
                )}
                <form onSubmit={handleFallbackSubmit} className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={fallbackInput}
                    onChange={(e) => setFallbackInput(e.target.value)}
                    placeholder='e.g. "Log 7h sleep stress 4"'
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                  <button type="submit" disabled={!fallbackInput.trim()} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                    Parse &amp; Route →
                  </button>
                </form>
              </div>
            )}

            {/* Quick hints (idle only) */}
            {micState === MIC_STATE.IDLE && !showTextInput && (
              <>
                <div className="mt-2 space-y-0.5 text-[10px] text-slate-600 mb-3">
                  <p>💡 "Log 7 hours sleep and stress 4"</p>
                  <p>💡 "Add expense 500 food"</p>
                  <p>💡 "I studied 3 hours today"</p>
                  <p>💡 "Why is my burnout increasing?"</p>
                </div>
                <button
                  onClick={() => setShowTextInput(true)}
                  className="w-full py-1.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 text-xs transition-colors"
                >
                  ⌨️ Type a command instead
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
