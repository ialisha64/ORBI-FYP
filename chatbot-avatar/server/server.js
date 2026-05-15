const express    = require('express');
const cors       = require('cors');
const axios      = require('axios');
const path       = require('path');
const multer     = require('multer');
const FormData   = require('form-data');
const googleTTS  = require('google-tts-api');
const { AccessToken, AgentDispatchClient } = require('livekit-server-sdk');
require('dotenv').config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

// ── Chat route (Groq + D-ID Talks API) ───────────────────────────────────────
app.use('/api', require('./routes/chat'));

// ── D-ID helpers ─────────────────────────────────────────────────────────────
const DID_API = 'https://api.d-id.com';
const didAuth = () => ({
  Authorization: `Basic ${process.env.DID_API_KEY}`,
  'Content-Type': 'application/json',
});

// Serve the local avatar image so D-ID can reach it via ngrok / tunnel
// (only needed if AVATAR_IMAGE_URL is not set in .env)
app.use('/avatar', express.static(
  path.join(__dirname, '../../Dashboard/assets/images')
));

// ── Mock AI responses (tone-aware) ────────────────────────────────────────────
function mockResponse(msg, tone = 'Friendly') {
  const m = msg.toLowerCase();

  const responses = {
    greeting: {
      Friendly:     "Hey there! I'm Orbi, your AI assistant. So happy to chat with you! How can I help?",
      Professional: "Good day. I am Orbi, your virtual assistant. How may I assist you?",
      Casual:       "Hey! I'm Orbi. What's up? What do you need help with?",
      Enthusiastic: "Hi hi hi!! I'm Orbi and I'm SO excited to help you today! What can I do?!",
    },
    task: {
      Friendly:     "I'd love to help you with your tasks! Want me to create a new one for you?",
      Professional: "Task management is available. I can create, organize, and track tasks for you.",
      Casual:       "Oh yeah, tasks! I can totally help you sort that out. Want to add one?",
      Enthusiastic: "Tasks?! YES! Let's get you super organized! Want to create one right now?!",
    },
    weather: {
      Friendly:     "I don't have live weather yet, but that's coming soon! Anything else I can help with?",
      Professional: "Live weather data is not yet integrated. This feature is planned for a future update.",
      Casual:       "Ah man, I can't do live weather yet. Coming soon though! Anything else?",
      Enthusiastic: "Ooh weather! I can't do that YET but it's coming soon and it's gonna be awesome!!",
    },
    help: {
      Friendly:     "Of course! I'm here to help with tasks, reminders, scheduling, and much more!",
      Professional: "I can assist with task management, scheduling, reminders, and general inquiries.",
      Casual:       "Sure thing! I can help with tasks, reminders, all that good stuff. Just ask!",
      Enthusiastic: "YES I can help!! Tasks, reminders, scheduling — I'm your go-to assistant for EVERYTHING!!",
    },
    name: {
      Friendly:     "I'm Orbi, your friendly AI assistant. So nice to meet you!",
      Professional: "I am Orbi, a virtual AI assistant designed to support your daily tasks.",
      Casual:       "I'm Orbi! Just your chill AI buddy here to make life easier.",
      Enthusiastic: "I'm ORBI!! Your amazing AI assistant and I'm thrilled to meet you!!",
    },
    default: {
      Friendly:     "That's interesting! I'm here to help however I can. What else is on your mind?",
      Professional: "Understood. I am here to assist you. Please let me know how I can help further.",
      Casual:       "Ha, fair enough! I'm here if you need anything. What else is up?",
      Enthusiastic: "Ooh great topic!! I love it! Keep the questions coming, I'm here for it ALL!!",
    },
  };

  // Prioritise the main intent — don't let a leading "hello" hide a real question
  let key = 'default';
  if      (m.includes('task'))                               key = 'task';
  else if (m.includes('weather'))                            key = 'weather';
  else if (m.includes('name') || m.includes('who are you')) key = 'name';
  else if (m.includes('help') && !m.includes('hello'))      key = 'help';
  else if (/^\s*(hi|hello|hey)\b[^a-z]*$/.test(m))         key = 'greeting'; // greeting ONLY if msg is just a greeting

  return (responses[key][tone] || responses[key].Friendly);
}

