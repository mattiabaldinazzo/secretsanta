import test from 'node:test';
import assert from 'node:assert/strict';
import {
  draw, findCycle, countCycles, validateAssignments, insertParticipant, removeFromAssignments,
} from '../assets/js/draw.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function people(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Persona ${i}`, email: `p${i}@esempio.it`, exclusions: [] }));
}

function exclude(list, a, b) {
  list.find((p) => p.id === a).exclusions.push(b);
  list.find((p) => p.id === b).exclusions.push(a);
}

test('estrazione valida e in un unico giro per gruppi da 3 a 60', () => {
  for (let n = 3; n <= 60; n++) {
    for (let s = 0; s < 5; s++) {
      const list = people(n);
      const a = draw(list, seeded(n * 100 + s));
      const { errors, warnings } = validateAssignments(list, a);
      assert.deepEqual(errors, []);
      assert.deepEqual(warnings, []);
      assert.equal(countCycles(a), 1);
    }
  }
});

test('le esclusioni vengono rispettate', () => {
  for (let s = 0; s < 50; s++) {
    const list = people(8);
    exclude(list, 'p0', 'p1');
    exclude(list, 'p2', 'p3');
    exclude(list, 'p4', 'p5');
    const a = draw(list, seeded(s));
    const { errors, warnings } = validateAssignments(list, a);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  }
});

test('estrazione impossibile genera un errore chiaro', () => {
  const list = people(3);
  exclude(list, 'p0', 'p1');
  exclude(list, 'p0', 'p2');
  assert.throws(() => draw(list, seeded(1)), /Nessun abbinamento possibile/);
});

test('se un giro unico e impossibile usa piu giri', () => {
  const list = people(4);
  // p0 puo regalare solo a p1 e viceversa, p2 solo a p3 e viceversa
  list[0].exclusions = ['p2', 'p3'];
  list[1].exclusions = ['p2', 'p3'];
  list[2].exclusions = ['p0', 'p1'];
  list[3].exclusions = ['p0', 'p1'];
  assert.equal(findCycle(list, seeded(3)), null);
  const a = draw(list, seeded(3));
  assert.deepEqual(validateAssignments(list, a).errors, []);
  assert.equal(countCycles(a), 2);
});

test('aggiunta ultimo minuto: cambia solo una mail esistente e resta un giro unico', () => {
  for (let s = 0; s < 50; s++) {
    const list = people(6);
    const before = draw(list, seeded(s));
    const newcomer = { id: 'nuovo', name: 'Nuovo', email: 'n@esempio.it', exclusions: [] };
    const res = insertParticipant(list, before, newcomer, seeded(s + 7));
    assert.ok(res);
    const all = [...list, newcomer];
    assert.deepEqual(validateAssignments(all, res.assignments).errors, []);
    assert.equal(countCycles(res.assignments), 1);
    const changedOld = list.filter((p) => before[p.id] !== res.assignments[p.id]).map((p) => p.id);
    assert.equal(changedOld.length, 1);
    assert.deepEqual(res.changed.sort(), [changedOld[0], 'nuovo'].sort());
  }
});

test('aggiunta ultimo minuto con partner escluso', () => {
  for (let s = 0; s < 50; s++) {
    const list = people(5);
    const before = draw(list, seeded(s));
    const newcomer = { id: 'nuovo', name: 'Nuovo', email: 'n@esempio.it', exclusions: ['p0'] };
    list[0].exclusions.push('nuovo');
    const res = insertParticipant(list, before, newcomer, seeded(s));
    assert.ok(res);
    const all = [...list, newcomer];
    const { errors, warnings } = validateAssignments(all, res.assignments);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  }
});

test('aggiunta impossibile restituisce null', () => {
  const list = people(3);
  const before = draw(list, seeded(1));
  const newcomer = { id: 'nuovo', name: 'Nuovo', email: 'n@esempio.it', exclusions: ['p0', 'p1', 'p2'] };
  assert.equal(insertParticipant(list, before, newcomer, seeded(1)), null);
});

test('rimozione ultimo minuto ricollega il giro', () => {
  for (let s = 0; s < 50; s++) {
    const list = people(6);
    const before = draw(list, seeded(s));
    const remaining = list.filter((p) => p.id !== 'p2');
    const res = removeFromAssignments(remaining, before, 'p2', seeded(s));
    assert.ok(res);
    assert.deepEqual(validateAssignments(remaining, res.assignments).errors, []);
    assert.equal(res.changed.length, 1);
  }
});

test('rimozione da una coppia chiusa scambia con un altro partecipante', () => {
  const list = people(5);
  // p0 <-> p1 e giro p2 -> p3 -> p4 -> p2
  const before = { p0: 'p1', p1: 'p0', p2: 'p3', p3: 'p4', p4: 'p2' };
  const remaining = list.filter((p) => p.id !== 'p1');
  const res = removeFromAssignments(remaining, before, 'p1', seeded(2));
  assert.ok(res);
  assert.deepEqual(validateAssignments(remaining, res.assignments).errors, []);
  assert.equal(res.changed.length, 2);
});

test('validazione trova regali doppi, mancanti e a se stessi', () => {
  const list = people(3);
  const { errors } = validateAssignments(list, { p0: 'p1', p1: 'p1' });
  assert.ok(errors.some((e) => e.includes('se stesso')));
  assert.ok(errors.some((e) => e.includes('due regali')));
  assert.ok(errors.some((e) => e.includes('Persona 2 non ha')));
  assert.ok(errors.some((e) => e.includes('Persona 0 non riceve')));
});

test('validazione segnala le coppie che si scambiano il regalo', () => {
  const list = people(4);
  const { errors, warnings } = validateAssignments(list, { p0: 'p1', p1: 'p0', p2: 'p3', p3: 'p2' });
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 2);
});
