import { useRef, useEffect, useCallback } from 'react';

/**
 * Easing functions
 */
const ease = {
  inOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  in:    t => t * t,
  out:   t => t * (2 - t),
};

/**
 * Lerp between two values
 */
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Facial landmark positions as fractions of canvas width/height.
 * Tune these to match your portrait image.
 */
export const LANDMARKS = {
  leftEye:  { cx: 0.375, cy: 0.373, rx: 0.068, ry: 0.024 },
  rightEye: { cx: 0.625, cy: 0.373, rx: 0.068, ry: 0.024 },
  mouth:    { cx: 0.500, cy: 0.660, rx: 0.100, ry: 0.030 },
};

/**
 * Skin / lip colour values for this portrait (tweak if you swap the image).
 */
const SKIN_TOP    = { r: 228, g: 190, b: 172 }; // upper eyelid / forehead area
const SKIN_BOTTOM = { r: 222, g: 182, b: 165 }; // lower eyelid
const LIP_OUTER   = { r: 185, g:  85, b:  85 }; // lip rim colour
const MOUTH_INNER = { r:  45, g:  15, b:  15 }; // open-mouth dark interior

const rgba = ({ r, g, b }, a = 1) => `rgba(${r},${g},${b},${a})`;

/**
 * Draw one eye blink overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} eye  – landmark
 * @param {number} w    – canvas width
 * @param {number} h    – canvas height
 * @param {number} openness – 0 = fully closed, 1 = fully open
 */
function drawEye(ctx, eye, w, h, openness) {
  const cx = eye.cx * w;
  const cy = eye.cy * h;
  const rx = eye.rx * w;
  const ry = eye.ry * h;

  // Amount the upper lid covers the eye
  const lidFraction = 1 - openness; // 0 = open, 1 = fully closed

  if (lidFraction <= 0) return; // eye fully open – draw nothing

  const lidH = ry * 2.2 * lidFraction; // height of lid covering the eye

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Upper lid sweep (skin coloured rectangle from top downward)
  const gradient = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
  gradient.addColorStop(0,   rgba(SKIN_TOP, 1));
  gradient.addColorStop(0.6, rgba(SKIN_TOP, 1));
  gradient.addColorStop(1,   rgba(SKIN_BOTTOM, 0.85));

  ctx.fillStyle = gradient;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, lidH + ry);

  // Thin dark lash line at lid edge
  ctx.strokeStyle = rgba({ r: 30, g: 20, b: 20 }, lidFraction * 0.8);
  ctx.lineWidth = Math.max(1, ry * 0.35);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - ry + lidH);
  ctx.lineTo(cx + rx, cy - ry + lidH);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw animated mouth overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} m  – landmark
 * @param {number} w  – canvas width
 * @param {number} h  – canvas height
 * @param {number} openness – 0 = closed, 1 = wide open
 */
function drawMouth(ctx, m, w, h, openness) {
  if (openness <= 0.01) return;

  const cx = m.cx * w;
  const cy = m.cy * h;
  const rx = m.rx * w;
  const ry = m.ry * h;

  const lipThick = ry * 0.55;
  const innerRy  = ry * openness * 1.6;

  // Dark inner mouth
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.82, Math.max(0.5, innerRy), 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(MOUTH_INNER, Math.min(1, openness * 2));
  ctx.fill();
  ctx.restore();

  // Lower lip overlay (hides original closed lip seam)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy + innerRy * 0.3, rx * 0.88, lipThick * (1 - openness * 0.4), 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(LIP_OUTER, 0.6 + openness * 0.2);
  ctx.fill();
  ctx.restore();
}

/**
 * Main animation hook.
 * Returns a ref to attach to the <canvas> element.
 */
/**
 * @param {string}  imageSrc   – portrait image URL
 * @param {boolean} isSpeaking – true while speech is playing
 * @param {number}  [amplitude=0] – 0‒1 real-time audio amplitude (ElevenLabs);
 *                                   when provided it drives mouth openness directly.
 */