// ── Currency helpers ──────────────────────────────────────────────────────────
const CURRENCY_ALIASES = {
  'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD', 'us dollar': 'USD',
  'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
  'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP', 'sterling': 'GBP',
  'rupee': 'PKR', 'rupees': 'PKR', 'pkr': 'PKR', 'pakistani rupee': 'PKR',
  'indian rupee': 'INR', 'inr': 'INR',
  'yen': 'JPY', 'jpy': 'JPY',
  'yuan': 'CNY', 'cny': 'CNY', 'renminbi': 'CNY',
  'riyal': 'SAR', 'sar': 'SAR', 'saudi riyal': 'SAR',
  'dirham': 'AED', 'aed': 'AED',
  'turkish lira': 'TRY', 'lira': 'TRY', 'try': 'TRY',
  'ruble': 'RUB', 'rub': 'RUB',
  'won': 'KRW', 'krw': 'KRW',
  'canadian dollar': 'CAD', 'cad': 'CAD',
  'australian dollar': 'AUD', 'aud': 'AUD',
  'swiss franc': 'CHF', 'chf': 'CHF',
};

function extractCurrencies(message) {
  const m = message.toLowerCase();
  let from = null, to = null;

  // Match: "X to Y rate", "convert X to Y", "X in Y", "X vs Y"
  const patterns = [
    /(\w[\w\s]*?)\s+(?:to|in|vs|versus|into)\s+(\w[\w\s]*?)(?:\s+rate|\s+price|\s+exchange|\s+value|[?]|$)/i,
    /(?:rate|price|value|exchange)\s+(?:of\s+)?(\w[\w\s]*?)\s+(?:to|in|vs)\s+(\w[\w\s]*)/i,
    /how much is\s+(?:1\s+)?(\w[\w\s]*?)\s+(?:in|to)\s+(\w[\w\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = m.match(pattern);
    if (match) {
      from = CURRENCY_ALIASES[match[1].trim()] || match[1].trim().toUpperCase();
      to   = CURRENCY_ALIASES[match[2].trim()] || match[2].trim().toUpperCase();
      if (from.length <= 6 && to.length <= 6) return { from, to };
    }
  }

  // Single currency mentioned — default pair with USD
  for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
    if (m.includes(alias) && code !== 'USD') return { from: 'USD', to: code };
  }
  return null;
}

async function fetchCurrencyRate(from, to) {
  try {
    const r = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 5000 });
    if (r.data.result !== 'success') return null;
    const rate = r.data.rates[to];
    if (!rate) return null;
    const updated = new Date(r.data.time_last_update_utc).toUTCString();
    return `Live exchange rate: 1 ${from} = ${rate.toFixed(4)} ${to}. (Updated: ${updated})`;
  } catch { return null; }
}

function isCurrencyQuery(message) {
  const m = message.toLowerCase();
  return m.includes('exchange rate') || m.includes('currency') || m.includes('convert') ||
         m.includes('how much is') || m.includes('dollar') || m.includes('rupee') ||
         m.includes('euro') || m.includes('pound') || m.includes('pkr') || m.includes('usd') ||
         m.includes('eur') || m.includes('gbp') || m.includes('forex') || m.includes('rate of') ||
         m.includes('dirham') || m.includes('riyal') || m.includes('yen') || m.includes('yuan');
}

// ── Crypto helpers ────────────────────────────────────────────────────────────
const CRYPTO_IDS = {
  'bitcoin': 'bitcoin', 'btc': 'bitcoin',
  'ethereum': 'ethereum', 'eth': 'ethereum',
  'solana': 'solana', 'sol': 'solana',
  'dogecoin': 'dogecoin', 'doge': 'dogecoin',
  'cardano': 'cardano', 'ada': 'cardano',
  'ripple': 'ripple', 'xrp': 'ripple',
  'litecoin': 'litecoin', 'ltc': 'litecoin',
  'polkadot': 'polkadot', 'dot': 'polkadot',
  'binance coin': 'binancecoin', 'bnb': 'binancecoin',
  'tether': 'tether', 'usdt': 'tether',
};

