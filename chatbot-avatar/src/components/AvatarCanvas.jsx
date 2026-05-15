import React, { useEffect, useRef } from 'react';
import { useAvatarAnimation } from '../hooks/useAvatarAnimation';
import './AvatarCanvas.css';

/**
 * AvatarCanvas
 * Props:
 *   imageSrc   – path to the portrait image
 *   isSpeaking – boolean from useSpeech hook
 *   size       – canvas size in px (default 420)
 */
export default function AvatarCanvas({ imageSrc, isSpeaking, amplitude = 0, size = 420 }) {
  const canvasRef = useAvatarAnimation(imageSrc, isSpeaking, amplitude);

  return (
    <div className="avatar-wrapper">
      <div className="avatar-glow" style={{ '--size': `${size}px` }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="avatar-canvas"
        />
      </div>
      {isSpeaking && (
        <div className="speaking-indicator">
          <span /><span /><span />
        </div>
      )}
    </div>
  );
}
