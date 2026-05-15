/**
 * Landmark Debug Overlay
 *
 * Add <LandmarkDebug canvas={canvasRef.current} /> to AvatarCanvas temporarily
 * to visually verify that LANDMARKS in useAvatarAnimation.js line up
 * with your portrait image.
 *
 * Usage (temporary, dev only):
 *   import { drawLandmarkDebug } from '../utils/landmarkDebug';
 *   // call inside requestAnimationFrame after drawing the image:
 *   drawLandmarkDebug(ctx, W, H);
 */

import { LANDMARKS } from '../hooks/useAvatarAnimation';

export function drawLandmarkDebug(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = 'lime';
  ctx.lineWidth   = 2;

  Object.entries(LANDMARKS).forEach(([name, lm]) => {
    const cx = lm.cx * W;
    const cy = lm.cy * H;
    const rx = lm.rx * W;
    const ry = lm.ry * H;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'lime';
    ctx.font = `${Math.max(10, W * 0.028)}px monospace`;
    ctx.fillText(name, cx - rx, cy - ry - 4);
  });

  ctx.restore();
}
