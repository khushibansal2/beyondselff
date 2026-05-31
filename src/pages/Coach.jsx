import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { chatWithAI } from '../services/aiService';
import { createVoiceRecognition } from '../services/voiceService';
import { showToast } from '../components/ui/Components';

const HISTORY_LIMIT = 40;

const quickQuestions = [
  { q: "How am I doing overall?",            icon: "📊" },
  { q: "Why did my burnout increase?",       icon: "🔥" },
  { q: "Why is my balance score dropping?",  icon: "📉" },
  { q: "Am I recovering?",                   icon: "📈" },
  { q: "Am I ready for placements?",         icon: "🎯" },
  { q: "How's my sleep affecting me?",       icon: "😴" },
  { q: "What should I focus on today?",      icon: "📋" },
  { q: "Which path is healthier long-term?", icon: "🔮" },
];

export default function Coach() {
  const { user } = useAuth();
  const { computed, aiCache, updateAICache } = useData();

  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [typing,         setTyping]         = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [feedback,       setFeedback]       = useState({});
  const endRef        = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef       = useRef(null);

  const hs           = computed?.healthScore?.score  ?? 0;
  const fs           = computed?.financeScore?.score ?? 0;
  const cs           = computed?.careerScore?.score  ?? 0;
  const bal          = computed?.balance             ?? 0;
  const burnoutRisk  = computed?.burnout?.risk       ?? 0;
  const burnoutLevel = computed?.burnout?.level      ?? 'none';
  const crossDomain  = computed?.crossDomain         || [];
  const urgentAlerts = computed?.urgentAlerts        || [];

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
      ()    => { setIsListening(false); setLiveTranscript(''); }
    );
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { showToast('Speech recognition not supported in your browser.', 'info'); return; }
    if (isListening) { recognitionRef.current.stop(); setLiveTranscript(''); }
    else             { recognitionRef.current.start(); setIsListening(true); }
  };

  const GREETING_VERSION = 'v2';
  useEffect(() => {
    const cachedVersion = aiCache.greetingVersion;
    if (!aiCache.coachHistory || aiCache.coachHistory.length === 0 || cachedVersion !== GREETING_VERSION) {
      const scoreIntro = computed?.hasData
        ? `\n\nYour Digital Twin metrics:\n• 💚 Health ${hs}/100  • 💰 Finance ${fs}/100  • 🎯 Career ${cs}/100  • ⚖️ Balance ${bal}/100  • 🔥 Burnout ${burnoutRisk}% (${burnoutLevel})`
        : '\n\nLog some metrics in Health, Finance, or Career to unlock personalized insights.';
      const initialMessage = {
        role: 'ai',
        text: `Hey ${user?.name || 'there'} 👋\n\nI'm your AI Life Coach — built into your Digital Twin. I don't give generic advice. Every insight I share is grounded in your actual health, finance, and career data.${scoreIntro}\n\nI can help you understand what's really driving your scores, catch patterns you might have missed, and figure out your highest-leverage next move.\n\nWhat's on your mind?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialMessage]);
      updateAICache({ coachHistory: [initialMessage], greetingVersion: GREETING_VERSION });
    } else if (messages.length === 0) {
      setMessages(aiCache.coachHistory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCache.coachHistory]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || typing) return;
    const ts      = new Date().toISOString();
    const userMsg = { role: 'user', text: text.trim(), timestamp: ts };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLiveTranscript('');
    setTyping(true);

    const contextWithSim = {
      ...computed,
      lastSimulation:      aiCache.lastSimulation,
      feedbackPreferences: aiCache.feedbackPreferences || [],
      feedbackDislikes:    aiCache.feedbackDislikes    || [],
    };
    const result = await chatWithAI(text.trim(), contextWithSim, newMessages);
    const aiMsg  = { role: 'ai', text: result.response, source: result.source, timestamp: new Date().toISOString() };
    const finalMessages = [...newMessages, aiMsg];
    const bounded = finalMessages.length > HISTORY_LIMIT
      ? [finalMessages[0], ...finalMessages.slice(-(HISTORY_LIMIT - 1))]
      : finalMessages;
    setMessages(bounded);
    updateAICache({ coachHistory: bounded });
    setTyping(false);
  };

  const handleFeedback = (msgIndex, vote) => {
    const key = String(msgIndex);
    const newFeedback = { ...feedback, [key]: feedback[key] === vote ? null : vote };
    setFeedback(newFeedback);
    const likedTexts    = messages.filter((m, i) => m.role === 'ai' && newFeedback[String(i)] === 'up').map(m => m.text.slice(0, 120));
    const dislikedTexts = messages.filter((m, i) => m.role === 'ai' && newFeedback[String(i)] === 'down').map(m => m.text.slice(0, 120));
    updateAICache({ feedbackPreferences: likedTexts, feedbackDislikes: dislikedTexts });
    showToast(vote === 'up' ? 'Got it — I\'ll match this style 👍' : 'Noted — I\'ll adjust my approach 👎', 'success');
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const metrics = [
    { label: 'Health',   value: hs,          unit: '/100', color: '#10b981' },
    { label: 'Finance',  value: fs,           unit: '/100', color: '#f59e0b' },
    { label: 'Career',   value: cs,           unit: '/100', color: '#3b82f6' },
    { label: 'Balance',  value: bal,          unit: '/100', color: '#8b5cf6' },
    { label: 'Burnout',  value: burnoutRisk,  unit: '%',    color: '#f43f5e' },
  ];

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #080d18 0%, #0c1120 60%, #0f172a 100%)',
      fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '16px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧠</div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>AI Life Coach</h1>
              <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>Powered by your Digital Twin</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)', fontSize: 10, color: '#34d399', fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} className="animate-pulse" />
            Twin Connected
          </div>
        </div>

        {/* Metrics strip */}
        <div style={{ display: 'flex', gap: 8, paddingBottom: 14, overflowX: 'auto' }} className="hide-scrollbar">
          {metrics.map(m => (
            <div key={m.label} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
              </div>
              <div>
                <p style={{ fontSize: 9, color: '#475569', margin: 0, fontWeight: 500 }}>{m.label}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: m.color, margin: 0, lineHeight: 1 }}>{m.value}<span style={{ fontSize: 9, fontWeight: 500, color: '#334155' }}>{m.unit}</span></p>
              </div>
            </div>
          ))}

          {/* Alerts */}
          {urgentAlerts.slice(0, 2).map((a, i) => (
            <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 10, color: '#f87171', maxWidth: 200 }}>
              <span style={{ flexShrink: 0 }}>🚨</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</span>
            </div>
          ))}
          {crossDomain.slice(0, 2).map((cd, i) => (
            <div key={i} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 10, color: '#fbbf24', maxWidth: 200 }}>
              <span style={{ flexShrink: 0 }}>🔗</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cd.id.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat Messages ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
           className="hide-scrollbar">
        {messages.map((msg, i) => {
          const isAI = msg.role === 'ai';
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', gap: 10, alignItems: 'flex-end' }}>

              {/* AI avatar */}
              {isAI && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: '0 0 12px rgba(99,102,241,0.2)' }}>
                  🧠
                </div>
              )}

              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                {/* Source badge */}
                {isAI && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1' }}>AI Coach</span>
                    {msg.source === 'fallback' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>Local</span>}
                    {msg.source === 'groq-direct' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(168,85,247,0.1)', color: '#c084fc' }}>Cloud</span>}
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  background: isAI
                    ? 'rgba(255,255,255,0.04)'
                    : 'linear-gradient(135deg,#4f46e5,#3b82f6)',
                  border: isAI
                    ? '1px solid rgba(255,255,255,0.07)'
                    : 'none',
                  color: isAI ? '#cbd5e1' : '#ffffff',
                  boxShadow: isAI ? 'none' : '0 4px 16px rgba(79,70,229,0.25)',
                }}>
                  {msg.text}
                </div>

                {/* Footer: time + feedback */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: '#334155' }}>{formatTime(msg.timestamp)}</span>
                  {isAI && i > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 9, color: '#2d3748' }}>Helpful?</span>
                      {[['up','👍','rgba(16,185,129,0.12)','#34d399'],['down','👎','rgba(239,68,68,0.1)','#f87171']].map(([v,e,bg,c]) => (
                        <button key={v} onClick={() => handleFeedback(i, v)}
                          style={{ background: feedback[String(i)] === v ? bg : 'transparent', border: 'none', padding: '1px 5px', borderRadius: 4, cursor: 'pointer', color: feedback[String(i)] === v ? c : '#2d3748', fontSize: 10, transition: 'all 0.15s' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* User avatar */}
              {!isAI && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {typing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🧠</div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay }}
                  style={{ width: 5, height: 5, borderRadius: '50%', background: ['#60a5fa','#a78bfa','#34d399'][i] }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Voice transcript preview ────────────────────────────────── */}
      <AnimatePresence>
        {isListening && liveTranscript && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ flexShrink: 0, margin: '0 24px 8px', padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} className="animate-pulse" />
            Hearing: "{liveTranscript}"
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom area ─────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>

        {/* Quick questions */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }} className="hide-scrollbar">
          {quickQuestions.map(({ q, icon }) => (
            <button key={q} onClick={() => sendMessage(q)}
              style={{ whiteSpace: 'nowrap', fontSize: 11, padding: '6px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
              <span>{icon}</span>{q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.09)'}`, padding: '8px 10px', borderRadius: 14, transition: 'border-color 0.2s' }}>

          {/* Mic button */}
          <button onClick={toggleListening}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', transition: 'all 0.2s',
              background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
              color: isListening ? '#f87171' : '#64748b' }}
            title={isListening ? 'Stop listening' : 'Voice input'}>
            {isListening ? (
              <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>🛑</motion.span>
            ) : '🎤'}
          </button>

          {/* Text input */}
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={isListening ? 'Listening… speak your question' : 'Ask about burnout, sleep, finances, career…'}
            disabled={typing}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, padding: '0 4px' }} />

          {/* Send button */}
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || typing}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 12, cursor: !input.trim() || typing ? 'default' : 'pointer', transition: 'all 0.2s', flexShrink: 0,
              background: !input.trim() || typing ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6366f1,#3b82f6)',
              color: !input.trim() || typing ? '#334155' : '#fff',
              boxShadow: !input.trim() || typing ? 'none' : '0 2px 12px rgba(99,102,241,0.3)' }}>
            {typing ? (
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : 'Send →'}
          </button>
        </div>

        <p style={{ fontSize: 9, color: '#1e293b', textAlign: 'center', marginTop: 8 }}>AI responses are grounded in your Digital Twin data · Not medical or financial advice</p>
      </div>
    </div>
  );
}
