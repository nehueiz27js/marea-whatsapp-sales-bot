// Integración con la WhatsApp Cloud API de Meta.
const GRAPH = 'https://graph.facebook.com/v21.0';

export const isSimulated = (phone) => phone.startsWith('sim-');

export async function sendText(to, body) {
  if (isSimulated(to)) return;
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID } = process.env;
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[demo] → ${to}: ${body}`);
    return;
  }
  const res = await fetch(`${GRAPH}/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  if (!res.ok) console.error('Error enviando a WhatsApp', res.status, await res.text());
}

// Normaliza el payload del webhook a una lista simple de mensajes entrantes.
export function parseIncoming(payload) {
  const out = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const contacts = value?.contacts ?? [];
      for (const m of value?.messages ?? []) {
        out.push({
          id: m.id,
          from: m.from,
          name: contacts.find((c) => c.wa_id === m.from)?.profile?.name ?? '',
          type: m.type,
          text: m.text?.body ?? '',
          mediaId: m.audio?.id,
        });
      }
    }
  }
  return out;
}

// Descarga el audio de WhatsApp y lo transcribe con Whisper (opcional).
export async function transcribeAudio(mediaId) {
  const { WHATSAPP_TOKEN, OPENAI_API_KEY } = process.env;
  if (!WHATSAPP_TOKEN || !OPENAI_API_KEY || !mediaId) return null;
  try {
    const auth = { Authorization: `Bearer ${WHATSAPP_TOKEN}` };
    const meta = await (await fetch(`${GRAPH}/${mediaId}`, { headers: auth })).json();
    const audio = await fetch(meta.url, { headers: auth });
    const form = new FormData();
    form.append('file', new Blob([await audio.arrayBuffer()], { type: meta.mime_type || 'audio/ogg' }), 'audio.ogg');
    form.append('model', 'whisper-1');
    form.append('language', 'es');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!r.ok) return null;
    return (await r.json()).text ?? null;
  } catch (err) {
    console.error('Error transcribiendo audio', err);
    return null;
  }
}
