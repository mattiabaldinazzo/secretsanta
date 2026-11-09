import test from 'node:test';
import assert from 'node:assert/strict';
import { blankEvent, exportBackup, parseBackup, decryptBackup, normalizeEvent } from '../assets/js/store.js';

function sample() {
  const ev = blankEvent();
  ev.name = 'Prova';
  ev.participants = [
    { id: 'a', name: 'Anna', email: 'anna@esempio.it', exclusions: ['b'], sent: null },
    { id: 'b', name: 'Bruno', email: 'bruno@esempio.it', exclusions: ['a'], sent: null },
    { id: 'c', name: 'Carla', email: 'carla@esempio.it', exclusions: [], sent: null },
  ];
  ev.assignments = { a: 'c', c: 'b', b: 'a' };
  return ev;
}

test('backup in chiaro: andata e ritorno', async () => {
  const ev = sample();
  const parsed = parseBackup(await exportBackup(ev, ''));
  assert.equal(parsed.encrypted, false);
  assert.deepEqual(parsed.event, ev);
});

test('backup cifrato: non contiene dati leggibili e si riapre con la password', async () => {
  const ev = sample();
  const text = await exportBackup(ev, 'password-lunga');
  assert.ok(!text.includes('anna@esempio.it'));
  assert.ok(!text.includes('Anna'));
  const parsed = parseBackup(text);
  assert.equal(parsed.encrypted, true);
  assert.deepEqual(await decryptBackup(parsed, 'password-lunga'), ev);
  await assert.rejects(() => decryptBackup(parsed, 'sbagliata'), /Password errata/);
});

test('normalizeEvent scarta abbinamenti verso persone inesistenti', () => {
  const ev = sample();
  ev.assignments.x = 'a';
  ev.assignments.a = 'zz';
  const out = normalizeEvent(ev);
  assert.equal(out.assignments.x, undefined);
  assert.equal(out.assignments.a, undefined);
  assert.equal(out.assignments.c, 'b');
});

test('file estranei rifiutati', () => {
  assert.throws(() => parseBackup('non json'), /non è un backup valido/);
  assert.throws(() => parseBackup('{"format":"altro"}'), /non è un backup di questo sito/);
});
