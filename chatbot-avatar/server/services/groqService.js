'use strict';
const axios = require('axios');

// ── News / current events ─────────────────────────────────────────────────────
const NEWS_KEYWORDS = [
  'news','situation','happening','latest','current events','what is going on',
  'update','today in','crisis','attack','flood','earthquake','protest','strike',
  'election','war','conflict','incident','report','breaking','headlines',
  'politics','government','economy','inflation','market','stock',
];

function isNewsQuery(m) {
  const s = m.toLowerCase();
  return NEWS_KEYWORDS.some(kw => s.includes(kw));
}

// Extract a useful search query from the user's message
function extractNewsQuery(message) {
  const m = message.toLowerCase();

  // Patterns like "situation in islamabad", "what's happening in lahore"
  const cityMatch = m.match(
    /(?:situation|happening|news|update|going on)\s+(?:in|at|about)\s+([a-zA-Z\s]+?)(?:\?|now|today|$)/i
  );
  if (cityMatch) return cityMatch[1].trim();

  // "what is the situation in X"
  const aboutMatch = m.match(/(?:about|in|regarding)\s+([a-zA-Z\s]{3,30})(?:\?|$)/i);
  if (aboutMatch) return aboutMatch[1].trim();

  // Strip filler words, return remainder as query
  return message
    .replace(/\b(what|is|the|are|tell|me|about|now|today|latest|current)\b/gi, '')
    .trim()
    .slice(0, 60) || 'Pakistan';
}

async function fetchNews(query) {
  const key = process.env.NEWS_API_KEY;
  if (!key) return null;

  try {
    const r = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q:        query,
        language: 'en',
        sortBy:   'publishedAt',
        pageSize: 3,
        apiKey:   key,
      },
      timeout: 6000,
    });

    const articles = (r.data.articles || []).filter(a => a.title && a.description);
    if (articles.length === 0) return null;

    const summaries = articles
      .slice(0, 3)
      .map((a, i) => {
        const src  = a.source?.name || 'Unknown source';
        const age  = a.publishedAt ? `(${new Date(a.publishedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })})` : '';
        return `${i + 1}. [${src}] ${age} ${a.title}. ${a.description}`;
      })
      .join(' ');

    return `Latest news about "${query}": ${summaries}`;
  } catch (e) {
    console.warn('[News] fetch failed:', e.message);
    return null;
  }
}

// ── Tone → system prompt ──────────────────────────────────────────────────────
const TONE_PROMPTS = {
  Friendly:     'You are Orbi, a warm and friendly AI assistant. Be helpful and kind. Keep replies under 35 words — brief and direct.',
  Professional: 'You are Orbi, a professional AI assistant. Be concise and formal. Keep replies under 35 words — no filler.',
  Casual:       'You are Orbi, a casual AI assistant. Be laid-back and conversational. Keep replies under 35 words.',
  Enthusiastic: 'You are Orbi, an enthusiastic AI assistant! Be upbeat and positive! Keep replies under 35 words!',
};

// ── Mock fallback responses ───────────────────────────────────────────────────
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

  let key = 'default';
  if      (m.includes('task'))                               key = 'task';
  else if (m.includes('weather'))                            key = 'weather';
  else if (m.includes('name') || m.includes('who are you')) key = 'name';
  else if (m.includes('help') && !m.includes('hello'))      key = 'help';
  else if (/^\s*(hi|hello|hey)\b[^a-z]*$/.test(m))         key = 'greeting';
  return responses[key][tone] || responses[key].Friendly;
}

// ── Currency ──────────────────────────────────────────────────────────────────
const CURRENCY_ALIASES = {
  'dollar':'USD','dollars':'USD','usd':'USD','us dollar':'USD',
  'euro':'EUR','euros':'EUR','eur':'EUR',
  'pound':'GBP','pounds':'GBP','gbp':'GBP','sterling':'GBP',
  'rupee':'PKR','rupees':'PKR','pkr':'PKR','pakistani rupee':'PKR',
  'indian rupee':'INR','inr':'INR',
  'yen':'JPY','jpy':'JPY',
  'yuan':'CNY','cny':'CNY','renminbi':'CNY',
  'riyal':'SAR','sar':'SAR','saudi riyal':'SAR',
  'dirham':'AED','aed':'AED',
  'turkish lira':'TRY','lira':'TRY','try':'TRY',
  'ruble':'RUB','rub':'RUB',
  'won':'KRW','krw':'KRW',
  'canadian dollar':'CAD','cad':'CAD',
  'australian dollar':'AUD','aud':'AUD',
  'swiss franc':'CHF','chf':'CHF',
};

