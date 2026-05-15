import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { createStream, sendSdpAnswer, sendIceCandidate, speakText, destroyStream, keepAlive } from '../services/api';
import './AvatarStream.css';

const urlTone = new URLSearchParams(window.location.search).get('tone') || 'Friendly';

const DID_THUMBNAIL_URL =
  'https://agents-results.d-id.com/google-oauth2%7C112562596238380945228/v2_agt_qXniINVX/thumbnail.png';

const TONE_SPEECH = {
  Friendly:     { rate: 1.0,  pitch: 1.15 },
  Professional: { rate: 0.9,  pitch: 1.05 },
  Casual:       { rate: 1.05, pitch: 1.2  },
  Enthusiastic: { rate: 1.15, pitch: 1.35 },
};

const AvatarStream = forwardRef(({ onReady, onSpeakStart, onSpeakEnd }, ref) => {
  const [status, setStatus]           = useState('connecting');
  const [videoActive, setVideoActive] = useState(false);

  const statusRef      = useRef('connecting');
  const videoRef       = useRef(null);
  const peerRef        = useRef(null);
  const streamIdRef    = useRef(null);
  const sessionIdRef   = useRef(null);
  const didReadyRef    = useRef(false);
  const unmountedRef   = useRef(false);
  const keepaliveRef   = useRef(null);
  const talkPollRef    = useRef(null);
  const lastTimeRef    = useRef(-1);

  const updateStatus = useCallback((s) => { statusRef.current = s; setStatus(s); }, []);

  // Poll video.currentTime — if it advances, avatar is talking; if stale for 800ms, done
  const startTalkPoll = useCallback(() => {
    if (talkPollRef.current) clearInterval(talkPollRef.current);
    let stale = 0;
    lastTimeRef.current = -1;
    talkPollRef.current = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const t = v.currentTime;
      if (t !== lastTimeRef.current) { stale = 0; lastTimeRef.current = t; setVideoActive(true); }
      else {
        stale++;
        if (stale >= 4) {
          clearInterval(talkPollRef.current); talkPollRef.current = null;
          setVideoActive(false);
          if (statusRef.current === 'speaking') { updateStatus('ready'); onSpeakEnd?.(); }
        }
      }
    }, 200);
  }, [updateStatus, onSpeakEnd]);

  useEffect(() => {
    unmountedRef.current = false;

    const init = async () => {
      try {
        // 1. Create D-ID stream — server makes the API call, no browser CORS
        const data = await createStream();
        if (unmountedRef.current) return;

        const { id, session_id, offer, ice_servers } = data;
        streamIdRef.current  = id;
        sessionIdRef.current = session_id;

        // 2. WebRTC peer connection with D-ID's ICE servers
        const pc = new RTCPeerConnection({ iceServers: ice_servers });
        peerRef.current = pc;

        // 3. D-ID sends video+audio tracks — attach to video element
        pc.ontrack = ({ streams: [remote] }) => {
          if (videoRef.current && !unmountedRef.current) {
            videoRef.current.srcObject = remote;
          }
        };

        // 4. Forward our ICE candidates to D-ID via server
        pc.onicecandidate = ({ candidate }) => {
          if (candidate && streamIdRef.current && sessionIdRef.current) {
            sendIceCandidate(streamIdRef.current, candidate, sessionIdRef.current).catch(console.warn);
          }
        };

        // 5. SDP handshake
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSdpAnswer(id, { type: answer.type, sdp: answer.sdp }, session_id);

        if (!unmountedRef.current) {
          didReadyRef.current = true;
          updateStatus('ready');
          onReady?.();
          console.log('[D-ID Streams] connected and ready');

          // Keepalive every 25s so D-ID stream doesn't idle out at 30s
          keepaliveRef.current = setInterval(() => {
            if (streamIdRef.current && sessionIdRef.current && statusRef.current !== 'speaking') {
              keepAlive(streamIdRef.current, sessionIdRef.current).catch(() => {});
            }
          }, 25000);
        }

      } catch (e) {
        console.error('[D-ID Streams] init failed:', e);
        if (!unmountedRef.current) {
          updateStatus('ready'); // fall through to browser TTS
          onReady?.();
        }
      }
    };

    init();

    return () => {
      unmountedRef.current = true;
      if (keepaliveRef.current)  clearInterval(keepaliveRef.current);
      if (talkPollRef.current)   clearInterval(talkPollRef.current);
      if (peerRef.current)       { peerRef.current.close(); peerRef.current = null; }
      if (streamIdRef.current && sessionIdRef.current) {
        destroyStream(streamIdRef.current, sessionIdRef.current).catch(() => {});
      }
      streamIdRef.current  = null;
      sessionIdRef.current = null;
      didReadyRef.current  = false;
    };
  }, []); // eslint-disable-line

  useImperativeHandle(ref, () => ({

    // Must be called inside a user-gesture handler (before any await) to unlock autoplay
    unlockAudio: () => {
      if (videoRef.current) videoRef.current.muted = false;
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
        window.speechSynthesis.cancel();
      }
    },

    speak: (text) => {
      if (!text) return;

      if (didReadyRef.current && streamIdRef.current && sessionIdRef.current) {
        // ── D-ID Streams path: lip-sync via WebRTC ───────────────────────────
        updateStatus('speaking');
        onSpeakStart?.();
        if (talkPollRef.current) { clearInterval(talkPollRef.current); talkPollRef.current = null; }

        speakText(streamIdRef.current, sessionIdRef.current, text, urlTone)
          .then(() => {
            // Give D-ID 400ms to start sending frames before polling
            setTimeout(() => { if (!unmountedRef.current) startTalkPoll(); }, 400);
          })
          .catch((err) => {
            console.warn('[D-ID Streams] speak failed:', err);
            updateStatus('ready'); onSpeakEnd?.();
          });

      } else {
        // ── Fallback: browser TTS (audio only, no lip-sync) ──────────────────
        if (!('speechSynthesis' in window)) { updateStatus('ready'); onSpeakEnd?.(); return; }

        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        const { rate = 1.0, pitch = 1.1 } = TONE_SPEECH[urlTone] || {};
        utter.rate = rate; utter.pitch = pitch; utter.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const en = voices.filter(v => v.lang.startsWith('en'));
        const female = en.find(v => /jenny|aria|zira|hazel|sonia|samantha|karen|moira/i.test(v.name))
                    || en.find(v => !/david|mark|james|alex|daniel|george/i.test(v.name))
                    || en[0];
        if (female) utter.voice = female;

        updateStatus('speaking');
        onSpeakStart?.();
        utter.onend   = () => { updateStatus('ready'); onSpeakEnd?.(); };
        utter.onerror = () => { updateStatus('ready'); onSpeakEnd?.(); };
        window.speechSynthesis.speak(utter);
      }
    },

    isReady: () => statusRef.current === 'ready' || statusRef.current === 'speaking',
  }));

  const statusLabel = {
    connecting: '⏳ Connecting…',
    ready:      '🟢 Ready',
    speaking:   '💬 Speaking…',
    error:      '🔴 Error',
  }[status] || status;

  return (
    <div className="avatar-container">
      <div className={`avatar-status avatar-status--${status}`}>{statusLabel}</div>

      {/* D-ID WebRTC stream — muted at start, unlockAudio() unmutes before first speak */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', borderRadius: '20px',
        }}
      />

      {/* Thumbnail — always on top, fades out only when D-ID sends live lip-sync frames */}
      <img
        src={DID_THUMBNAIL_URL}
        alt="ORBI"
        className={status === 'speaking' && !videoActive ? 'avatar-thumbnail-speaking' : ''}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', borderRadius: '20px',
          opacity: videoActive ? 0 : 1,
          transition: 'opacity 0.35s ease',
          filter: status === 'connecting' ? 'brightness(0.55)' : 'brightness(0.9)',
          pointerEvents: 'none',
        }}
        onError={(e) => { e.stopPropagation(); e.target.onerror = null; e.target.src = '/avatar.jpg'; }}
      />
    </div>
  );
});

export default AvatarStream;
