// Logica pura del Secret Santa: estrazione, controlli, aggiunte e rimozioni
// dell'ultimo minuto. Nessun accesso al DOM, quindi è testabile con Node.

export function secureRandom() {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

export function shuffle(list, rng = secureRandom) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chi regala (giver) può pescare chi riceve (receiver)?
export function canGive(giver, receiver) {
  if (!giver || !receiver) return false;
  if (giver.id === receiver.id) return false;
  return !(giver.exclusions || []).includes(receiver.id);
}

function byId(participants) {
  return new Map(participants.map((p) => [p.id, p]));
}

const CYCLE_STEP_LIMIT = 200000;

// Cerca un giro unico (A -> B -> C -> ... -> A) che rispetti le esclusioni.
// Un giro unico evita gruppi chiusi e coppie che si scambiano il regalo.
export function findCycle(participants, rng = secureRandom) {
  const n = participants.length;
  if (n < 2) return null;
  const order = shuffle(participants, rng);
  const start = order[0];
  const path = [start];
  const used = new Set([start.id]);
  let steps = 0;

  function extend() {
    steps++;
    if (steps > CYCLE_STEP_LIMIT) return false;
    const last = path[path.length - 1];
    if (path.length === n) return canGive(last, start);
    const next = shuffle(order.filter((p) => !used.has(p.id) && canGive(last, p)), rng);
    for (const p of next) {
      path.push(p);
      used.add(p.id);
      if (extend()) return true;
      path.pop();
      used.delete(p.id);
      if (steps > CYCLE_STEP_LIMIT) return false;
    }
    return false;
  }

  if (!extend()) return null;
  const result = {};
  for (let i = 0; i < n; i++) result[path[i].id] = path[(i + 1) % n].id;
  return result;
}

// Ripiego: abbinamento qualsiasi (anche con più giri) tramite matching
// bipartito. Trova sempre una soluzione se ne esiste almeno una.
export function findMatching(participants, rng = secureRandom) {
  const givers = shuffle(participants, rng);
  const options = new Map(
    givers.map((g) => [g.id, shuffle(participants.filter((r) => canGive(g, r)), rng).map((r) => r.id)])
  );
  const ownerOf = new Map();

  function tryAssign(giverId, seen) {
    for (const r of options.get(giverId)) {
      if (seen.has(r)) continue;
      seen.add(r);
      const owner = ownerOf.get(r);
      if (owner === undefined || tryAssign(owner, seen)) {
        ownerOf.set(r, giverId);
        return true;
      }
    }
    return false;
  }

  for (const g of givers) {
    if (!tryAssign(g.id, new Set())) return null;
  }
  const result = {};
  for (const [r, g] of ownerOf) result[g] = r;
  return result;
}

export function draw(participants, rng = secureRandom) {
  if (participants.length < 3) throw new Error('Servono almeno 3 partecipanti.');
  const cycle = findCycle(participants, rng);
  if (cycle) return cycle;
  const matching = findMatching(participants, rng);
  if (matching) return matching;
  throw new Error('Nessun abbinamento possibile con le esclusioni attuali. Togli qualche esclusione e riprova.');
}

export function countCycles(assignments) {
  const seen = new Set();
  let cycles = 0;
  for (const start of Object.keys(assignments)) {
    if (seen.has(start)) continue;
    let cur = start;
    let closed = false;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      cur = assignments[cur];
      if (cur === start) closed = true;
    }
    if (closed) cycles++;
  }
  return cycles;
}

// Errori: abbinamenti impossibili da salvare. Avvisi: validi ma sconsigliati.
export function validateAssignments(participants, assignments) {
  const errors = [];
  const warnings = [];
  const map = byId(participants);
  const receivedFrom = new Map();
  const a = assignments || {};

  for (const g of participants) {
    const rId = a[g.id];
    if (!rId) {
      errors.push(`${g.name} non ha nessuno a cui fare il regalo.`);
      continue;
    }
    const r = map.get(rId);
    if (!r) {
      errors.push(`${g.name} ha un destinatario che non esiste più.`);
      continue;
    }
    if (r.id === g.id) errors.push(`${g.name} non può fare il regalo a se stesso.`);
    if (receivedFrom.has(rId)) {
      errors.push(`${r.name} riceve due regali: da ${map.get(receivedFrom.get(rId)).name} e da ${g.name}.`);
    } else {
      receivedFrom.set(rId, g.id);
    }
    if ((g.exclusions || []).includes(rId)) warnings.push(`${g.name} -> ${r.name} non rispetta un'esclusione.`);
    if (participants.length > 2 && r.id !== g.id && a[rId] === g.id && g.id < rId) {
      warnings.push(`${g.name} e ${r.name} si fanno il regalo a vicenda.`);
    }
  }
  for (const p of participants) {
    if (!receivedFrom.has(p.id)) errors.push(`${p.name} non riceve nessun regalo.`);
  }
  return { errors, warnings };
}

// Aggiunta dell'ultimo minuto: inserisce il nuovo arrivato nel giro esistente.
// Se G regalava a R, ora G regala al nuovo e il nuovo regala a R.
// Cambia la mail di una sola persona già avvisata (G).
export function insertParticipant(participants, assignments, newcomer, rng = secureRandom) {
  const map = byId(participants);
  const candidates = shuffle(
    participants.filter((g) => {
      if (g.id === newcomer.id) return false;
      const r = map.get(assignments[g.id]);
      return r && canGive(g, newcomer) && canGive(newcomer, r);
    }),
    rng
  );
  if (!candidates.length) return null;
  const g = candidates[0];
  const next = { ...assignments, [g.id]: newcomer.id, [newcomer.id]: assignments[g.id] };
  return { assignments: next, changed: [g.id, newcomer.id] };
}

// Rimozione dell'ultimo minuto: chi regalava alla persona che esce prende
// il suo destinatario. Se non si può (esclusione o regalo a se stesso),
// scambia il destinatario con un altro partecipante.
export function removeFromAssignments(remaining, assignments, leavingId, rng = secureRandom) {
  const next = { ...assignments };
  const receiverId = next[leavingId];
  delete next[leavingId];
  const giverId = Object.keys(next).find((g) => next[g] === leavingId);
  if (!giverId) return { assignments: next, changed: [] };
  const map = byId(remaining);
  const giver = map.get(giverId);
  const receiver = map.get(receiverId);
  if (!giver || !receiver) return null;

  if (canGive(giver, receiver)) {
    next[giverId] = receiverId;
    return { assignments: next, changed: [giverId] };
  }
  for (const h of shuffle(remaining.filter((p) => p.id !== giverId), rng)) {
    const s = map.get(next[h.id]);
    if (s && canGive(giver, s) && canGive(h, receiver)) {
      next[giverId] = s.id;
      next[h.id] = receiverId;
      return { assignments: next, changed: [giverId, h.id] };
    }
  }
  return null;
}
