import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import * as store from './store.js';
import { handleMessage } from './bot.js';
import { computeMetrics } from './metrics.js';
import { parseIncoming, sendText, transcribeAudio } from './whatsapp.js';

const app = express();
// Guardamos el body crudo para poder verificar la firma de Meta.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

app.get('/health', (_req, res) => res.json({ ok: true }));

/* ───────── Webhook de WhatsApp ───────── */

app.get('/webhook', (req, res) => {
  const ok =
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? res.status(200).send(req.query['hub.challenge']) : res.sendStatus(403);
});

function validSignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // modo desarrollo
  const received = Buffer.from(req.get('x-hub-signature-256') || '');
  const expected = Buffer.from(
    'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody ?? '').digest('hex'),
  );
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

const seen = new Set(); // Meta reintenta entregas: evitamos procesar dos veces el mismo mensaje
function remember(id) {
  seen.add(id);
  if (seen.size > 1000) seen.delete(seen.values().next().value);
}

async function processIncoming(payload) {
  for (const m of parseIncoming(payload)) {
    if (seen.has(m.id)) continue;
    remember(m.id);

    let text = m.text;
    if (m.type === 'audio') {
      text = await transcribeAudio(m.mediaId);
      if (!text) {
        await sendText(m.from, 'No pude escuchar el audio 😕 ¿Me lo escribís?');
        continue;
      }
    } else if (m.type !== 'text') {
      await sendText(m.from, 'Por ahora leo mensajes de texto y audios.');
      continue;
    }

    for (const reply of handleMessage(m.from, text, m.name)) await sendText(m.from, reply);
  }
}

app.post('/webhook', (req, res) => {
  if (!validSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // respondemos rápido; Meta exige < 5 s
  processIncoming(req.body).catch((err) => console.error(err));
});

/* ───────── API del panel ───────── */

function adminAuth(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('x-api-key') === key) return next();
  res.status(401).json({ error: 'unauthorized' });
}
const api = express.Router();
api.use(adminAuth);

api.get('/metrics', (_req, res) => res.json(computeMetrics(store.raw())));
api.get('/leads', (_req, res) => res.json(store.listLeads()));

api.patch('/leads/:id', (req, res) => {
  const { status } = req.body ?? {};
  if (!['new', 'paid', 'lost'].includes(status)) return res.status(400).json({ error: 'status inválido' });
  const lead = store.updateLead(req.params.id, { status });
  return lead ? res.json(lead) : res.status(404).json({ error: 'no encontrado' });
});

api.get('/conversations', (_req, res) => res.json(store.listConversations()));

api.get('/conversations/:phone', (req, res) => {
  const conv = store.getConversation(req.params.phone);
  return conv ? res.json(conv) : res.status(404).json({ error: 'no encontrada' });
});

api.patch('/conversations/:phone', (req, res) => {
  const conv = store.setHandoff(req.params.phone, req.body?.handoff);
  return conv ? res.json(conv) : res.status(404).json({ error: 'no encontrada' });
});

// Simulador: permite probar el bot sin tener WhatsApp conectado.
api.post('/simulate', (req, res) => {
  const { phone, text, name } = req.body ?? {};
  if (!phone?.startsWith('sim-') || typeof text !== 'string') {
    return res.status(400).json({ error: 'phone (sim-*) y text son obligatorios' });
  }
  res.json({ replies: handleMessage(phone, text, name) });
});

app.use('/api', api);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'error interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
