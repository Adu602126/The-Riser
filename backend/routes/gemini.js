// routes/gemini.js — The Riser
// Backend proxy for Gemini API — avoids CORS issues in browser
// Frontend calls /api/gemini/chat instead of Gemini directly

const express = require('express');
const https   = require('https');
const router  = express.Router();

const GEMINI_KEY   = 'AIzaSyCpwx26colhzFeBw2vQacvZpRiMn1vvDGA';
const GEMINI_MODEL = 'gemini-2.0-flash';

// POST /api/gemini/chat
// Body: { prompt: string }
router.post('/chat', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: 'prompt required' });

  const systemInstruction =
    'You are BidBot, a fun enthusiastic robot assistant on "The Riser" auction platform. ' +
    'Keep responses SHORT — max 2 punchy sentences. Casual, exciting tone. Use 1-2 emojis. No markdown.';

  const body = JSON.stringify({
    contents: [{
      parts: [{ text: `${systemInstruction}\n\nContext: ${prompt}` }],
    }],
    generationConfig: { maxOutputTokens: 80, temperature: 0.95 },
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path:     `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  try {
    const geminiRes = await new Promise((resolve, reject) => {
      const chunks = [];
      const request = https.request(options, (response) => {
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (e) {
            reject(e);
          }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    const text = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return res.status(500).json({ message: 'No response from Gemini' });

    res.json({ text });
  } catch (err) {
    console.error('Gemini proxy error:', err.message);
    res.status(500).json({ message: 'Gemini API error: ' + err.message });
  }
});

module.exports = router;