function extractCryptoCoins(message) {
  const m = message.toLowerCase();
  const found = [];
  for (const [alias, id] of Object.entries(CRYPTO_IDS)) {
    if (m.includes(alias) && !found.includes(id)) found.push(id);
  }
  return found.length > 0 ? found.slice(0, 3) : null;
}

async function fetchCryptoPrices(coins) {
  try {
    const ids = coins.join(',');
    const r = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,pkr&include_24hr_change=true`,
      { timeout: 5000 }
    );
    const parts = [];
    for (const [coin, data] of Object.entries(r.data)) {
      const change = data.usd_24h_change ? ` (${data.usd_24h_change.toFixed(2)}% 24h)` : '';
      parts.push(`${coin}: $${data.usd.toLocaleString()} USD / PKR ${data.pkr?.toLocaleString() || 'N/A'}${change}`);
    }
    return parts.length > 0 ? `Live crypto prices: ${parts.join(', ')}.` : null;
  } catch { return null; }
}

function isCryptoQuery(message) {
  const m = message.toLowerCase();
  return m.includes('crypto') || m.includes('bitcoin') || m.includes('ethereum') ||
         m.includes('btc') || m.includes('eth') || m.includes('solana') || m.includes('doge') ||
         m.includes('dogecoin') || m.includes('coin price') || m.includes('crypto price') ||
         m.includes('xrp') || m.includes('ripple') || m.includes('bnb');
}

// ── World time helper ─────────────────────────────────────────────────────────
const TIMEZONE_MAP = {
  'karachi': 'Asia/Karachi', 'pakistan': 'Asia/Karachi', 'islamabad': 'Asia/Karachi',
  'lahore': 'Asia/Karachi', 'london': 'Europe/London', 'uk': 'Europe/London',
  'new york': 'America/New_York', 'nyc': 'America/New_York', 'usa': 'America/New_York',
  'dubai': 'Asia/Dubai', 'uae': 'Asia/Dubai',
  'tokyo': 'Asia/Tokyo', 'japan': 'Asia/Tokyo',
  'paris': 'Europe/Paris', 'france': 'Europe/Paris',
  'berlin': 'Europe/Berlin', 'germany': 'Europe/Berlin',
  'sydney': 'Australia/Sydney', 'australia': 'Australia/Sydney',
  'toronto': 'America/Toronto', 'canada': 'America/Toronto',
  'mumbai': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata', 'india': 'Asia/Kolkata',
  'beijing': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai', 'china': 'Asia/Shanghai',
  'moscow': 'Europe/Moscow', 'russia': 'Europe/Moscow',
  'riyadh': 'Asia/Riyadh', 'saudi': 'Asia/Riyadh',
  'singapore': 'Asia/Singapore', 'hong kong': 'Asia/Hong_Kong',
};

function fetchWorldTime(city) {
  try {
    const tz = TIMEZONE_MAP[city.toLowerCase()];
    if (!tz) return null;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Current time in ${city}: ${timeStr}, ${dateStr}.`;
  } catch { return null; }
}

function isTimeQuery(message) {
  const m = message.toLowerCase();
  return m.includes('time') || m.includes('what time') || m.includes('current time') ||
         (m.includes('date') && (m.includes('today') || m.includes('now') || m.includes('current'))) ||
         m.includes('what day') || m.includes('what is today');
}

function extractCityFromTimeQuery(message) {
  const m = message.toLowerCase();
  for (const city of Object.keys(TIMEZONE_MAP)) {
    if (m.includes(city)) return city;
  }
  // No city found — default to Pakistan time
  return 'karachi';
}

