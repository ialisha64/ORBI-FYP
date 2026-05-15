import { useState } from 'react';
import AvatarPlayer  from './components/AvatarPlayer';
import ChatInterface from './components/ChatInterface';
import { sendChatMessage, waitForVideo } from './services/chatService';
import './App.css';

const urlTone = new URLSearchParams(window.location.search).get('tone') || 'Friendly';

export default function App() {
  const [videoUrl,      setVideoUrl]      = useState(null);
  const [isThinking,    setIsThinking]    = useState(false); // Groq is running
  const [isVideoLoading, setIsVideoLoading] = useState(false); // D-ID is generating

  // Called by ChatInterface on every user message.
  // Returns the text reply immediately so the chat bubble appears fast.
  const handleSend = async (userText, history = []) => {
    setIsThinking(true);
    setIsVideoLoading(false);

    try {
      // Phase 1 — Groq text + D-ID talk creation (~2-3 seconds total)
      const { reply, talkId } = await sendChatMessage(userText, urlTone, history);
      setIsThinking(false);

      // Show text in chat immediately ↑
      // Phase 2 — Poll for D-ID video in background (doesn't block chat)
      if (talkId) {
        setIsVideoLoading(true);
        waitForVideo(talkId, {
          onReady: (url) => {
            setVideoUrl(url);
            setIsVideoLoading(false);
          },
        }).then((url) => {
          if (!url) setIsVideoLoading(false); // timed out or failed
        });
      }

      return reply; // ChatInterface renders this as text bubble
    } catch (e) {
      setIsThinking(false);
      setIsVideoLoading(false);
      console.error('[App] handleSend error:', e);
      throw e;
    }
  };

  return (
    <div className="app">
      {/* Background particles */}
      <div className="bg-particles" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="particle" style={{
            left:              `${(i * 137.5) % 100}%`,
            top:               `${(i * 97.3)  % 100}%`,
            animationDelay:    `${(i * 0.4) % 3}s`,
            animationDuration: `${3 + (i % 4)}s`,
          }} />
        ))}
      </div>

      {/* Title */}
      <header className="app-header">
        <h1>ORBI <span>AI Assistant</span></h1>
        <p>Powered by AI · Voice enabled</p>
      </header>

      {/* Main layout */}
      <main className="app-main">
        <AvatarPlayer
          videoUrl={videoUrl}
          isLoading={isThinking}        /* dim + spinner while Groq runs  */
          isVideoLoading={isVideoLoading} /* subtle indicator while D-ID renders */
        />
        <ChatInterface onSend={handleSend} disabled={isThinking} />
      </main>
    </div>
  );
}
