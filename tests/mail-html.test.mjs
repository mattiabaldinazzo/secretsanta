import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMailHtml, buildEml, bodyToHtml, encodeHeader, dataSrc } from '../assets/js/mail-html.js';
import { DEFAULT_SUBJECT, DEFAULT_BODY } from '../assets/js/mail.js';

function event() {
  return {
    name: 'Natale è qui',
    organizer: 'Mattia',
    date: '2026-12-20',
    location: 'Sala <grande>',
    budget: '20 euro',
    message: 'Portate il regalo incartato.',
    participants: [
      { id: 'a', name: 'Anna', email: 'anna@esempio.it', exclusions: [] },
      { id: 'b', name: 'Bruno Né', email: 'bruno@esempio.it', exclusions: [] },
      { id: 'c', name: 'Al', email: 'al@esempio.it', exclusions: [] },
    ],
    assignments: { a: 'b', b: 'c', c: 'a' },
    mail: { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY, client: 'mailto', format: 'html' },
  };
}

function decodeParts(eml) {
  const parts = [...eml.matchAll(/Content-Type: (text\/(?:plain|html)); charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n\r\n--/g)];
  return Object.fromEntries(parts.map(([, type, b64]) => [type, Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8')]));
}

test("l'HTML contiene testo, destinatario evidenziato e dati escapati", () => {
  const ev = event();
  const { html } = buildMailHtml(ev, ev.participants[0]);
  assert.match(html, /Ciao Anna/);
  assert.match(html, /color:#CC0000;">Bruno Né<\/strong>/);
  assert.match(html, /Sala &lt;grande&gt;/);
  assert.doesNotMatch(html, /Sala <grande>/);
  for (const name of ['garland-top', 'garland-bottom', 'garland-left', 'garland-right', 'logo', 'paper']) {
    assert.ok(html.includes(`cid:${name}@secretsanta`), name);
  }
  assert.match(html, /font-family:'Dancing Script'/);
  assert.match(html, /\[if mso\]/);
});

test('evidenzia il nome solo come parola intera', () => {
  const out = bodyToHtml('Al regala ad Alessia e ad Al.', 'Al');
  assert.equal((out.match(/<strong/g) || []).length, 2);
  assert.match(out, /Alessia/);
});

test('anteprima con immagini data:', () => {
  const ev = event();
  const { html } = buildMailHtml(ev, ev.participants[0], { src: dataSrc });
  assert.ok(!html.includes('cid:'));
  assert.ok(html.includes('data:image/jpeg;base64,'));
});

test('file .eml: bozza con testo, HTML e immagini incorporate', () => {
  const ev = event();
  const { eml } = buildEml(ev, ev.participants[1]);
  assert.match(eml, /^X-Unsent: 1\r\n/);
  assert.match(eml, /\r\nTo: =\?UTF-8\?B\?[^?]+\?= <bruno@esempio\.it>\r\n/);
  assert.match(eml, /\r\nSubject: =\?UTF-8\?B\?/);
  assert.equal((eml.match(/Content-ID: </g) || []).length, 6);
  assert.ok(!/[^\r]\n/.test(eml), 'solo fine riga CRLF');
  const parts = decodeParts(eml);
  assert.match(parts['text/plain'], /farai il regalo a: Al/);
  assert.match(parts['text/html'], /Ciao Bruno Né/);
  for (const line of eml.split('\r\n')) assert.ok(line.length <= 998, 'riga troppo lunga');
});

test('intestazioni ASCII restano leggibili, le altre codificate', () => {
  assert.equal(encodeHeader('Secret Santa'), 'Secret Santa');
  const enc = encodeHeader('Natale è qui: ecco a chi fai il regalo, con un oggetto molto lungo');
  const decoded = enc.split('\r\n ').map((w) => Buffer.from(w.slice(10, -2), 'base64').toString('utf8')).join('');
  assert.equal(decoded, 'Natale è qui: ecco a chi fai il regalo, con un oggetto molto lungo');
  for (const w of enc.split('\r\n ')) assert.ok(w.length <= 75);
});
