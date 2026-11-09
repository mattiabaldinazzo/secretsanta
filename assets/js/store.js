// Salvataggio locale (solo nel browser) e backup su file, con cifratura opzionale.
import { DEFAULT_SUBJECT, DEFAULT_BODY } from './mail.js';

const KEY = 'secretsanta.events.v1';
const FORMAT = 'secretsanta-backup';
const ITERATIONS = 310000;

export function newId() {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function blankEvent() {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: '',
    organizer: '',
    date: '',
    location: '',
    budget: '',
    message: '',
    participants: [],
    assignments: null,
    drawnAt: null,
    mail: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY, client: 'mailto', format: 'text' },
    createdAt: now,
    updatedAt: now,
    lastBackupAt: null,
  };
}

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.participants)) {
    throw new Error('Il file non contiene un evento valido.');
  }
  const base = blankEvent();
  const ev = {
    ...base,
    id: str(raw.id) || base.id,
    name: str(raw.name),
    organizer: str(raw.organizer),
    date: str(raw.date),
    location: str(raw.location),
    budget: str(raw.budget),
    message: str(raw.message),
    drawnAt: raw.drawnAt ? str(raw.drawnAt) : null,
    createdAt: str(raw.createdAt) || base.createdAt,
    updatedAt: str(raw.updatedAt) || base.updatedAt,
    lastBackupAt: raw.lastBackupAt ? str(raw.lastBackupAt) : null,
    mail: {
      subject: raw.mail && typeof raw.mail.subject === 'string' ? raw.mail.subject : DEFAULT_SUBJECT,
      body: raw.mail && typeof raw.mail.body === 'string' ? raw.mail.body : DEFAULT_BODY,
      client: raw.mail && typeof raw.mail.client === 'string' ? raw.mail.client : 'mailto',
      format: raw.mail && raw.mail.format === 'html' ? 'html' : 'text',
    },
  };
  ev.participants = raw.participants
    .filter((p) => p && p.id)
    .map((p) => ({
      id: str(p.id),
      name: str(p.name),
      email: str(p.email),
      exclusions: Array.isArray(p.exclusions) ? p.exclusions.map(str) : [],
      sent: p.sent && typeof p.sent.hash === 'string' ? { hash: p.sent.hash, at: p.sent.at ? str(p.sent.at) : null } : null,
    }));
  if (raw.assignments && typeof raw.assignments === 'object') {
    const ids = new Set(ev.participants.map((p) => p.id));
    ev.assignments = {};
    for (const [g, r] of Object.entries(raw.assignments)) {
      if (ids.has(g) && ids.has(str(r))) ev.assignments[g] = str(r);
    }
  } else {
    ev.assignments = null;
  }
  return ev;
}

export function loadEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      try {
        out.push(normalizeEvent(item));
      } catch {
        // evento danneggiato: lo salto
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function saveEvents(events) {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

const toB64 = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function subtle() {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('La cifratura richiede il sito aperto in https (GitHub Pages lo è).');
  }
  return globalThis.crypto.subtle;
}

async function deriveKey(password, salt, iterations) {
  const s = subtle();
  const base = await s.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return s.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function exportBackup(ev, password) {
  if (!password) {
    return JSON.stringify({ format: FORMAT, version: 1, encrypted: false, event: ev }, null, 2);
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const data = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(ev)))
  );
  return JSON.stringify(
    {
      format: FORMAT,
      version: 1,
      encrypted: true,
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toB64(salt) },
      iv: toB64(iv),
      data: toB64(data),
    },
    null,
    2
  );
}

export function parseBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un backup valido.');
  }
  if (!raw || raw.format !== FORMAT) throw new Error('Il file non è un backup di questo sito.');
  if (raw.encrypted) return { encrypted: true, raw };
  return { encrypted: false, event: normalizeEvent(raw.event) };
}

export async function decryptBackup(parsed, password) {
  const { raw } = parsed;
  const iterations = Number(raw.kdf && raw.kdf.iterations);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 5000000) {
    throw new Error('Backup danneggiato.');
  }
  let text;
  try {
    const key = await deriveKey(password, fromB64(raw.kdf.salt), iterations);
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64(raw.iv) }, key, fromB64(raw.data));
    text = new TextDecoder().decode(plain);
  } catch (err) {
    if (err && /https/.test(err.message)) throw err;
    throw new Error('Password errata o file danneggiato.');
  }
  return normalizeEvent(JSON.parse(text));
}
