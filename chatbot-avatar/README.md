# ORBI Chatbot Avatar — D-ID Talking Avatar

Realistic AI chatbot with **real lip-sync** powered by D-ID's streaming API.

---

## Folder structure

```
chatbot-avatar/
├── public/
│   └── avatar.jpg          ← avatar image (for fallback display)
├── src/
│   ├── App.jsx             ← main app
│   ├── App.css
│   ├── components/
│   │   ├── AvatarStream.jsx   ← D-ID WebRTC video
│   │   ├── AvatarStream.css
│   │   ├── ChatInterface.jsx  ← chat UI
│   │   └── ChatInterface.css
│   └── services/
│       └── api.js          ← all backend API calls
└── server/
    ├── server.js           ← Node.js Express backend
    ├── package.json
    └── .env                ← API keys (never commit this!)
```

---

## Setup — Step by step

### 1. Get a free D-ID API key
1. Go to **https://studio.d-id.com**
2. Sign up (free tier = 20 credits ≈ 5 min of video)
3. Settings → API → copy your key

### 2. (Optional) Get an OpenAI key
- **https://platform.openai.com** → API keys
- If you skip this, ORBI uses smart mock responses

### 3. Configure the backend
Open `server/.env` and fill in:
```
DID_API_KEY=your_did_api_key_here
OPENAI_API_KEY=your_openai_key_here   # optional
AVATAR_IMAGE_URL=                     # leave blank to use D-ID's default presenter
```

> **Avatar image note:** D-ID needs a publicly accessible image URL.
> If you want to use the custom girl portrait:
> 1. Upload `public/avatar.jpg` to **https://imgbb.com** (free, no account needed)
> 2. Right-click the image → "Copy image address"
> 3. Paste it as `AVATAR_IMAGE_URL=https://i.ibb.co/...`

### 4. Start the backend
```bash
cd server
npm start
# → http://localhost:3001
```

### 5. Start the React frontend
```bash
# in chatbot-avatar/ root
npm start
# → http://localhost:3000
```

---

## How it works

```
User types message
      ↓
React → POST /api/chat → Node.js → OpenAI (or mock)
                                         ↓
                              Text response returned
      ↓
React → POST /api/stream/speak → Node.js → D-ID API
                                                ↓
                              D-ID renders avatar video via WebRTC
      ↓
Avatar video plays in browser with real lip-sync 🎙️
```

---

## Flutter integration

The Flutter Dashboard app opens this React chatbot when the user taps
the "ORBI Chat" card. Make sure both servers are running, then:

- Backend:  http://localhost:3001
- Frontend: http://localhost:3000

The Flutter app launches http://localhost:3000 in the browser.
