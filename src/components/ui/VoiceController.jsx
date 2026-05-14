import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { parseVoiceIntent } from '../../services/voiceParser';
import { useNavigate, useLocation } from 'react-router-dom';
import { showToast } from './Components';

export function VoiceController() {
  const { state, actions } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedIntent, setParsedIntent] = useState(null);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      
      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map(res => res[0].transcript)
          .join('');
        setTranscript(text);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e) => {
        setError(e.error === 'not-allowed' ? 'Microphone blocked' : 'Voice recognition error');
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      setError('Browser not supported');
      setIsOpen(true);
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setParsedIntent(null);
      setError(null);
      setIsOpen(true);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
        setError('Error starting microphone');
      }
    }
  };

  // Process transcript when it stops listening and we have text
  useEffect(() => {
    if (!isListening && transcript && !parsedIntent && !error) {
      const intent = parseVoiceIntent(transcript);
      if (intent.action === 'coach') {
        // Close voice controller and navigate
        setIsOpen(false);
        setTranscript('');
        navigate(`/coach?q=${encodeURIComponent(transcript)}`);
      } else if (intent.action === 'log') {
        setParsedIntent(intent);
      } else {
        setError('Could not understand command. Try "Log 7 hours sleep"');
      }
    }
  }, [isListening, transcript, parsedIntent, error, navigate]);

  const executeLog = () => {
    if (!parsedIntent) return;
    
    let domainData = { ...parsedIntent.data };
    
    // Handle special delta operators like expense addition
    if (domainData.__delta_expense) {
      const currentExpenses = state.finance?.expenses || 0;
      domainData = { expenses: currentExpenses + domainData.__delta_expense };
    }

    actions.updateDomain(parsedIntent.domain, domainData);
    
    actions.addTimelineEvent({
      type: 'Voice Log',
      text: `Voice command: "${transcript}"`,
      sentiment: 'positive',
      domain: parsedIntent.domain
    });
    
    showToast(`Logged successfully to ${parsedIntent.domain}`, 'success');
    
    // Close and reset
    setParsedIntent(null);
    setTranscript('');
    setIsOpen(false);
  };

  const cancelLog = () => {
    setParsedIntent(null);
    setTranscript('');
    setIsOpen(false);
    setError(null);
  };

  // Don't show floating mic if we are on login screen
  if (location.pathname === '/') return null;

  return (
    <>
      <button 
        onClick={toggleListen}
        className={`fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20 transition-all z-50 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
        title="Voice Command"
      >
        {isListening ? '🛑' : '🎤'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-40 md:bottom-24 right-6 w-80 p-5 rounded-2xl border bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-2xl z-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                {isListening ? (
                  <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Listening...</>
                ) : parsedIntent ? (
                  <><span className="text-emerald-400">✨</span> Confirm Action</>
                ) : (
                  '🎤 Voice Input'
                )}
              </h3>
              <button onClick={cancelLog} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {error ? (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-2">
                {error}
              </div>
            ) : (
              <div className="min-h-[60px] p-3 rounded-lg bg-black/40 border border-white/5 text-sm mb-4 italic text-slate-300">
                {transcript || (isListening ? 'Speak now...' : 'Say "Add expense 500 food" or "Why is my burnout increasing?"')}
              </div>
            )}

            {parsedIntent && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                  {parsedIntent.message}
                </div>
                <div className="flex gap-2">
                  <button onClick={executeLog} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                    Save
                  </button>
                  <button onClick={cancelLog} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {(!isListening && !parsedIntent && !error && transcript) && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Processing intent...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
