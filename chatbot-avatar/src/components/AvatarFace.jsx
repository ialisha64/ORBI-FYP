import { useEffect, useRef } from 'react';

const W = 320, H = 360;

function draw(ctx, { speaking, blinkAmt, mouthAmt, time }) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 - 10;

  // ── Background glow when speaking ──────────────────────────────────────────
  if (speaking) {
    const grd = ctx.createRadialGradient(cx, cy, 60, cx, cy, 180);
    grd.addColorStop(0, `rgba(0,217,255,${0.06 + 0.04 * Math.sin(time * 5)})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Hair (back layer) ───────────────────────────────────────────────────────
  ctx.fillStyle = '#1a0533';
  // Top of head
  ctx.beginPath();
  ctx.ellipse(cx, cy - 25, 90, 105, 0, Math.PI, 0);
  ctx.fill();
  // Left side hair
  ctx.beginPath();
  ctx.moveTo(cx - 88, cy + 5);
  ctx.quadraticCurveTo(cx - 115, cy + 90, cx - 75, cy + 170);
  ctx.quadraticCurveTo(cx - 50, cy + 140, cx - 65, cy + 80);
  ctx.fill();
  // Right side hair
  ctx.beginPath();
  ctx.moveTo(cx + 88, cy + 5);
  ctx.quadraticCurveTo(cx + 115, cy + 90, cx + 75, cy + 170);
  ctx.quadraticCurveTo(cx + 50, cy + 140, cx + 65, cy + 80);
  ctx.fill();

  // ── Neck ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#f3c9b1';
  ctx.beginPath();
  ctx.roundRect(cx - 22, cy + 85, 44, 50, 4);
  ctx.fill();

  // ── Face ────────────────────────────────────────────────────────────────────
  const faceGrd = ctx.createRadialGradient(cx, cy - 15, 10, cx, cy + 10, 90);
  faceGrd.addColorStop(0, '#fce8d8');
  faceGrd.addColorStop(1, '#f3c9b1');
  ctx.fillStyle = faceGrd;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5, 78, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Hair (front bangs) ──────────────────────────────────────────────────────
  ctx.fillStyle = '#2a0544';
  ctx.beginPath();
  ctx.moveTo(cx - 83, cy - 38);
  ctx.quadraticCurveTo(cx - 65, cy - 120, cx, cy - 125);
  ctx.quadraticCurveTo(cx + 65, cy - 120, cx + 83, cy - 38);
  ctx.quadraticCurveTo(cx + 45, cy - 22, cx + 15, cy - 58);
  ctx.quadraticCurveTo(cx, cy - 48, cx - 15, cy - 58);
  ctx.quadraticCurveTo(cx - 45, cy - 22, cx - 83, cy - 38);
  ctx.fill();

  // ── Eyebrows ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#3d1a5e';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  const eyeY = cy - 12;
  for (const dx of [-30, 30]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx - 15, eyeY - 22);
    ctx.quadraticCurveTo(cx + dx, eyeY - 26, cx + dx + 15, eyeY - 21);
    ctx.stroke();
  }

  // ── Eyes ────────────────────────────────────────────────────────────────────
  for (const dx of [-30, 30]) {
    const ex = cx + dx;
    const eyeOpenH = 13 * (1 - blinkAmt);

    // White
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 15, Math.max(eyeOpenH, 0.5), 0, 0, Math.PI * 2);
    ctx.fill();

    if (blinkAmt < 0.85) {
      // Iris
      const irisG = ctx.createRadialGradient(ex, eyeY, 2, ex, eyeY, 10);
      irisG.addColorStop(0, '#9c8ff0');
      irisG.addColorStop(1, '#5040c0');
      ctx.fillStyle = irisG;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 10, Math.min(10, eyeOpenH * 0.85), 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#080818';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 5.5, Math.min(5.5, eyeOpenH * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();

      // Catchlight
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(ex - 3, eyeY - 3, 3, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(ex + 4, eyeY + 3, 1.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyelid line (top)
    ctx.strokeStyle = '#c9a090';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY - eyeOpenH, 15, 4, 0, Math.PI, 0);
    ctx.stroke();

    // Eyelashes (top)
    ctx.strokeStyle = '#1a0533';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const lx = ex + i * 6;
      const ly = eyeY - eyeOpenH - 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + i * 2, ly - 5 - Math.abs(i));
      ctx.stroke();
    }
  }

  // ── Nose (subtle) ───────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(180,110,90,0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + 18);
  ctx.quadraticCurveTo(cx - 8, cy + 28, cx, cy + 31);
  ctx.quadraticCurveTo(cx + 8, cy + 28, cx + 4, cy + 18);
  ctx.stroke();

  // ── Blush ───────────────────────────────────────────────────────────────────
  const blushA = speaking ? 0.18 + 0.04 * Math.sin(time * 2) : 0.1;
  ctx.fillStyle = `rgba(255,150,120,${blushA})`;
  for (const dx of [-50, 50]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + 25, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Mouth ───────────────────────────────────────────────────────────────────
  const mouthY = cy + 55;
  const mouthW = 24;
  const openH  = mouthAmt * 12; // 0..12px

  // Upper lip
  ctx.fillStyle = '#e8748a';
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY);
  ctx.quadraticCurveTo(cx - mouthW * 0.4, mouthY - 6, cx, mouthY - 4);
  ctx.quadraticCurveTo(cx + mouthW * 0.4, mouthY - 6, cx + mouthW, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + openH * 0.4 + 2, cx - mouthW, mouthY);
  ctx.fill();

  // Inside mouth
  if (openH > 3) {
    ctx.fillStyle = '#2a0a1a';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + openH * 0.35, mouthW * 0.72, openH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#f8f5ff';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + 1.5, mouthW * 0.55, Math.min(openH * 0.35, 5), 0, 0, Math.PI);
    ctx.fill();
  }

  // Lower lip
  ctx.fillStyle = '#d45a78';
  ctx.beginPath();
  ctx.moveTo(cx - mouthW * 0.82, mouthY + openH);
  ctx.quadraticCurveTo(cx, mouthY + openH + 9, cx + mouthW * 0.82, mouthY + openH);
  ctx.quadraticCurveTo(cx, mouthY + openH + 3, cx - mouthW * 0.82, mouthY + openH);
  ctx.fill();

  // Lip shine
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + openH + 5, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── AI ring decoration ──────────────────────────────────────────────────────
  if (speaking) {
    const ringR = 105 + 3 * Math.sin(time * 4);
    const ringGrd = ctx.createConicalGradient
      ? null // fallback below
      : null;
    ctx.strokeStyle = `rgba(0,217,255,${0.3 + 0.2 * Math.sin(time * 3)})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringR, ringR * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export default function AvatarFace({ speaking }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ blinkAmt: 0, blinkPhase: 'open', blinkTimer: 0, mouthAmt: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let last = performance.now();

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;

      // ── Blink logic ──────────────────────────────────────────────────────────
      s.blinkTimer += dt;
      if (s.blinkPhase === 'open' && s.blinkTimer > 3 + Math.random() * 2) {
        s.blinkPhase = 'closing'; s.blinkTimer = 0;
      } else if (s.blinkPhase === 'closing') {
        s.blinkAmt = Math.min(s.blinkAmt + dt / 0.07, 1);
        if (s.blinkAmt >= 1) { s.blinkPhase = 'closed'; s.blinkTimer = 0; }
      } else if (s.blinkPhase === 'closed' && s.blinkTimer > 0.05) {
        s.blinkPhase = 'opening';
      } else if (s.blinkPhase === 'opening') {
        s.blinkAmt = Math.max(s.blinkAmt - dt / 0.08, 0);
        if (s.blinkAmt <= 0) { s.blinkPhase = 'open'; s.blinkTimer = 0; }
      }

      // ── Mouth logic ──────────────────────────────────────────────────────────
      if (speaking) {
        // Natural speech: sine wave at ~5 Hz with some variation
        const t = now / 1000;
        const target = 0.45 + 0.55 * Math.abs(Math.sin(t * Math.PI * 5.2 + Math.sin(t * 2.1) * 0.8));
        s.mouthAmt += (target - s.mouthAmt) * Math.min(dt * 18, 1);
      } else {
        s.mouthAmt += (0 - s.mouthAmt) * Math.min(dt * 12, 1);
      }

      draw(ctx, { speaking, blinkAmt: s.blinkAmt, mouthAmt: s.mouthAmt, time: now / 1000 });
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speaking]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '20px' }}
    />
  );
}
