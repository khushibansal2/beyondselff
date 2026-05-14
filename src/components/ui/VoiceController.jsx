import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { parseVoiceIntent } from '../../services/voiceParser';
import { useNavigate, useLocation } from 'react-router-dom';
import { showToast } from './Components';

// Mic states for clean UI management
const MIC_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  CONFIRM: 'confirm',
  ERROR: 'error',
  UNSUPPORTED: 'unsupported',
};

export function VoiceController() {
  const ctx = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [micState, setMicState] = useState(MIC_STATE.IDLE);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedIntent, setParsedIntent] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Use a ref so executeLog always reads the latest expenses without stale closure
  const financeRef = useRef(ctx.finance);
  useEffect(() => { financeRef.current = ctx.finance; }, [ctx.finance]);

  // Check for API support once — do NOT create instance at mount
  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // We always create a fresh instance on each listen call to avoid the
  // "already started / cannot restart" browser bug
  const startListening = useCallback(() => {
    if (!isSupported) {
      setMicState(MIC_STATE.UNSUPPORTED);
      setErrorMsg('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      setIsOpen(true);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN'; // Indian English — matches user context
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';

    rec.onstart = () => {
      setMicState(MIC_STATE.LISTENING);
      setTranscript('');
      setInterimTranscript('');
      setParsedIntent(null);
      setErrorMsg('');
    };

    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      // Accumulate final transcript
      if (final) finalText += final;
      setTranscript(finalText);
      setInterimTranscript(interim);
    };

    rec.onend = () => {
      setInterimTranscript('');
      // Use the captured finalText directly — avoids React stale-closure timing issue
      if (finalText.trim()) {
        setTranscript(finalText); // ensure state matches
        processTranscript(finalText.trim());
      } else {
        setMicState(MIC_STATE.IDLE);
        setIsOpen(false);
      }
    };

    rec.onerror = (e) => {
      setInterimTranscript('');
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setErrorMsg('Microphone permission was denied. Please allow mic access in your browser settings and try again.');
      } else if (e.error === 'no-speech') {
        setErrorMsg('No speech detected. Please try speaking closer to the microphone.');
      } else if (e.error === 'network') {
        setErrorMsg('Network error during speech recognition. Check your internet connection.');
      } else {
        setErrorMsg(`Voice recognition error: ${e.error}`);
      }
      setMicState(MIC_STATE.ERROR);
    };

    try {
      rec.start();
      setIsOpen(true);
    } catch (err) {
      setErrorMsg('Could not start microphone. Try clicking the button again.');
      setMicState(MIC_STATE.ERROR);
      setIsOpen(true);
    }
  }, [isSupported]);

  const processTranscript = (text) => {
    setMicState(MIC_STATE.PROCESSING);

    // Small delay so the "processing" spinner is visible
    setTimeout(() => {
      const intent = parseVoiceIntent(text);

      if (intent.action === 'coach') {
        setIsOpen(false);
        setTranscript('');
        setMicState(MIC_STATE.IDLE);
        navigate(`/coach?q=${encodeURIComponent(text)}`);
      } else if (intent.action === 'log') {
        setParsedIntent(intent);
        setMicState(MIC_STATE.CONFIRM);
      } else {
        setErrorMsg(`Could not understand: "${text}". Try: "Log 7 hours sleep" or "Add expense 500"`);
        setMicState(MIC_STATE.ERROR);
      }
    }, 400);
  };

  const handleMicClick = () => {
    if (micState === MIC_STATE.LISTENING) {
      // Stop is handled by the browser naturally — no manual stop needed
      return;
    }

    if (micState === MIC_STATE.CONFIRM || micState === MIC_STATE.ERROR || micState === MIC_STATE.PROCESSING) {
      // Reset and re-open
      resetState();
      return;
    }

    startListening();
  };

  const executeLog = () => {
    if (!parsedIntent) return;

    // Read LATEST finance data from ref (avoids stale closure)
    let domainData = { ...parsedIntent.data };
    if (domainData.__delta_expense !== undefined) {
      const currentExpenses = Number(financeRef.current?.expenses) || 0;
      domainData = { expenses: currentExpenses + domainData.__delta_expense };
    }

    ctx.updateDomain(parsedIntent.domain, domainData);
    ctx.addTimelineEvent({
      type: 'Voice Log',
      text: `Voice command: "${transcript}"`,
      sentiment: 'positive',
      domain: parsedIntent.domain,
      date: new Date().toISOString()
    });

    showToast(`✅ Voice logged to ${parsedIntent.domain}`, 'success');
    resetState();
  };

  const resetState = () => {
    setParsedIntent(null);
    setTranscript('');
    setInterimTranscript('');
    setErrorMsg('');
    setMicState(MIC_STATE.IDLE);
    setIsOpen(false);
  };

  // Do not render on auth pages
  const hiddenRoutes = ['/', '/login', '/signup'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const micButtonStyle = {
    [MIC_STATE.IDLE]:        'bg-blue-600 hover:bg-blue-500',
    [MIC_STATE.LISTENING]:   'bg-red-500 animate-pulse',
    [MIC_STATE.PROCESSING]:  'bg-amber-500',
    [MIC_STATE.CONFIRM]:     'bg-emerald-600',
    [MIC_STATE.ERROR]:       'bg-red-700',
    [MIC_STATE.UNSUPPORTED]: 'bg-slate-600 cursor-not-allowed',
  }[micState] || 'bg-blue-600';

  const micIcon = {
    [MIC_STATE.IDLE]:        '🎤',
    [MIC_STATE.LISTENING]:   '🛑',
    [MIC_STATE.PROCESSING]:  '⏳',
    [MIC_STATE.CONFIRM]:     '✅',
    [MIC_STATE.ERROR]:       '⚠️',
    [MIC_STATE.UNSUPPORTED]: '🚫',
  }[micState] || '🎤';

  return (
    <>
      <button
        onClick={handleMicClick}
        className={`fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20 transition-all z-50 text-white ${micButtonStyle}`}
        title={micState === MIC_STATE.LISTENING ? 'Listening... click to cancel' : 'Voice Command'}
        aria-label="Voice Command Button"
      >
        {micIcon}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="voice-panel"
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-40 md:bottom-24 right-6 w-80 p-5 rounded-2xl border bg-slate-900/98 backdrop-blur-xl border-white/10 shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                {micState === MIC_STATE.LISTENING && (
                  <><span className="w-2 h-2 rounded-full bg-red-400 animate-ping absolute" /><span className="w-2 h-2 rounded-full bg-red-500 relative" /> Listening...</>
                )}
                {micState === MIC_STATE.PROCESSING && (
                  <><div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Processing...</>
                )}
                {micState === MIC_STATE.CONFIRM && (
                  <><span className="text-emerald-400">✨</span> Confirm Action</>
                )}
                {(micState === MIC_STATE.ERROR || micState === MIC_STATE.UNSUPPORTED) && (
                  <><span className="text-red-400">⚠️</span> Voice Error</>
                )}
                {micState === MIC_STATE.IDLE && '🎤 Voice Input'}
              </h3>
              <button onClick={resetState} className="text-slate-400 hover:text-white transition-colors ml-2">✕</button>
            </div>

            {/* Transcript / Interim / Placeholder */}
            {micState !== MIC_STATE.ERROR && micState !== MIC_STATE.UNSUPPORTED && (
              <div className="min-h-[64px] p-3 rounded-xl bg-black/40 border border-white/5 text-sm mb-4 leading-relaxed">
                {transcript ? (
                  <span className="text-white">{transcript}</span>
                ) : interimTranscript ? (
                  <span className="text-slate-400 italic">{interimTranscript}</span>
                ) : (
                  <span className="text-slate-500 italic">
                    {micState === MIC_STATE.LISTENING
                      ? 'Speak now... e.g. "Log 7 hours sleep"'
                      : 'Say "Add expense 500" or "Why is my burnout high?"'}
                  </span>
                )}
              </div>
            )}

            {/* Error State */}
            {(micState === MIC_STATE.ERROR || micState === MIC_STATE.UNSUPPORTED) && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4">
                {errorMsg}
              </div>
            )}

            {/* Confirmation Block */}
            {micState === MIC_STATE.CONFIRM && parsedIntent && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                  {parsedIntent.message}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={executeLog}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                  >
                    ✓ Save
                  </button>
                  <button
                    onClick={resetState}
                    className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors"
                  >
                    ✕ Cancel
                  </button>
                </div>
                <button
                  onClick={startListening}
                  className="w-full py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-colors"
                >
                  🔁 Try Again
                </button>
              </motion.div>
            )}

            {/* Re-try from error */}
            {(micState === MIC_STATE.ERROR) && (
              <button
                onClick={startListening}
                className="w-full py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 text-xs transition-colors mt-1"
              >
                🎤 Try Again
              </button>
            )}

            {/* Helper text */}
            <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
              <p>💡 Try: "Log 7 hours sleep and stress 4"</p>
              <p>💡 Try: "Add expense 500 food"</p>
              <p>💡 Try: "Why is my burnout increasing?"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
