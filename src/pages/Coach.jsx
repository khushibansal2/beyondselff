import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { chatWithAI } from '../services/aiService';
import { createVoiceRecognition } from '../services/voiceService';
import { showToast } from '../components/ui/Components';

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
      (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
        setLiveTranscript('');
      },
      () => {
        setIsListening(false);
        setLiveTranscript('');
      }
    );
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition is not supported in your browser.', 'info');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setLiveTranscript('');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // ---- Initialize / restore chat history ----
  useEffect(() => {
    if (!aiCache.coachHistory || aiCache.coachHistory.length === 0) {
      const scoreIntro = computed?.hasData
        ? `\n\nBased on your Digital Twin metrics:\n• 💚 Health: ${hs}/100 • 💰 Finance: ${fs}/100 • 🎯 Career: ${cs}/100 • ⚖️ Life Balance: ${bal}/100 • 🔥 Burnout Risk: ${burnoutRisk}% (${burnoutLevel})`
        : '\n\nTo unlock personalized insights, try logging some metrics in Health, Finance, or Career.';

      const initialMessage = {
        role: 'ai',
        text: `Hello ${user?.name || 'Yash'}! 👋 I'm your AI Life Coach. I explain your metrics and run proactive simulators.${scoreIntro}\n\nWhat can I help you with today?`,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialMessage]);
      updateAICache({ coachHistory: [initialMessage] });
    } else if (messages.length === 0) {
      setMessages(aiCache.coachHistory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCache.coachHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim() || typing) return;

    const ts = new Date().toISOString();
    const userMsg = { role: 'user', text: text.trim(), timestamp: ts };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLiveTranscript('');
    setTyping(true);

    const contextWithSim = { ...computed, lastSimulation: aiCache.lastSimulation };
    const result = await chatWithAI(text.trim(), contextWithSim, newMessages);

    const aiMsg = {
      role: 'ai',
      text: result.response,
      source: result.source,
      timestamp: new Date().toISOString(),
    };

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
    const existing = feedback[key];
    const newFeedback = { ...feedback, [key]: existing === vote ? null : vote };
    setFeedback(newFeedback);

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
    <div style={{ padding: '16px 20px 24px', height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f172a 0%, #0c1120 100%)', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 20, color: '#3b82f6' }}>💬</span>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>AI Life Coach</h1>
          </div>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Grounded coaching powered by your Digital Twin's deterministic intelligence.</p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
          padding: '4px 10px', borderRadius: 99, fontSize: 10, color: '#34d399', fontWeight: 600
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
          Twin Connected
        </div>
      </div>

      {/* ── Twin Context Dashboard ─────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        marginBottom: 12,
        padding: '10px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBox: 'space-between', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', trackingWidth: '0.05em' }}>Real-time Twin Telemetry</span>
          <span style={{ fontSize: 9, color: '#334155', background: 'rgba(255,255,255,0.03)', padding: '1px 6px', borderRadius: 99 }}>Encrypted End-to-End</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { label: 'Health', value: `${hs}/100`, color: '#10b981' },
            { label: 'Finance', value: `${fs}/100`, color: '#3b82f6' },
            { label: 'Career', value: `${cs}/100`, color: '#8b5cf6' },
            { label: 'Life Balance', value: `${bal}/100`, color: '#f59e0b' },
            { label: 'Burnout Risk', value: `${burnoutRisk}%`, color: '#ef4444' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(0,0,0,0.12)', padding: '6px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.02)'
            }}>
              <p style={{ fontSize: 9, color: '#475569', margin: '0 0 1px' }}>{item.label}</p>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</h4>
            </div>
          ))}
        </div>

        {/* Active cross-domain alerts row */}
        {(urgentAlerts.length > 0 || crossDomain.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {urgentAlerts.slice(0, 2).map((a, i) => (
              <span key={i} style={{ fontSize: 8, padding: '1px 6px', borderRadius: 99, background: 'rgba(239,68,68,0.08)', color: '#f87171', fontWeight: 500 }}>
                🚨 {a.text}
              </span>
            ))}
            {crossDomain.slice(0, 2).map((cd, i) => (
              <span key={i} style={{ fontSize: 8, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontWeight: 500 }}>
                🔗 {cd.id.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat Messages Container ────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: 12,
        paddingRight: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.map((msg, i) => {
          const isAI = msg.role === 'ai';
          return (
            <motion.div
              key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                justifyContent: isAI ? 'flex-start' : 'flex-end',
                gap: 8,
              }}
            >
              {isAI && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  🧠
                </div>
              )}
              
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: 12,
                fontSize: 12.5,
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
                position: 'relative',
                background: isAI ? 'rgba(255, 255, 255, 0.02)' : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                border: isAI ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(59,130,246,0.25)',
                color: isAI ? '#cbd5e1' : '#f1f5f9',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}>
                {isAI && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                      AI Coach
                      {msg.source === 'fallback' && <span style={{ fontSize: 8, padding: '0px 4px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>Local</span>}
                      {msg.source === 'groq-direct' && <span style={{ fontSize: 8, padding: '0px 4px', borderRadius: 3, background: 'rgba(139,92,246,0.1)', color: '#c084fc' }}>Cloud</span>}
                    </span>
                  </div>
                )}

                {msg.text}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: isAI ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingTop: isAI ? 6 : 0 }}>
                  <span style={{ fontSize: 9, color: isAI ? '#334155' : 'rgba(255,255,255,0.35)' }}>{formatTime(msg.timestamp)}</span>
                  
                  {isAI && i > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: '#334155' }}>Helpful?</span>
                      <button
                        onClick={() => handleFeedback(i, 'up')}
                        style={{
                          background: feedback[String(i)] === 'up' ? 'rgba(16,185,129,0.1)' : 'transparent',
                          border: 'none', padding: '1px 6px', borderRadius: 4, cursor: 'pointer',
                          color: feedback[String(i)] === 'up' ? '#34d399' : '#334155', fontSize: 10, transition: 'all 0.2s'
                        }}
                      >👍</button>
                      <button
                        onClick={() => handleFeedback(i, 'down')}
                        style={{
                          background: feedback[String(i)] === 'down' ? 'rgba(239,68,68,0.1)' : 'transparent',
                          border: 'none', padding: '1px 6px', borderRadius: 4, cursor: 'pointer',
                          color: feedback[String(i)] === 'down' ? '#f87171' : '#334155', fontSize: 10, transition: 'all 0.2s'
                        }}
                      >👎</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, flexShrink: 0
            }}>🧠</div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)',
              padding: '10px 14px', borderRadius: 12, display: 'flex', gap: 3, alignItems: 'center'
            }}>
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#60a5fa' }} />
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa' }} />
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399' }} />
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Live Voice Transcript Preview ───────────────────────── */}
      {isListening && liveTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 8, padding: '6px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
          Hearing: "{liveTranscript}"
        </motion.div>
      )}

      {/* ── Quick Question Suggestions ─────────────────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 4 }}>
        {quickQuestions.map(({ q, icon }) => (
          <button
            key={q} onClick={() => sendMessage(q)}
            style={{
              whiteSpace: 'nowrap', fontSize: 10, padding: '4px 10px', borderRadius: 99,
              background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)',
              color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#cbd5e1';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <span>{icon}</span>{q}
          </button>
        ))}
      </div>

      {/* ── Interactive Input Box ──────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.04)',
        padding: '6px 8px',
        borderRadius: 12,
        alignItems: 'center'
      }}>
        <button
          onClick={toggleListening}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: isListening ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
            color: isListening ? '#f87171' : '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            transition: 'all 0.2s'
          }}
          title={isListening ? 'Stop listening' : 'Voice Input'}
        >
          {isListening ? '🛑' : '🎤'}
        </button>

        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: 12, padding: '0 2px'
          }}
          placeholder={isListening ? 'Listening... Speak your question' : 'Ask about burnout, sleep, finances, career...'}
          disabled={typing}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || typing}
          style={{
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: (!input.trim() || typing) ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: (!input.trim() || typing) ? '#334155' : '#fff', fontWeight: 600, fontSize: 11,
            cursor: (!input.trim() || typing) ? 'default' : 'pointer', transition: 'all 0.2s',
            boxShadow: (!input.trim() || typing) ? 'none' : '0 1px 6px rgba(59,130,246,0.2)'
          }}
        >
          Send
        </button>
      </div>

    </div>
  );
}
