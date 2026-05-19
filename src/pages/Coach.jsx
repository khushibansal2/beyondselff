import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { chatWithAI } from '../services/aiService';
import { createVoiceRecognition } from '../services/voiceService';
import { GlassCard, PageHeader, SecurityBadge } from '../components/ui/Components';

// Max messages kept in persistent history (prevents localStorage bloat)
const HISTORY_LIMIT = 40;

const quickQuestions = [
  { q: "How am I doing overall?",             icon: "📊" },
  { q: "Why did my burnout increase?",        icon: "🔥" },
  { q: "Why is my balance score dropping?",   icon: "📉" },
  { q: "Am I recovering?",                    icon: "📈" },
  { q: "Am I ready for placements?",          icon: "🎯" },
  { q: "How's my sleep affecting me?",        icon: "😴" },
  { q: "What should I focus on today?",       icon: "📋" },
  { q: "Which path is healthier long-term?",  icon: "🔮" },
];

export default function Coach() {
  const { user } = useAuth();
  const { computed, aiCache, updateAICache } = useData();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [feedback, setFeedback] = useState({}); // { msgIndex: 'up' | 'down' }
  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  // ---- Safely read deterministic state ----
  const hs  = computed?.healthScore?.score  ?? 0;
  const fs  = computed?.financeScore?.score ?? 0;
  const cs  = computed?.careerScore?.score  ?? 0;
  const bal = computed?.balance             ?? 0;
  const burnoutRisk  = computed?.burnout?.risk  ?? 0;
  const burnoutLevel = computed?.burnout?.level ?? 'none';
  const crossDomain  = computed?.crossDomain    || [];
  const urgentAlerts = computed?.urgentAlerts   || [];
  const weakest      = computed?.weakestDomain;
  const strongest    = computed?.strongestDomain;

  // ---- Voice recognition ----
  useEffect(() => {
    recognitionRef.current = createVoiceRecognition(
      ({ finalTranscript, interimTranscript }) => {
        if (finalTranscript) {
          setInput(prev => (prev + ' ' + finalTranscript).trim());
          setLiveTranscript('');
        } else if (interimTranscript) {
          setLiveTranscript(interimTranscript);
        }
      },
      (err) => { console.error('Speech recognition error:', err); setIsListening(false); setLiveTranscript(''); },
      () => { setIsListening(false); setLiveTranscript(''); }
    );
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { alert('Speech recognition is not supported in your browser.'); return; }
    if (isListening) {
      recognitionRef.current.stop();
      setLiveTranscript('');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // ---- Initialize / restore chat history (bounded to HISTORY_LIMIT) ----
  useEffect(() => {
    if (!aiCache.coachHistory || aiCache.coachHistory.length === 0) {
      const scoreIntro = computed?.hasData
        ? `\n\nRight now I can see:\n• 💚 Health: ${hs}/100\n• 💰 Finance: ${fs}/100\n• 🎯 Career: ${cs}/100\n• ⚖️ Life Balance: ${bal}/100\n• 🔥 Burnout Risk: ${burnoutRisk}% (${burnoutLevel})${weakest ? `\n• Your weakest domain is **${weakest.name}** (${weakest.score}/100)` : ''}`
        : '\n\nI notice you haven\'t logged any data yet — add some entries in Health, Finance, or Career to unlock personalised insights.';

      const initialMessage = {
        role: 'ai',
        text: `Hello ${user?.name || 'there'}! 👋 I'm your AI Life Coach, powered by your Digital Twin's deterministic intelligence system.\n\nI explain your real scores and cross-domain patterns — I won't invent numbers or give generic advice.${scoreIntro}\n\nAsk me anything, or tap a quick question below!`,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialMessage]);
      updateAICache({ coachHistory: [initialMessage] });
    } else if (messages.length === 0) {
      setMessages(aiCache.coachHistory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCache.coachHistory]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || typing) return;

    const ts = new Date().toISOString();
    const userMsg = { role: 'user', text: text.trim(), timestamp: ts };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLiveTranscript('');
    setTyping(true);

    // Pass full computed context + simulation history if available
    const contextWithSim = { ...computed, lastSimulation: aiCache.lastSimulation };
    const result = await chatWithAI(text.trim(), contextWithSim);

    const aiMsg = {
      role: 'ai',
      text: result.response,
      source: result.source,
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...newMessages, aiMsg];

    // Bound history to HISTORY_LIMIT to prevent localStorage growth
    const bounded = finalMessages.length > HISTORY_LIMIT
      ? [finalMessages[0], ...finalMessages.slice(-(HISTORY_LIMIT - 1))]
      : finalMessages;

    setMessages(bounded);
    updateAICache({ coachHistory: bounded });
    setTyping(false);
  };

  const handleFeedback = (msgIndex, vote) => {
    const key = String(msgIndex);
    const existing = feedback[key];
    const newFeedback = { ...feedback, [key]: existing === vote ? null : vote };
    setFeedback(newFeedback);
    // Persist liked messages for adaptive learning signal
    const likedTexts = messages
      .filter((m, i) => m.role === 'ai' && newFeedback[String(i)] === 'up')
      .map(m => m.text.slice(0, 100));
    updateAICache({ feedbackPreferences: likedTexts });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container bg-mesh min-h-screen flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
      <PageHeader title="AI Life Coach" subtitle="Grounded coaching powered by your Digital Twin's deterministic intelligence." icon="💬" />

      {/* Live Context + Explainability Bar */}
      <GlassCard className="mb-4 !p-3" animate={false}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Context • Health {hs}/100 • Finance {fs}/100 • Career {cs}/100 • Burnout {burnoutRisk}%
            </div>
            <SecurityBadge compact />
          </div>

          {/* Active cross-domain alerts row — explainability anchors */}
          {(urgentAlerts.length > 0 || crossDomain.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.05]">
              {urgentAlerts.slice(0, 2).map((a, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-1">
                  {a.icon} {a.text}
                </span>
              ))}
              {crossDomain.slice(0, 2).map((cd, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1">
                  🔗 {cd.id.replace(/-/g, ' ')}
                </span>
              ))}
              {weakest && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  Weakest: {weakest.name} ({weakest.score}/100)
                </span>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Quick Questions — updated to cover engine outputs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
        {quickQuestions.map(({ q, icon }) => (
          <button key={q} onClick={() => sendMessage(q)}
            className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5">
            <span>{icon}</span>{q}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-100' : 'glass-card text-slate-300'}`}>
              {msg.role === 'ai' && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                    🧠 AI Coach
                    {msg.source === 'fallback' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Local AI Mode</span>
                    )}
                    {msg.source === 'rate-limited' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Rate Limited</span>
                    )}
                    {feedback[String(i)] === 'up' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">✨ AI learning your preferences</span>
                    )}
                  </span>
                </div>
              )}
              {msg.text}
              <div className={`flex items-center justify-between mt-2`}>
                <span className={`text-[9px] ${msg.role === 'user' ? 'text-blue-400/50' : 'text-slate-600'}`}>{formatTime(msg.timestamp)}</span>
                {msg.role === 'ai' && i > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-600 mr-1">Helpful?</span>
                    <button
                      onClick={() => handleFeedback(i, 'up')}
                      className={`text-sm px-1.5 py-0.5 rounded-lg transition-all ${
                        feedback[String(i)] === 'up'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title="This was helpful"
                    >👍</button>
                    <button
                      onClick={() => handleFeedback(i, 'down')}
                      className={`text-sm px-1.5 py-0.5 rounded-lg transition-all ${
                        feedback[String(i)] === 'down'
                          ? 'bg-red-500/20 text-red-400'
                          : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title="This wasn't helpful"
                    >👎</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-card p-4 rounded-2xl">
              <span className="text-xs text-slate-500 block mb-2 font-semibold">🧠 AI Coach</span>
              <div className="flex gap-1.5">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 rounded-full bg-blue-400" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="w-2 h-2 rounded-full bg-purple-400" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Live Voice Transcript Preview */}
      {isListening && liveTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 italic flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          Hearing: "{liveTranscript}"
        </motion.div>
      )}

      {/* Input */}
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={toggleListening}
          className={`p-3 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${isListening ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
          title={isListening ? 'Stop listening' : 'Voice Input — speak your question'}>
          {isListening ? '🛑' : '🎤'}
        </button>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          className="input-premium flex-1"
          placeholder={isListening ? '🎤 Listening... speak your question' : 'Ask about burnout, sleep, finances, career, recovery...'}
          disabled={typing} />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || typing}
          className="btn-primary px-6">Send</button>
      </div>
    </div>
  );
}
