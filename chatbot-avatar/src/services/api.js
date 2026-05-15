const BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export const sendMessage = async (message, tone = 'Friendly', history = []) => {
  const res = await fetch(`${BASE}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, tone, history }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json(); // { response: string }
};

export const createStream = async () => {
  const res = await fetch(`${BASE}/api/stream/create`, { method: 'POST' });
  if (!res.ok) throw new Error('D-ID stream creation failed');
  return res.json(); // { id, session_id, offer, ice_servers }
};

export const sendSdpAnswer = async (streamId, answer, sessionId) => {
  await fetch(`${BASE}/api/stream/sdp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ streamId, answer, sessionId }),
  });
};

export const sendIceCandidate = async (streamId, candidate, sessionId) => {
  await fetch(`${BASE}/api/stream/ice`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ streamId, candidate, sessionId }),
  });
};

export const speakText = async (streamId, sessionId, text, tone = 'Friendly') => {
  const res = await fetch(`${BASE}/api/stream/speak`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ streamId, sessionId, text, tone }),
  });
  if (!res.ok) throw new Error('Speak request failed');
  return res.json();
};

export const destroyStream = async (streamId, sessionId) => {
  await fetch(`${BASE}/api/stream/${streamId}`, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId }),
  });
};

export const keepAlive = async (streamId, sessionId) => {
  await fetch(`${BASE}/api/stream/keepalive`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ streamId, sessionId }),
  });
};