function isCurrencyQuery(m) {
  const s = m.toLowerCase();
  return s.includes('exchange rate') || s.includes('currency') || s.includes('convert') ||
         s.includes('how much is') || s.includes('dollar') || s.includes('rupee') ||
         s.includes('euro') || s.includes('pound') || s.includes('pkr') || s.includes('usd') ||
         s.includes('eur') || s.includes('gbp') || s.includes('forex') || s.includes('rate of') ||
         s.includes('dirham') || s.includes('riyal') || s.includes('yen') || s.includes('yuan');
}

function extractCurrencies(message) {
  const m = message.toLowerCase();
  const patterns = [
    /(\w[\w\s]*?)\s+(?:to|in|vs|versus|into)\s+(\w[\w\s]*?)(?:\s+rate|\s+price|\s+exchange|\s+value|[?]|$)/i,
    /(?:rate|price|value|exchange)\s+(?:of\s+)?(\w[\w\s]*?)\s+(?:to|in|vs)\s+(\w[\w\s]*)/i,
    /how much is\s+(?:1\s+)?(\w[\w\s]*?)\s+(?:in|to)\s+(\w[\w\s]*)/i,
  ];
  for (const pattern of patterns) {
    const match = m.match(pattern);
    if (match) {
      const from = CURRENCY_ALIASES[match[1].trim()] || match[1].trim().toUpperCase();
      const to   = CURRENCY_ALIASES[match[2].trim()] || match[2].trim().toUpperCase();
      if (from.length <= 6 && to.length <= 6) return { from, to };
    }
  }
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

// ── Crypto ────────────────────────────────────────────────────────────────────
const CRYPTO_IDS = {
  'bitcoin':'bitcoin','btc':'bitcoin','ethereum':'ethereum','eth':'ethereum',
  'solana':'solana','sol':'solana','dogecoin':'dogecoin','doge':'dogecoin',
  'cardano':'cardano','ada':'cardano','ripple':'ripple','xrp':'ripple',
  'litecoin':'litecoin','ltc':'litecoin','polkadot':'polkadot','dot':'polkadot',
  'binance coin':'binancecoin','bnb':'binancecoin','tether':'tether','usdt':'tether',
};

function isCryptoQuery(m) {
  const s = m.toLowerCase();
  return s.includes('crypto') || s.includes('bitcoin') || s.includes('ethereum') ||
         s.includes('btc') || s.includes('eth') || s.includes('solana') || s.includes('doge') ||
         s.includes('dogecoin') || s.includes('coin price') || s.includes('crypto price') ||
         s.includes('xrp') || s.includes('ripple') || s.includes('bnb');
}

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

// ── World time ────────────────────────────────────────────────────────────────
const TIMEZONE_MAP = {
  'karachi':'Asia/Karachi','pakistan':'Asia/Karachi','islamabad':'Asia/Karachi','lahore':'Asia/Karachi',
  'london':'Europe/London','uk':'Europe/London','new york':'America/New_York','nyc':'America/New_York',
  'usa':'America/New_York','dubai':'Asia/Dubai','uae':'Asia/Dubai','tokyo':'Asia/Tokyo',
  'japan':'Asia/Tokyo','paris':'Europe/Paris','france':'Europe/Paris','berlin':'Europe/Berlin',
  'germany':'Europe/Berlin','sydney':'Australia/Sydney','australia':'Australia/Sydney',
  'toronto':'America/Toronto','canada':'America/Toronto','mumbai':'Asia/Kolkata',
  'delhi':'Asia/Kolkata','india':'Asia/Kolkata','beijing':'Asia/Shanghai',
  'shanghai':'Asia/Shanghai','china':'Asia/Shanghai','moscow':'Europe/Moscow',
  'russia':'Europe/Moscow','riyadh':'Asia/Riyadh','saudi':'Asia/Riyadh',
  'singapore':'Asia/Singapore','hong kong':'Asia/Hong_Kong',
};

function isTimeQuery(m) {
  const s = m.toLowerCase();
  return s.includes('time') || s.includes('what time') || s.includes('current time') ||
         (s.includes('date') && (s.includes('today') || s.includes('now') || s.includes('current'))) ||
         s.includes('what day') || s.includes('what is today');
}

function extractCityFromTimeQuery(message) {
  const m = message.toLowerCase();
  for (const city of Object.keys(TIMEZONE_MAP)) {
    if (m.includes(city)) return city;
  }
  return 'karachi';
}

function fetchWorldTime(city) {
  try {
    const tz = TIMEZONE_MAP[city.toLowerCase()];
    if (!tz) return null;
    const now     = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Current time in ${city}: ${timeStr}, ${dateStr}.`;
  } catch { return null; }
}

// ── Weather ───────────────────────────────────────────────────────────────────
function isWeatherQuery(m) {
  const s = m.toLowerCase();
  return s.includes('weather') || s.includes('temperature') || s.includes('humid') ||
         s.includes('forecast') || s.includes('raining') || s.includes('sunny') ||
         s.includes('cloudy') || s.includes('cold') || s.includes('hot outside') ||
         s.includes('wind') || (s.includes('how') && s.includes('outside'));
}

function extractCity(message) {
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
    const r = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 5000 });
    const current = r.data.current_condition[0];
    return `Real-time weather for ${city}: ${current.weatherDesc[0].value}, ` +
           `Temperature: ${current.temp_C}°C (feels like ${current.FeelsLikeC}°C), ` +
           `Humidity: ${current.humidity}%, Wind: ${current.windspeedKmph} km/h.`;
  } catch { return null; }
}

// ── Main export: get chat response from Groq (with real-time data injection) ──
async function getChatResponse(message, tone = 'Friendly', history = []) {
  let systemPrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.Friendly;
  const realtimeData = [];

  if (isWeatherQuery(message)) {
    const city = extractCity(message);
    if (city) {
      const info = await fetchWeather(city);
      if (info) realtimeData.push(info);
    } else {
      realtimeData.push('Weather feature available — ask the user which city they want weather for.');
    }
  }

  if (isCurrencyQuery(message)) {
    const pair = extractCurrencies(message);
    if (pair) {
      const info = await fetchCurrencyRate(pair.from, pair.to);
      if (info) realtimeData.push(info);
    }
  }

  if (isCryptoQuery(message)) {
    const coins = extractCryptoCoins(message);
    if (coins) {
      const info = await fetchCryptoPrices(coins);
      if (info) realtimeData.push(info);
    }
  }

  if (isTimeQuery(message)) {
    const city = extractCityFromTimeQuery(message);
    const info = fetchWorldTime(city);
    if (info) realtimeData.push(info);
  }

  if (isNewsQuery(message)) {
    const query = extractNewsQuery(message);
    const info  = await fetchNews(query);
    if (info) realtimeData.push(info);
  }

  if (realtimeData.length > 0) {
    systemPrompt += ` You have access to the following real-time data — use it to answer accurately: ${realtimeData.join(' | ')}`;
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockResponse(message, tone);
  }

  try {
    const contextMessages = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.text }));

    const r = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model:    'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages,
          { role: 'user',   content: message },
        ],
        max_tokens: 80,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    return r.data.choices[0].message.content.trim();
  } catch (e) {
    const status = e.response?.status;
    console.error('Groq error:', e.response?.data?.error?.message || e.message);
    if (status === 429) return "I'm a bit overwhelmed right now — please try again in a moment!";
    if (status === 401) return "My AI key seems invalid. Please check the OPENAI_API_KEY in .env.";
    console.warn('Falling back to mock response.');
    return mockResponse(message, tone);
  }
}

module.exports = { getChatResponse };