// ── Tone → system prompt mapping ──────────────────────────────────────────────
const tonePrompts = {
  Friendly:      'You are Orbi, a warm and friendly AI assistant. Be helpful and kind. Keep replies under 35 words — brief and direct.',
  Professional:  'You are Orbi, a professional AI assistant. Be concise and formal. Keep replies under 35 words — no filler.',
  Casual:        'You are Orbi, a casual AI assistant. Be laid-back and conversational. Keep replies under 35 words.',
  Enthusiastic:  'You are Orbi, an enthusiastic AI assistant! Be upbeat and positive! Keep replies under 35 words!',
};

// ── Weather helpers ───────────────────────────────────────────────────────────
function extractCity(message) {
  const m = message.toLowerCase();
  // Match patterns: "weather in X", "weather for X", "X weather", "weather X"
  const patterns = [
    /weather\s+(?:in|for|at|of)\s+([a-zA-Z\s]+?)(?:\?|$|today|tomorrow|now|currently)/i,
    /(?:in|for|at)\s+([a-zA-Z\s]+?)\s+weather/i,
    /([a-zA-Z\s]+?)\s+weather/i,
    /weather\s+([a-zA-Z\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const city = match[1].trim().replace(/\s+/g, ' ');
      if (city.length > 1 && city.length < 50) return city;
    }
  }
  return null;
}

async function fetchWeather(city) {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const r = await axios.get(url, { timeout: 5000 });
    const data = r.data;
    const current = data.current_condition[0];
    const tempC = current.temp_C;
    const feelsC = current.FeelsLikeC;
    const humidity = current.humidity;
    const desc = current.weatherDesc[0].value;
    const windKm = current.windspeedKmph;
    const visibility = current.visibility;
    // Use the user's city name directly — not the API's area name
    return `Real-time weather for ${city}: ${desc}, Temperature: ${tempC}°C (feels like ${feelsC}°C), Humidity: ${humidity}%, Wind: ${windKm} km/h, Visibility: ${visibility} km.`;
  } catch (e) {
    return null;
  }
}

function isWeatherQuery(message) {
  const m = message.toLowerCase();
  return m.includes('weather') || m.includes('temperature') || m.includes('humid') ||
         m.includes('forecast') || m.includes('raining') || m.includes('sunny') ||
         m.includes('cloudy') || m.includes('cold') || m.includes('hot outside') ||
         m.includes('wind') || (m.includes('how') && m.includes('outside'));
}

// /api/chat is now handled by routes/chat.js (mounted above)

