/**
 * ElevenLabs TTS hook  (optional upgrade over Web Speech API)
 *
 * Requirements:
 *   1. Set REACT_APP_ELEVENLABS_KEY in your .env file
 *   2. Set REACT_APP_ELEVENLABS_VOICE_ID  (find IDs at elevenlabs.io)
 *
 * This hook uses the ElevenLabs streaming endpoint and pipes audio through
 * Web Audio API so we can extract amplitude data for realistic mouth sync.
 */

import { useState, useCallback, useRef } from 'react';

const API_KEY  = process.env.REACT_APP_ELEVENLABS_KEY    || '';
const VOICE_ID = process.env.REACT_APP_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // default "Bella"

export function useElevenLabsSpeech() {
  const [isSpeaking, setIsSpeaking]    = useState(false);
  const [amplitude,  setAmplitude]     = useState(0);  // 0‒1, live amplitude
  const audioCtxRef  = useRef(null);
  const sourceRef    = useRef(null);
  const analyserRef  = useRef(null);
  const rafRef       = useRef(null);

  /** Poll the analyser for RMS amplitude and expose as `amplitude`. */
  const pollAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const buf = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    setAmplitude(Math.min(1, rms * 5));
    rafRef.current = requestAnimationFrame(pollAmplitude);
  }, []);

  const speak = useCallback(async (text) => {
    if (!API_KEY) {
      console.warn('[ElevenLabs] REACT_APP_ELEVENLABS_KEY not set, falling back to silence.');
      return;
    }

    // Stop any ongoing audio
    sourceRef.current?.stop();
    cancelAnimationFrame(rafRef.current);

    setIsSpeaking(true);

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      );

      if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`);

      const arrayBuffer = await res.arrayBuffer();

      // Decode and play through Web Audio API for amplitude analysis
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx     = audioCtxRef.current;
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      const source   = ctx.createBufferSource();
      source.buffer  = decoded;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      source.onended = () => {
        setIsSpeaking(false);
        setAmplitude(0);
        cancelAnimationFrame(rafRef.current);
      };

      sourceRef.current = source;
      source.start();
      pollAmplitude();
    } catch (err) {
      console.error('[ElevenLabs]', err);
      setIsSpeaking(false);
    }
  }, [pollAmplitude]);

  const cancel = useCallback(() => {
    sourceRef.current?.stop();
    cancelAnimationFrame(rafRef.current);
    setIsSpeaking(false);
    setAmplitude(0);
  }, []);

  return { speak, cancel, isSpeaking, amplitude };
}
