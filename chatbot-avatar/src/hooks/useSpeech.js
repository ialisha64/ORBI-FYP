import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Web Speech API TTS hook.
 *
 * Returns:
 *   speak(text)   – speak a string
 *   cancel()      – stop current speech
 *   isSpeaking    – boolean, true while audio is playing
 *   voices        – available SpeechSynthesisVoice[]
 *   selectedVoice – currently selected voice index
 *   setVoice      – setter for selectedVoice
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [voices, setVoices]             = useState([]);
  const [selectedVoice, setVoice]       = useState(0);
  const utteranceRef = useRef(null);
  const synthRef     = useRef(window.speechSynthesis);

  const FEMALE_RE = /zira|jenny|aria|hazel|helen|sonia|samantha|karen|moira|tessa|eva|susan|cortana|google uk english female|google us english/i;
  const MALE_RE   = /david|mark|james|alex|daniel|george|thomas|richard|fred/i;

  // Load available voices and auto-select a female one
  useEffect(() => {
    const loadVoices = () => {
      const v = synthRef.current.getVoices();
      if (v.length === 0) return;
      setVoices(v);
      const en = v.filter(x => x.lang.startsWith('en'));
      const femaleIdx = v.indexOf(
        en.find(x => FEMALE_RE.test(x.name)) ||
        en.find(x => !MALE_RE.test(x.name)) ||
        v[0]
      );
      setVoice(femaleIdx >= 0 ? femaleIdx : 0);
    };
    loadVoices();
    synthRef.current.addEventListener('voiceschanged', loadVoices);
    return () => synthRef.current.removeEventListener('voiceschanged', loadVoices);
  }, []); // eslint-disable-line

  const speak = useCallback((text) => {
    if (!text) return;
    try {
      synthRef.current.cancel(); // stop any ongoing speech

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate   = 0.95;
      utter.pitch  = 1.2;
      utter.volume = 1;

      if (voices.length > 0 && voices[selectedVoice]) {
        utter.voice = voices[selectedVoice];
      }

      utter.onstart = () => setIsSpeaking(true);
      utter.onend   = () => setIsSpeaking(false);
      utter.onerror = (e) => {
        // 'interrupted' fires when cancel() is called — not a real error
        if (e.error !== 'interrupted') console.warn('[TTS]', e.error);
        setIsSpeaking(false);
      };

      utteranceRef.current = utter;
      synthRef.current.speak(utter);
    } catch (err) {
      console.warn('[TTS] speak() failed:', err);
      setIsSpeaking(false);
    }
  }, [voices, selectedVoice]);

  const cancel = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking, voices, selectedVoice, setVoice };
}
