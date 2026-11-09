import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fill, buildMail, mailHash, mailtoUrl, outlookUrl, deliveryCsv, isValidEmail, DEFAULT_SUBJECT, DEFAULT_BODY,
} from '../assets/js/mail.js';

function event(overrides = {}) {
  return {
    name: 'Natale 2026',
    organizer: 'Mattia',
    date: '2026-12-20',
    location: '',
    budget: '20 euro',
    message: 'Portate il regalo incartato.',
    participants: [
      { id: 'a', name: 'Anna', email: 'anna@esempio.it', exclusions: [] },
      { id: 'b', name: 'Bruno "B"', email: 'bruno@esempio.it', exclusions: [] },
      { id: 'c', name: 'Carla', email: 'carla@esempio.it', exclusions: [] },
    ],
    assignments: { a: 'b', b: 'c', c: 'a' },
    mail: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY, client: 'mailto' },
    ...overrides,
  };
}

test('fill toglie le righe con segnaposto vuoti', () => {
  const out = fill('Ciao {nome}\nLuogo: {luogo}\nFine', { nome: 'Anna', luogo: '' });
  assert.equal(out, 'Ciao Anna\nFine');
});

test('buildMail usa il destinatario corretto', () => {
  const m = buildMail(event(), event().participants[0]);
  assert.equal(m.to, 'anna@esempio.it');
  assert.equal(m.subject, 'Natale 2026: ecco a chi fai il regalo');
  assert.match(m.body, /farai il regalo a: Bruno "B"/);
  assert.match(m.body, /Budget: 20 euro/);
  assert.doesNotMatch(m.body, /Luogo/);
  assert.match(m.body, /dicembre 2026/);
});

test('buildMail senza abbinamento restituisce null', () => {
  const ev = event({ assignments: null });
  assert.equal(buildMail(ev, ev.participants[0]), null);
});

test("l'impronta cambia se cambia il destinatario", () => {
  const ev = event();
  const h1 = mailHash(buildMail(ev, ev.participants[0]));
  ev.assignments = { a: 'c', c: 'b', b: 'a' };
  const h2 = mailHash(buildMail(ev, ev.participants[0]));
  assert.notEqual(h1, h2);
});

test('link mailto e Outlook codificati', () => {
  const m = { to: 'anna@esempio.it', subject: 'Ciao & auguri', body: 'Riga 1\nRiga 2' };
  assert.equal(mailtoUrl(m), 'mailto:anna@esempio.it?subject=Ciao%20%26%20auguri&body=Riga%201%0D%0ARiga%202');
  assert.ok(outlookUrl(m, 'outlook-365').startsWith('https://outlook.office.com/mail/deeplink/compose?to=anna%40esempio.it'));
  assert.ok(outlookUrl(m, 'outlook-live').startsWith('https://outlook.live.com/mail/0/deeplink/compose?'));
});

test('CSV per mail delivery con intestazione, virgolette e BOM', () => {
  const ev = event();
  const csv = deliveryCsv(ev, ev.participants);
  assert.ok(csv.startsWith('﻿"email";"nome";"destinatario"'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0].split(';').length, 11);
  assert.ok(csv.includes('"Bruno ""B"""'));
  assert.ok(csv.includes('"anna@esempio.it";"Anna";"Bruno ""B"""'));
});

test('validazione email', () => {
  assert.ok(isValidEmail('nome.cognome+tag@azienda.it'));
  assert.ok(!isValidEmail('senza-chiocciola.it'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(!isValidEmail('a b@c.it'));
  assert.ok(!isValidEmail('a@b.it?cc=x@y.it'));
});