// ── POST /api/transcribe ─────────────────────────────────────────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'No OpenAI key' });

  try {
    const mime = req.file.mimetype || 'audio/webm';
    const ext  = mime.includes('ogg') ? 'ogg'
               : mime.includes('mp4') ? 'mp4'
               : mime.includes('wav') ? 'wav'
               : 'webm';

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: `audio.${ext}`,
      contentType: mime,
    });
    form.append('model', 'whisper-large-v3');
    form.append('language', 'en');

    const r = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
    });
    res.json({ text: r.data.text });
  } catch (e) {
    const status = e.response?.status;
    console.error('Whisper error:', e.response?.data || e.message);
    if (status === 429) return res.status(429).json({ error: 'OpenAI quota exceeded' });
    if (status === 401) return res.status(401).json({ error: 'Invalid OpenAI API key' });
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// ── D-ID agent presenter config (cached after first fetch) ────────────────────
let agentPresenter = null; // { presenterId, voiceId }

async function getAgentPresenter() {
  if (agentPresenter) return agentPresenter;
  const agentId = process.env.DID_AGENT_ID;
  if (!agentId) return null;
  try {
    const r = await axios.get(`${DID_API}/agents/${agentId}`, { headers: didAuth(), timeout: 8000 });
    const presenter = r.data?.presenter;
    if (presenter) {
      agentPresenter = {
        // thumbnail is publicly accessible and works as source_url for talks/streams
        sourceUrl:  presenter.thumbnail || presenter.source_url || null,
        voiceId:    presenter.voice?.voice_id || 'en-US-JennyNeural',
        voiceType:  presenter.voice?.type     || 'microsoft',
      };
      console.log('Agent presenter cached:', agentPresenter);
    }
    return agentPresenter;
  } catch (e) {
    console.warn('Could not fetch agent presenter:', e.response?.data?.description || e.message);
    return null;
  }
}

// Track current active stream so we can clean it up before creating a new one
let activeStream = null;

// ── POST /api/stream/create ───────────────────────────────────────────────────
// Creates a D-ID talking stream and returns WebRTC offer + ICE servers
app.post('/api/stream/create', async (req, res) => {
  const presenter  = await getAgentPresenter();
  const sourceUrl  = process.env.AVATAR_IMAGE_URL
                  || presenter?.sourceUrl
                  || 'https://d-id-public-bucket.s3.us-east-1.amazonaws.com/alice.jpg';
  const streamBody = { source_url: sourceUrl, stream_warmup: true };

  // Clean up any previously tracked stream first
  if (activeStream) {
    try {
      await axios.delete(`${DID_API}/talks/streams/${activeStream.id}`,
        { data: { session_id: activeStream.session_id }, headers: didAuth() });
      console.log('Cleaned up old stream:', activeStream.id);
    } catch (_) {}
    activeStream = null;
    // Brief pause to let D-ID release the slot
    await new Promise(r => setTimeout(r, 1500));
  }

  // Retry up to 3 times if max sessions — old sessions expire in ~30s
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await axios.post(
        `${DID_API}/talks/streams`,
        streamBody,
        { headers: didAuth() }
      );
      activeStream = { id: r.data.id, session_id: r.data.session_id };
      return res.json(r.data);
    } catch (e) {
      const err = e.response?.data;
      const isMaxSessions = err?.description?.includes('Max') || err?.kind === 'Forbidden';
      if (isMaxSessions && attempt < 3) {
        console.log(`Max sessions (attempt ${attempt}/3), waiting 30s…`);
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      console.error('D-ID create stream:', err || e.message);
      return res.status(500).json({ error: err || e.message });
    }
  }
});

