// Preparazione delle mail: testo dal modello, link mailto e Outlook, CSV per strumenti di mail delivery.

export const DEFAULT_SUBJECT = '{evento}: ecco a chi fai il regalo';

export const DEFAULT_BODY = `Ciao {nome},

per {evento} farai il regalo a: {destinatario}

Data: {data}
Luogo: {luogo}
Budget: {budget}

{messaggio}

Non dirlo a nessuno!
{organizzatore}`;

export const PLACEHOLDERS = [
  ['nome', 'nome di chi riceve la mail'],
  ['destinatario', 'persona a cui fare il regalo'],
  ['evento', "nome dell'evento"],
  ['data', 'data dello scambio'],
  ['luogo', 'luogo'],
  ['budget', 'budget'],
  ['messaggio', "messaggio dell'organizzatore"],
  ['organizzatore', "nome dell'organizzatore"],
];

export const CLIENTS = [
  ['mailto', 'App di posta del computer (Outlook desktop, Mail, Thunderbird)'],
  ['outlook-live', 'Outlook.com nel browser (account personale)'],
  ['outlook-365', 'Outlook Microsoft 365 nel browser (account di lavoro o scuola)'],
];

const EMAIL_RE = /^[^\s@,;<>"'?&#%()[\]\\]+@[^\s@,;<>"'?&#%()[\]\\]+\.[^\s@,;<>"'?&#%()[\]\\]{2,}$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Sostituisce i segnaposto. Una riga con soli segnaposto vuoti viene tolta,
// così "Luogo: " non compare se il luogo non è indicato.
export function fill(template, values) {
  const out = [];
  for (const line of String(template || '').split(/\r?\n/)) {
    const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => k in values);
    if (keys.length && keys.every((k) => !String(values[k] ?? '').trim())) continue;
    out.push(line.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k] ?? '') : m)));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function mailValues(ev, giver, receiver) {
  return {
    nome: giver.name.trim(),
    destinatario: receiver ? receiver.name.trim() : '',
    evento: (ev.name || '').trim() || 'Secret Santa',
    data: formatDate(ev.date),
    luogo: (ev.location || '').trim(),
    budget: (ev.budget || '').trim(),
    messaggio: (ev.message || '').trim(),
    organizzatore: (ev.organizer || '').trim(),
  };
}

export function buildMail(ev, giver) {
  const receiverId = ev.assignments ? ev.assignments[giver.id] : null;
  const receiver = ev.participants.find((p) => p.id === receiverId);
  if (!receiver) return null;
  const values = mailValues(ev, giver, receiver);
  return {
    to: giver.email.trim(),
    subject: fill(ev.mail.subject, values).replace(/\s+/g, ' ').trim(),
    body: fill(ev.mail.body, values),
  };
}

// Impronta del testo: se cambia dopo l'invio, la mail risulta da aggiornare.
export function mailHash(m) {
  let h = 0x811c9dc5;
  const s = `${m.to}\n${m.subject}\n${m.body}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function mailtoUrl(m) {
  const body = m.body.replace(/\n/g, '\r\n');
  return `mailto:${m.to}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(body)}`;
}

export function outlookUrl(m, client) {
  const base = client === 'outlook-365'
    ? 'https://outlook.office.com/mail/deeplink/compose'
    : 'https://outlook.live.com/mail/0/deeplink/compose';
  return `${base}?to=${encodeURIComponent(m.to)}&subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
}

export function composeUrl(m, client) {
  return client === 'mailto' ? mailtoUrl(m) : outlookUrl(m, client);
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// CSV per l'importazione dei destinatari in uno strumento di mail delivery: una riga per persona,
// separatore punto e virgola, UTF-8 con BOM (si apre bene anche in Excel).
export function deliveryCsv(ev, people) {
  const rows = [['email', 'nome', 'destinatario', 'evento', 'data', 'luogo', 'budget', 'messaggio', 'organizzatore', 'oggetto', 'testo']];
  for (const p of people) {
    const m = buildMail(ev, p);
    if (!m) continue;
    const receiver = ev.participants.find((x) => x.id === ev.assignments[p.id]);
    const v = mailValues(ev, p, receiver);
    rows.push([m.to, v.nome, v.destinatario, v.evento, v.data, v.luogo, v.budget, v.messaggio, v.organizzatore, m.subject, m.body]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
