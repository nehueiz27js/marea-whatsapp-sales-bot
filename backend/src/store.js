// Persistencia simple en un archivo JSON. Para producción, reemplazá este módulo
// por PostgreSQL/MySQL manteniendo las mismas funciones exportadas.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const FILE = process.env.DATA_FILE || path.resolve('data/db.json');
let db = load();

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { conversations: {}, leads: [] };
  }
}

function persist() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

const now = () => new Date().toISOString();

export const raw = () => db;

export function resetAll() {
  db = { conversations: {}, leads: [] };
  persist();
}

export function getConversation(phone) {
  return db.conversations[phone] ?? null;
}

export function getOrCreateConversation(phone, name = '') {
  if (!db.conversations[phone]) {
    db.conversations[phone] = {
      phone,
      name,
      state: 'START',
      data: {},
      reached: ['START'],
      messages: [],
      handoff: false,
      outcome: null,
      createdAt: now(),
      updatedAt: now(),
    };
  } else if (name && !db.conversations[phone].name) {
    db.conversations[phone].name = name;
  }
  return db.conversations[phone];
}

export function addMessage(phone, direction, text) {
  const conv = db.conversations[phone];
  conv.messages.push({ direction, text, at: now() });
  conv.updatedAt = now();
  persist();
}

export function save() {
  persist();
}

export function setHandoff(phone, value) {
  const conv = db.conversations[phone];
  if (!conv) return null;
  conv.handoff = Boolean(value);
  persist();
  return conv;
}

export function listConversations() {
  return Object.values(db.conversations)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((c) => ({
      phone: c.phone,
      name: c.name || c.data.name || '',
      state: c.state,
      handoff: c.handoff,
      outcome: c.outcome,
      updatedAt: c.updatedAt,
      lastMessage: c.messages.at(-1)?.text ?? '',
    }));
}

export function createLead(data) {
  const lead = { id: randomUUID().slice(0, 8), status: 'new', createdAt: now(), ...data };
  db.leads.push(lead);
  persist();
  return lead;
}

export const listLeads = () => [...db.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function updateLead(id, patch) {
  const lead = db.leads.find((l) => l.id === id);
  if (!lead) return null;
  Object.assign(lead, patch);
  persist();
  return lead;
}
