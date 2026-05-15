import { useRef, useEffect, useState } from 'react';
import './AvatarPlayer.css';

const THUMBNAIL =
  'https://agents-results.d-id.com/google-oauth2%7C112562596238380945228/v2_agt_qXniINVX/thumbnail.png';

const LOTTIE_SRC =
  'https://lottie.host/5e4b75ee-d520-4aca-bb9a-25dfe3a95b1b/QZPuPpFg4v.lottie';

export default function AvatarPlayer({ videoUrl, isLoading, isVideoLoading }) {
  const videoRef               = useRef(null);
  const [playing, setPlaying]  = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    setPlaying(false);
    videoRef.current.load();
    videoRef.current.play().catch(() => {});
  }, [videoUrl]);

  const badgeState = isLoading      ? 'thinking'
                   : isVideoLoading ? 'rendering'
                   : playing        ? 'speaking'
                   :                  'ready';

  const badgeLabel = {
    thinking:  '⏳ Thinking…',
    rendering: '🎬 Rendering…',
    speaking:  '💬 Speaking…',
    ready:     '🟢 Ready',
  }[badgeState];

  return (
    <div className="avatar-player">

      {/* Thumbnail — shown whenever video isn't playing */}
      {!playing && (
        <img
          className={`avatar-player__thumb${isLoading && !isVideoLoading ? ' avatar-player__thumb--dim' : ''}`}
          src={imgError ? '/avatar.jpg' : THUMBNAIL}
          alt="ORBI"
          onError={() => setImgError(true)}
        />
      )}

      {/* D-ID talking video */}
      {videoUrl && (
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          autoPlay
          playsInline
          controls={false}
          className={`avatar-player__video${playing ? ' avatar-player__video--visible' : ''}`}
          onPlay={()  => setPlaying(true)}
          onEnded={()  => setPlaying(false)}
          onError={()  => setPlaying(false)}
          onPause={()  => setPlaying(false)}
        />
      )}

      {/* FULL Lottie overlay — ONLY while Groq is thinking */}
      {isLoading && !isVideoLoading && (
        <div className="avatar-player__overlay avatar-player__overlay--full">
          <div className="avatar-player__lottie-wrap">
            {/* eslint-disable-next-line react/no-unknown-property */}
            <dotlottie-wc
              src={LOTTIE_SRC}
              autoplay="true"
              loop="true"
              style={{ width: '240px', height: '240px', display: 'block' }}
            />
          </div>
          <p className="avatar-player__overlay-title">ORBI is thinking…</p>
          <p className="avatar-player__overlay-sub">Generating your response</p>
        </div>
      )}

      {/* Mini strip — ONLY while D-ID renders video */}
      {!isLoading && isVideoLoading && (
        <div className="avatar-player__mini-overlay">
          {/* eslint-disable-next-line react/no-unknown-property */}
          <dotlottie-wc
            src={LOTTIE_SRC}
            autoplay="true"
            loop="true"
            style={{ width: '60px', height: '60px', display: 'block', flexShrink: 0 }}
          />
          <div className="avatar-player__mini-text">
            <span>Rendering video</span>
            <div className="avatar-player__mini-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className={`avatar-player__badge avatar-player__badge--${badgeState}`}>
        {badgeLabel}
      </div>
    </div>
  );
}
