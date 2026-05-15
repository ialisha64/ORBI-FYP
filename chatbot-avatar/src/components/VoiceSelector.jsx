import React from 'react';
import './VoiceSelector.css';

/**
 * Compact voice picker for Web Speech API voices
 */
export default function VoiceSelector({ voices, selectedVoice, setVoice }) {
  if (!voices.length) return null;

  return (
    <div className="voice-selector">
      <label>Voice:</label>
      <select
        value={selectedVoice}
        onChange={e => setVoice(Number(e.target.value))}
      >
        {voices.map((v, i) => (
          <option key={i} value={i}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
}
