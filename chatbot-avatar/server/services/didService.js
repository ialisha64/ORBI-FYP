'use strict';
const axios = require('axios');

const DID_API = 'https://api.d-id.com';

const TONE_VOICE = {
  Friendly:     'en-US-JennyNeural',
  Professional: 'en-US-AriaNeural',
  Casual:       'en-US-SaraNeural',
  Enthusiastic: 'en-US-NancyNeural',
};

function didHeaders() {
  return {
    Authorization:  `Basic ${process.env.DID_API_KEY}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

function getAvatarUrl() {
  return (
    process.env.DID_AVATAR_URL ||
    'https://agents-results.d-id.com/google-oauth2%7C112562596238380945228/v2_agt_qXniINVX/thumbnail.png'
  );
}

// Phase 1 — POST /talks → returns talk ID immediately (~1s)
async function createTalk(text, tone = 'Friendly') {
  if (!process.env.DID_API_KEY || !text?.trim()) return null;

  const voiceId = TONE_VOICE[tone] || TONE_VOICE.Friendly;

  try {
    const r = await axios.post(
      `${DID_API}/talks`,
      {
        source_url: getAvatarUrl(),
        script: {
          type:     'text',
          input:    text,
          provider: { type: 'microsoft', voice_id: voiceId },
        },
        config: { fluent: true, pad_audio: 0, stitch: true },
      },
      { headers: didHeaders(), timeout: 12000 }
    );

    const talkId = r.data?.id;
    if (!talkId) throw new Error('D-ID did not return a talk ID');
    console.log(`[D-ID] Talk created → id: ${talkId}`);
    return talkId;
  } catch (e) {
    console.error('[D-ID] createTalk failed:', e.response?.data || e.message);
    return null;
  }
}

// Phase 2 — GET /talks/:id → returns { status, videoUrl }
// Called by the frontend polling endpoint, NOT by the chat route
async function getTalkStatus(talkId) {
  const r = await axios.get(`${DID_API}/talks/${talkId}`, {
    headers: didHeaders(),
    timeout: 10000,
  });
  const { status, result_url } = r.data;
  return { status, videoUrl: result_url || null };
}

module.exports = { createTalk, getTalkStatus };
