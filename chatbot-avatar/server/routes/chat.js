'use strict';
const express                    = require('express');
const { getChatResponse }        = require('../services/groqService');
const { createTalk, getTalkStatus } = require('../services/didService');

const router = express.Router();

// POST /api/chat
// Fast path: Groq text (~1s) + D-ID talk creation (~1s) → returns immediately
// Returns: { reply: string, talkId: string|null }
router.post('/chat', async (req, res) => {
  const { message, tone = 'Friendly', history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Step 1 — Get AI text from Groq (~1 second)
    const reply = await getChatResponse(message.trim(), tone, history);

    // Step 2 — Create D-ID talk job (just POST, returns talk ID, ~1 second)
    // Do NOT poll here — frontend polls separately so user sees text immediately
    const talkId = await createTalk(reply, tone);

    // Step 3 — Return right away (total ~2-3 seconds)
    return res.json({ reply, talkId });

  } catch (e) {
    console.error('[/api/chat] error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/talk/status/:talkId
// Frontend polls this every 2 seconds until status === "done"
// Returns: { status: string, videoUrl: string|null }
router.get('/talk/status/:talkId', async (req, res) => {
  const { talkId } = req.params;
  if (!talkId) return res.status(400).json({ error: 'talkId required' });

  try {
    const result = await getTalkStatus(talkId);
    return res.json(result);
  } catch (e) {
    console.error('[/api/talk/status] error:', e.response?.data || e.message);
    return res.status(500).json({ error: 'Failed to get talk status' });
  }
});

module.exports = router;