export function useAvatarAnimation(imageSrc, isSpeaking, amplitude = 0) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({
    // Image
    img: null,
    imgLoaded: false,
    // Time
    startTime: null,
    // Blink
    blinkState:     'open',   // 'open' | 'closing' | 'opening'
    blinkProgress:  0,        // 0‒1
    blinkOpenness:  1,        // 1 = open, 0 = closed
    nextBlinkAt:    0,        // timestamp for next blink
    // Mouth
    mouthOpenness:  0,        // 0‒1
    mouthTarget:    0,
    // Float / bob
    floatPhase:  0,
    breathPhase: 0,
    headPhase:   0,
    // Raf id
    rafId: null,
  });

  // ── Image loading ───────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      stateRef.current.img = img;
      stateRef.current.imgLoaded = true;
    };
  }, [imageSrc]);

  // ── Speaking state → mouth target ──────────────────────────────────
  const isSpeakingRef = useRef(false);
  const amplitudeRef  = useRef(0);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { amplitudeRef.current  = amplitude;  }, [amplitude]);

  // ── Animation loop ──────────────────────────────────────────────────
  const animate = useCallback((timestamp) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !s.imgLoaded) {
      s.rafId = requestAnimationFrame(animate);
      return;
    }

    if (!s.startTime) {
      s.startTime = timestamp;
      s.nextBlinkAt = timestamp + randomBlinkDelay();
    }

    const elapsed = timestamp - s.startTime;
    const dt = 16; // ~60 fps assumed
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // ── 1. Background clear ───────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // ── 2. Compute idle transforms ────────────────────────────────────
    s.floatPhase  = elapsed * 0.0008;   // ~0.8 rad/s
    s.breathPhase = elapsed * 0.00075;  // slight breath
    s.headPhase   = elapsed * 0.0004;   // slow head sway

    const floatY   = Math.sin(s.floatPhase)  * 6;          // ±6 px
    const breathSc = 1 + Math.sin(s.breathPhase) * 0.004;  // ±0.4%
    const headTilt = Math.sin(s.headPhase)   * 0.012;      // ±0.7°

    // ── 3. Draw image with transforms ─────────────────────────────────
    ctx.save();
    ctx.translate(W / 2, H / 2 + floatY);
    ctx.rotate(headTilt);
    ctx.scale(breathSc, breathSc);
    ctx.drawImage(s.img, -W / 2, -H / 2, W, H);
    ctx.restore();

    // ── 4. Blink state machine ────────────────────────────────────────
    const CLOSE_DUR = 120; // ms
    const OPEN_DUR  = 100;

    if (s.blinkState === 'open' && timestamp >= s.nextBlinkAt) {
      s.blinkState    = 'closing';
      s.blinkProgress = 0;
    }

    if (s.blinkState === 'closing') {
      s.blinkProgress += dt / CLOSE_DUR;
      if (s.blinkProgress >= 1) {
        s.blinkProgress = 1;
        s.blinkState    = 'opening';
      }
      s.blinkOpenness = 1 - ease.in(s.blinkProgress);
    } else if (s.blinkState === 'opening') {
      s.blinkProgress += dt / OPEN_DUR;
      if (s.blinkProgress >= 1) {
        s.blinkProgress = 0;
        s.blinkState    = 'open';
        s.blinkOpenness = 1;
        s.nextBlinkAt   = timestamp + randomBlinkDelay();
      } else {
        s.blinkOpenness = ease.out(s.blinkProgress);
      }
    }

    // ── 5. Draw eyelid overlays ───────────────────────────────────────
    ctx.save();
    ctx.translate(W / 2, H / 2 + floatY);
    ctx.rotate(headTilt);
    ctx.scale(breathSc, breathSc);
    ctx.translate(-W / 2, -H / 2);
    drawEye(ctx, LANDMARKS.leftEye,  W, H, s.blinkOpenness);
    drawEye(ctx, LANDMARKS.rightEye, W, H, s.blinkOpenness);
    ctx.restore();

    // ── 6. Mouth animation ────────────────────────────────────────────
    if (isSpeakingRef.current) {
      if (amplitudeRef.current > 0.01) {
        // ElevenLabs: use real audio amplitude for accurate mouth sync
        s.mouthTarget = Math.min(1, amplitudeRef.current * 1.8);
      } else {
        // Web Speech API fallback: oscillate to simulate phonemes
        const phonemeFreq = 0.006;
        s.mouthTarget = 0.4 + Math.abs(Math.sin(elapsed * phonemeFreq)) * 0.55;
      }
    } else {
      s.mouthTarget = 0;
    }
    // Smooth lerp toward target
    s.mouthOpenness = lerp(s.mouthOpenness, s.mouthTarget, 0.18);

    ctx.save();
    ctx.translate(W / 2, H / 2 + floatY);
    ctx.rotate(headTilt);
    ctx.scale(breathSc, breathSc);
    ctx.translate(-W / 2, -H / 2);
    drawMouth(ctx, LANDMARKS.mouth, W, H, s.mouthOpenness);
    ctx.restore();

    // ── Next frame ────────────────────────────────────────────────────
    s.rafId = requestAnimationFrame(animate);
  }, []);

  // Start / stop loop
  useEffect(() => {
    const s = stateRef.current;
    s.rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(s.rafId);
  }, [animate]);

  return canvasRef;
}

function randomBlinkDelay() {
  return 3000 + Math.random() * 3000; // 3–6 s
}