// ── POST /api/stream/sdp ──────────────────────────────────────────────────────
app.post('/api/stream/sdp', async (req, res) => {
  const { streamId, answer, sessionId } = req.body;
  try {
    const r = await axios.post(
      `${DID_API}/talks/streams/${streamId}/sdp`,
      { answer, session_id: sessionId },
      { headers: didAuth() }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// ── POST /api/stream/ice ──────────────────────────────────────────────────────
app.post('/api/stream/ice', async (req, res) => {
  const { streamId, candidate, sessionId } = req.body;
  try {
    // D-ID expects flat: { candidate, sdpMid, sdpMLineIndex, session_id }
    const r = await axios.post(
      `${DID_API}/talks/streams/${streamId}/ice`,
      {
        candidate:     candidate.candidate,
        sdpMid:        candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        session_id:    sessionId,
      },
      { headers: didAuth() }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// ── POST /api/stream/speak ────────────────────────────────────────────────────
app.post('/api/stream/speak', async (req, res) => {
  const { streamId, sessionId, text } = req.body;
  // Female Microsoft Neural voice selected by tone
  const { tone = 'Friendly' } = req.body;
  const voiceType = 'microsoft';
  const TONE_VOICE = {
    Friendly:     'en-US-JennyNeural',   // warm, conversational
    Professional: 'en-US-AriaNeural',    // clear, measured
    Casual:       'en-US-SaraNeural',    // relaxed, natural
    Enthusiastic: 'en-US-NancyNeural',   // upbeat, energetic
  };
  const voiceId = TONE_VOICE[tone] || TONE_VOICE.Friendly;
  try {
    const r = await axios.post(
      `${DID_API}/talks/streams/${streamId}`,
      {
        script: {
          type:     'text',
          input:    text,
          provider: { type: voiceType, voice_id: voiceId },
        },
        config:     { stitch: true },
        session_id: sessionId,
      },
      { headers: didAuth() }
    );
    res.json(r.data);
  } catch (e) {
    console.error('D-ID speak:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// ── POST /api/stream/keepalive — send silence to prevent D-ID idle timeout ────
app.post('/api/stream/keepalive', async (req, res) => {
  const { streamId, sessionId } = req.body;
  if (!streamId || !sessionId) return res.json({ ok: true }); // nothing to ping
  try {
    // Send a 1-second silence — keeps D-ID stream alive without visible mouth movement
    await axios.post(
      `${DID_API}/talks/streams/${streamId}`,
      {
        script:     { type: 'silence', duration: 1000 },
        config:     { stitch: false },
        session_id: sessionId,
      },
      { headers: didAuth(), timeout: 8000 }
    );
    res.json({ ok: true });
  } catch (e) {
    // silence type may not be supported on all plans — not fatal
    res.json({ ok: false, note: e.response?.data?.description || e.message });
  }
});

// ── DELETE /api/stream/:streamId ──────────────────────────────────────────────
app.delete('/api/stream/:streamId', async (req, res) => {
  const { streamId } = req.params;
  const { sessionId } = req.body;
  try {
    const r = await axios.delete(
      `${DID_API}/talks/streams/${streamId}`,
      { data: { session_id: sessionId }, headers: didAuth() }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

// ── GET /api/avatar-img — proxy avatar so canvas can draw it (no CORS) ───────
app.get('/api/avatar-img', async (req, res) => {
  try {
    const r = await axios.get(
      'https://d-id-public-bucket.s3.amazonaws.com/alice.jpg',
      { responseType: 'arraybuffer' }
    );
    res.set('Content-Type', 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(r.data));
  } catch (e) {
    res.status(500).json({ error: 'avatar fetch failed' });
  }
});

// ── POST /api/tts — free Google TTS, returns MP3 ─────────────────────────────
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: 'en', slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
    const buf = Buffer.concat(results.map(r => Buffer.from(r.base64, 'base64')));
    res.set('Content-Type', 'audio/mpeg');
    res.send(buf);
  } catch (e) {
    console.error('TTS error:', e.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ── GET /api/livekit-token — generate room token + dispatch agent ─────────────
app.get('/api/livekit-token', async (req, res) => {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(503).json({ error: 'LiveKit not configured' });
  }
  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `user-${Date.now()}`,
      ttl: 3600,
    });
    at.addGrant({
      roomJoin: true,
      room: 'orbi-avatar',
      canPublish: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();

    // Dispatch agent — session_lock in Python prevents duplicate concurrent sessions
    try {
      const httpUrl = LIVEKIT_URL.replace('wss://', 'https://');
      const dispatch = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
      await dispatch.createDispatch('orbi-avatar', 'orbi', {});
      console.log('Agent dispatched to orbi-avatar');
    } catch (e) {
      console.log('Dispatch note:', e.message?.slice(0, 80));
    }

    res.json({ token, url: LIVEKIT_URL });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/agent-info — return D-ID agent presenter thumbnail URL ──────────
app.get('/api/agent-info', async (req, res) => {
  const presenter = await getAgentPresenter();
  res.json({
    thumbnailUrl: presenter?.sourceUrl || null,
    voiceId:      presenter?.voiceId   || 'en-US-JennyNeural',
  });
});

// ── GET /api/agent-health — check if Python agent is ready ───────────────────
app.get('/api/agent-health', async (req, res) => {
  try {
    const r = await axios.get('http://localhost:5001/health', { timeout: 2000 });
    res.json(r.data);
  } catch (_) {
    res.json({ ok: false, ready: false });
  }
});

// ── POST /api/speak — proxy text to Python agent for Simli lip-sync ──────────
app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const r = await axios.post('http://localhost:5001/speak', { text }, { timeout: 5000 });
    res.json(r.data);
  } catch (_) {
    // Python agent not running — silently ignore, React still speaks via browser TTS
    res.json({ ok: false, agentOffline: true });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅  ORBI backend running → http://localhost:${PORT}`);
  console.log(`   D-ID key  : ${process.env.DID_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`   OpenAI    : ${process.env.OPENAI_API_KEY ? '✓ set' : '— mock responses'}`);
  console.log(`   LiveKit   : ${process.env.LIVEKIT_API_KEY ? '✓ set' : '— lip-sync disabled'}\n`);
});
