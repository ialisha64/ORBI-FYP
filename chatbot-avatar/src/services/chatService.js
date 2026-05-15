const BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Phase 1 — send message, get text reply + talkId immediately (~2s)
export async function sendChatMessage(message, tone = 'Friendly', history = []) {
  const res = await fetch(`${BASE}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, tone, history }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json(); // { reply, talkId }
}

// Phase 2 — poll until D-ID video is ready, returns videoUrl or null
export async function waitForVideo(talkId, { onReady, maxAttempts = 15, intervalMs = 2000 } = {}) {
  if (!talkId) return null;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    try {
      const res  = await fetch(`${BASE}/api/talk/status/${talkId}`);
      if (!res.ok) continue;
      const { status, videoUrl } = await res.json();

      if (status === 'done' && videoUrl) {
        onReady?.(videoUrl);
        return videoUrl;
      }
      if (status === 'error' || status === 'rejected') return null;
    } catch {
      // transient fetch error — keep polling
    }
  }

  return null; // timed out
}
