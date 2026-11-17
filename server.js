import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { normalizeFloodAnalysis } from './shared/flood-analysis.js';

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3001);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const apiKey = process.env.OPENAI_API_KEY?.trim();
const client = apiKey ? new OpenAI({ apiKey }) : null;

app.use(express.json());

function parseOpenAIResponse(rawText) {
  const cleaned = rawText.trim();
  const json = cleaned.startsWith('```') ? cleaned.replace(/^```json\s*|^```\s*|```$/g, '').trim() : cleaned;
  return JSON.parse(json);
}

async function analyzeFloodFromOpenAI(message, file) {
  if (!client) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const prompt = `You analyse flood reports for Hanoi. Respond in Vietnamese. If an image is attached: find reference objects (motorbike wheel, car, person, street sign) and estimate how deep the water is relative to them. If no photo, rely on the message only.
Message: "${message || ''}"
Return JSON with: objs (short Vietnamese string of reference objects used), level (0-3 from the photo: 0 dry/ankle, 1 under 15 cm, 2 about 15-35 cm, 3 over 35 cm; use the text level if there is no photo), cm (numeric centimeter range without any unit, e.g. "20-30"; empty if unknown), conf (0-1), street (street name from the message, or empty), tlevel (0-3 severity implied by the message).
Be conservative. If no flood or no reference object is visible, lower conf.`;

  const imageParts = [];
  if (file) {
    const base64 = file.buffer.toString('base64');
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${file.mimetype || 'image/jpeg'};base64,${base64}` },
    });
  }

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a careful flood-reporting assistant for Hanoi. Respond in Vietnamese and return only valid JSON matching the requested schema.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageParts,
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'flood_report',
        schema: {
          type: 'object',
          properties: {
            objs: { type: 'string' },
            level: { type: 'integer', minimum: 0, maximum: 3 },
            cm: { type: 'string', description: 'Numeric range in centimeters without a unit, e.g. 15-35; empty when unknown.' },
            conf: { type: 'number', minimum: 0, maximum: 1 },
            street: { type: 'string' },
            tlevel: { type: 'integer', minimum: 0, maximum: 3 },
          },
          required: ['objs', 'level', 'cm', 'conf', 'street', 'tlevel'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
    temperature: 0,
    seed: 42,
  });

  const resultText = completion.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('The OpenAI model returned an empty response.');
  }

  return parseOpenAIResponse(resultText);
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, model: OPENAI_MODEL, keyConfigured: Boolean(apiKey) });
});

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  const message = String(req.body?.message || '').trim();

  if (!message) {
    return res.status(400).json({ error: 'A message is required.' });
  }

  try {
    const parsed = await analyzeFloodFromOpenAI(message, req.file);
    return res.json(normalizeFloodAnalysis(parsed));
  } catch (error) {
    const status = Number(error?.status);
    console.error('OpenAI flood analysis failed', {
      status: Number.isFinite(status) ? status : undefined,
      code: error?.code,
      type: error?.type,
    });

    let friendlyMessage = 'Flood analysis failed. Please try again or use the offline sample result.';
    let responseStatus = 500;

    if (error?.message === 'OPENAI_API_KEY is not configured.') {
      friendlyMessage = 'The API key is not configured on the server. Add it to .env and restart the server.';
      responseStatus = 503;
    } else if (status === 401 || status === 403) {
      friendlyMessage = 'OpenAI rejected the configured API key. Check that the key is active and has API access.';
      responseStatus = 502;
    } else if (status === 429) {
      friendlyMessage = 'OpenAI rate limit or quota reached. Check the API project quota and try again later.';
      responseStatus = 429;
    } else if (status === 404) {
      friendlyMessage = `OpenAI model "${OPENAI_MODEL}" is unavailable to this API key. Set OPENAI_MODEL to a vision-capable model available to your account.`;
      responseStatus = 502;
    } else if (status >= 400 && status < 500) {
      friendlyMessage = 'OpenAI could not process this request. Check the selected model and try a different image or message.';
      responseStatus = 502;
    }

    return res.status(responseStatus).json({
      error: friendlyMessage,
    });
  }
});

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Flood map API running on http://localhost:${PORT}`);
});
