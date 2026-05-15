import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChatInterface.css';

const STORAGE_KEY = 'orbi_history';
const GREETING    = "Hello! I'm Orbi, your AI assistant. How can I help you today?";
const INIT_MSGS   = [{ role: 'assistant', text: GREETING }];

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveSessions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function dateLabel(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return d.toLocaleDateString('en', { weekday: 'long' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatInterface({ onSend, disabled }) {
  const [sessions,     setSessions]    = useState(loadSessions);
  const [sessionId,    setSessionId]   = useState(null);
  const [messages,     setMessages]    = useState(INIT_MSGS);
  const [input,        setInput]       = useState('');
  const [thinking,     setThinking]    = useState(false);
  const [listening,    setListening]   = useState(false);
  const [micError,     setMicError]    = useState('');
  const [sidebarOpen,  setSidebarOpen] = useState(true);

  const bottomRef    = useRef(null);
  const mediaRecRef  = useRef(null);
  const recogRef     = useRef(null);
  const chunksRef    = useRef([]);
  const sessionIdRef = useRef(null);      // mirrors sessionId for closures
  const messagesRef  = useRef(INIT_MSGS); // mirrors messages for closures

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { messagesRef.current  = messages;  }, [messages]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);
  useEffect(() => {
    window.parent.postMessage({ type: 'orbi-thinking', value: thinking }, '*');
  }, [thinking]);

  // ── Session helpers ────────────────────────────────────────────────────────
  const persist = useCallback((msgs, sid) => {
    if (msgs.length <= 1) return; // only greeting, nothing to save yet
    const title = msgs.find(m => m.role === 'user')?.text?.slice(0, 52) || 'Chat';
    setSessions(prev => {
      const exists = prev.find(s => s.id === sid);
      const updated = exists
        ? prev.map(s => s.id === sid ? { ...s, messages: msgs } : s)
        : [{ id: sid, title, createdAt: new Date().toISOString(), messages: msgs }, ...prev];
      saveSessions(updated);
      return updated;
    });
  }, []);

  const startNewChat = () => {
    setSessionId(null);
    setMessages(INIT_MSGS);
    setInput('');
    setMicError('');
  };

  const loadSession = (s) => {
    setSessionId(s.id);
    setMessages(s.messages);
    setInput('');
    setMicError('');
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
    if (sessionIdRef.current === id) startNewChat();
  };

  // ── Send helpers ───────────────────────────────────────────────────────────
  const doSend = useCallback(async (text, prevMsgs) => {
    const sid = sessionIdRef.current || Date.now().toString();
    if (!sessionIdRef.current) {
      setSessionId(sid);
      sessionIdRef.current = sid;
    }
    const withUser = [...prevMsgs, { role: 'user', text }];
    setMessages(withUser);
    setThinking(true);
    let finalMsgs;
    try {
      const reply = await onSend(text, prevMsgs);
      finalMsgs = [...withUser, { role: 'assistant', text: reply }];
    } catch {
      finalMsgs = [...withUser, { role: 'assistant', text: '⚠️ Something went wrong. Please try again.' }];
    } finally {
      setThinking(false);
    }
    setMessages(finalMsgs);
    persist(finalMsgs, sid);
    return finalMsgs;
  }, [onSend, persist]);

  const handleSend = async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || thinking || disabled) return;
    setInput('');
    await doSend(text, messages);
  };

  // ── Mic ────────────────────────────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    setMicError('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // ── Path A: Web Speech API (Chrome / Edge — no API key needed) ──────────
    if (SpeechRecognition) {
      if (listening) {
        recogRef.current?.stop();
        setListening(false);
        return;
      }

      try {
        // Request mic permission first so we get a clear error if denied
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setMicError('Microphone access denied. Please allow mic in browser settings.');
        return;
      }

      const recog = new SpeechRecognition();
      recog.lang            = 'en-US';
      recog.interimResults  = false;
      recog.maxAlternatives = 1;
      recog.continuous      = false;

      recog.onstart  = () => setListening(true);
      recog.onend    = () => setListening(false);

      recog.onerror = (e) => {
        setListening(false);
        if      (e.error === 'no-speech')    setMicError('No speech detected — tap the mic and speak clearly.');
        else if (e.error === 'not-allowed')  setMicError('Microphone access denied. Check browser permissions.');
        else if (e.error === 'network')      setMicError('Network error during recognition. Check your connection.');
        else                                  setMicError(`Voice error: ${e.error}. Please try again.`);
      };

      recog.onresult = (e) => {
        const spoken = e.results[0][0].transcript.trim();
        if (spoken) doSend(spoken, messagesRef.current);
        else setMicError("Couldn't hear clearly — speak louder and try again.");
      };

      recogRef.current = recog;
      try {
        recog.start();
      } catch {
        setMicError('Could not start voice recognition. Please try again.');
      }
      return;
    }

    // ── Path B: MediaRecorder + Whisper (Firefox fallback) ─────────────────
    if (listening) { mediaRecRef.current?.stop(); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus' :
        'audio/ogg';

      const rec = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        if (chunksRef.current.length === 0) { setMicError('No audio captured. Please try again.'); return; }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1500) { setMicError('Too short — hold mic and speak, then tap again to send.'); return; }

        const baseMime = mimeType.split(';')[0];
        const fileName = baseMime.includes('ogg') ? 'audio.ogg' : 'audio.webm';
        const formData = new FormData();
        formData.append('audio', blob, fileName);

        setThinking(true);
        try {
          const res  = await fetch('http://localhost:3001/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) {
            setMicError(res.status === 429
              ? 'OpenAI quota exceeded — voice input unavailable. Please top up at platform.openai.com.'
              : 'Transcription failed. Make sure the chat server is running.');
            return;
          }
          const spoken = data.text?.trim();
          if (spoken) doSend(spoken, messagesRef.current);
          else setMicError("Couldn't hear clearly — speak louder and try again.");
        } catch {
          setMicError('Transcription failed. Make sure the chat server is running.');
        } finally {
          setThinking(false);
        }
      };

      mediaRecRef.current = rec;
      rec.start(250);
      setListening(true);
    } catch {
      setMicError('Microphone access denied.');
    }
  }, [listening, thinking, disabled, doSend]); // eslint-disable-line

  // ── Sidebar groups ─────────────────────────────────────────────────────────
  const grouped = sessions.reduce((acc, s) => {
    const lbl = dateLabel(s.createdAt);
    (acc[lbl] = acc[lbl] || []).push(s);
    return acc;
  }, {});

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`chat-root${sidebarOpen ? '' : ' chat-root--collapsed'}`}>

      {/* ── Sidebar ── */}
      <div className={`chat-sidebar${sidebarOpen ? '' : ' chat-sidebar--hidden'}`}>
        <div className="sidebar-top">
          <span className="sidebar-title">History</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} title="Close">✕</button>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          <span className="new-chat-btn__icon">＋</span> New Chat
        </button>

        <div className="sidebar-list">
          {Object.keys(grouped).length === 0 && (
            <p className="sidebar-empty">No history yet.<br />Start chatting!</p>
          )}
          {Object.entries(grouped).map(([label, group]) => (
            <div key={label} className="sidebar-group">
              <div className="sidebar-date">{label}</div>
              {group.map(s => (
                <div
                  key={s.id}
                  className={`sidebar-item${s.id === sessionId ? ' sidebar-item--active' : ''}`}
                  onClick={() => loadSession(s)}
                  title={s.title}
                >
                  <span className="sidebar-item__title">{s.title}</span>
                  <button
                    className="sidebar-item__del"
                    onClick={e => deleteSession(e, s.id)}
                    title="Delete"
                  >🗑</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className="chat-panel">
        <div className="chat-header">
          {!sidebarOpen && (
            <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)} title="Chat history">☰</button>
          )}
          <div className="chat-header__dot" />
          <span className="chat-header__name">ORBI</span>
          <span className="chat-header__sub">AI Assistant</span>
        </div>

        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
              {m.role === 'assistant' && <div className="chat-bubble__avatar">O</div>}
              <div className="chat-bubble__text">{m.text}</div>
            </div>
          ))}
          {thinking && (
            <div className="chat-bubble chat-bubble--assistant">
              <div className="chat-bubble__avatar">O</div>
              <div className="chat-bubble__text chat-bubble__thinking">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {micError && <div className="mic-error">{micError}</div>}

        <div className="chat-input">
          <button
            className={`mic-btn${listening ? ' mic-btn--active' : ''}`}
            onClick={toggleMic}
            disabled={thinking || disabled}
            title={listening ? 'Tap to stop & send' : 'Speak to ORBI'}
          >
            {listening ? '🔴' : '🎤'}
          </button>
          <input
            type="text"
            placeholder={listening ? 'Listening… tap 🔴 to send' : 'Ask ORBI anything…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={thinking || disabled}
          />
          <button className="send-btn" onClick={() => handleSend()} disabled={thinking || disabled || !input.trim()}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
