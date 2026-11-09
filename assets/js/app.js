// Interfaccia. Tutti i dati restano nel localStorage di questo browser.
import { draw, countCycles, validateAssignments, insertParticipant, removeFromAssignments } from './draw.js';
import {
  DEFAULT_SUBJECT, DEFAULT_BODY, PLACEHOLDERS, CLIENTS,
  buildMail, mailHash, composeUrl, mailupCsv, isValidEmail, formatDate,
} from './mail.js';
import { loadEvents, saveEvents, blankEvent, newId, exportBackup, parseBackup, decryptBackup } from './store.js';

const app = document.getElementById('app');
const toastBox = document.getElementById('toast');

let events = loadEvents();
const ui = { reveal: false, editing: null, pendingImport: null, templateOpen: false };
let ctx = null;

const STATE_LABEL = {
  none: 'Senza abbinamento',
  pending: 'Da inviare',
  outdated: 'Da aggiornare',
  sent: 'Inviata',
};

// ---------- utilità ----------

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'open') el[k] = true;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  if (value !== undefined) el.value = value;
  return el;
}

function toast(message, kind = 'info') {
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    h('span', {}, message),
    h('button', { class: 'toast-close', type: 'button', 'aria-label': 'Chiudi', onclick: () => el.remove() }, 'x'));
  toastBox.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 10000 : 6000);
}

function persist(ev) {
  if (ev) ev.updatedAt = new Date().toISOString();
  if (!saveEvents(events)) toast('Il browser non permette di salvare i dati. Scarica subito un backup.', 'error');
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(text) {
  return (text || 'evento').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'evento';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function names(ev, ids) {
  return ids.map((id) => ev.participants.find((p) => p.id === id)?.name).filter(Boolean).join(', ');
}

function mailState(ev, p) {
  const m = buildMail(ev, p);
  if (!m) return 'none';
  if (!p.sent) return 'pending';
  return p.sent.hash === mailHash(m) ? 'sent' : 'outdated';
}

function field(label, control, hint) {
  return h('label', { class: 'field' },
    h('span', { class: 'label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null);
}

// ---------- routing ----------

function route() {
  ui.editing = null;
  ui.reveal = false;
  ui.pendingImport = null;
  const m = location.hash.match(/^#\/evento\/([\w-]+)/);
  if (m) {
    const ev = events.find((e) => e.id === m[1]);
    if (ev) {
      renderEvent(ev);
      window.scrollTo(0, 0);
      return;
    }
    toast('Evento non trovato in questo browser.', 'error');
    location.hash = '#/';
    return;
  }
  ctx = null;
  renderHome();
}

// ---------- home ----------

function renderHome() {
  document.title = 'Secret Santa';
  const sorted = events.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  app.replaceChildren(
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, 'Scambio di regali'),
      h('h1', {}, 'Organizza il tuo Secret Santa'),
      h('p', { class: 'lead' },
        "Aggiungi i partecipanti, fai l'estrazione e manda a ognuno una mail con il nome della persona a cui fare il regalo. Puoi aggiungere persone anche dopo l'estrazione."),
      h('div', { class: 'actions' },
        h('button', { class: 'btn btn-primary btn-large', type: 'button', onclick: onNewEvent }, 'Nuovo evento'))),
    h('section', { class: 'panel' },
      h('h2', {}, 'I tuoi eventi'),
      sorted.length
        ? h('ul', { class: 'event-list' }, sorted.map(eventCard))
        : h('p', { class: 'muted' }, 'Nessun evento salvato in questo browser.')),
    importPanel(),
    h('section', { class: 'panel panel-quiet' },
      h('h2', {}, 'Dove finiscono i dati'),
      h('ul', { class: 'plain-list' },
        h('li', {}, 'Nomi, email e abbinamenti restano solo nel browser che stai usando.'),
        h('li', {}, 'Il sito non ha server e non invia dati a nessuno, nemmeno a GitHub.'),
        h('li', {}, 'Le mail partono dal tuo account di posta: tu controlli il testo e premi Invia.'),
        h('li', {}, 'Per cambiare computer o non perdere nulla, scarica un backup (anche cifrato con password).')))
  );
}

function eventCard(ev) {
  const total = ev.participants.length;
  let status = 'Estrazione da fare';
  if (ev.assignments) {
    const todo = ev.participants.filter((p) => ['pending', 'outdated'].includes(mailState(ev, p))).length;
    status = todo ? `${todo} mail da inviare` : 'Mail inviate';
  }
  return h('li', {},
    h('a', { class: 'event-card', href: `#/evento/${ev.id}` },
      h('span', { class: 'event-card-name' }, ev.name || 'Evento senza nome'),
      h('span', { class: 'event-card-meta' },
        [ev.date ? formatDate(ev.date) : 'Data da decidere', `${total} ${total === 1 ? 'persona' : 'persone'}`, status].join(' | '))));
}

function onNewEvent() {
  const ev = blankEvent();
  events.push(ev);
  persist(ev);
  location.hash = `#/evento/${ev.id}`;
}

function importPanel() {
  const box = h('section', { class: 'panel' });
  const paint = () => {
    const children = [
      h('h2', {}, 'Importa un backup'),
      h('p', { class: 'muted' }, 'Carica un file scaricato da questo sito per riprendere un evento su un altro computer o browser.'),
    ];
    if (!ui.pendingImport) {
      const input = h('input', {
        type: 'file', accept: '.json,application/json', class: 'visually-hidden', id: 'import-file',
        onchange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const parsed = parseBackup(await file.text());
            if (parsed.encrypted) {
              ui.pendingImport = parsed;
              paint();
            } else {
              finishImport(parsed.event);
            }
          } catch (err) {
            toast(err.message, 'error');
          }
          e.target.value = '';
        },
      });
      children.push(h('div', { class: 'actions' }, input, h('label', { class: 'btn', for: 'import-file' }, 'Scegli il file')));
    } else {
      const pw = h('input', { type: 'password', class: 'input', autocomplete: 'off', placeholder: 'Password del backup', required: true });
      children.push(h('form', {
        class: 'inline-form',
        onsubmit: async (e) => {
          e.preventDefault();
          try {
            const ev = await decryptBackup(ui.pendingImport, pw.value);
            ui.pendingImport = null;
            finishImport(ev);
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      },
      field('Il backup è cifrato', pw),
      h('div', { class: 'actions' },
        h('button', { class: 'btn btn-primary', type: 'submit' }, 'Apri il backup'),
        h('button', { class: 'btn', type: 'button', onclick: () => { ui.pendingImport = null; paint(); } }, 'Annulla'))));
      setTimeout(() => pw.focus(), 0);
    }
    box.replaceChildren(...children);
  };
  paint();
  return box;
}

function finishImport(ev) {
  const idx = events.findIndex((e) => e.id === ev.id);
  if (idx >= 0) {
    const replace = confirm(`In questo browser c'è già "${events[idx].name || 'Evento senza nome'}". OK lo sostituisce con il backup, Annulla lo importa come copia.`);
    if (replace) events[idx] = ev;
    else {
      ev.id = newId();
      events.push(ev);
    }
  } else {
    events.push(ev);
  }
  persist(ev);
  toast('Backup importato.');
  location.hash = `#/evento/${ev.id}`;
}

// ---------- pagina evento ----------

function renderEvent(ev) {
  document.title = `${ev.name || 'Nuovo evento'} - Secret Santa`;
  const sections = {};
  const body = (key) => {
    const el = h('div', { class: 'section-body' });
    sections[key] = el;
    return el;
  };
  const panel = (num, title, id, ...bodies) => h('section', { class: 'panel step', id },
    h('header', { class: 'step-head' }, h('span', { class: 'step-num' }, num), h('h2', {}, title)),
    ...bodies);

  app.replaceChildren(
    h('nav', { class: 'crumbs', 'aria-label': 'Percorso' }, h('a', { href: '#/' }, 'I miei eventi')),
    h('h1', { class: 'event-title', id: 'event-title' }, ev.name || 'Nuovo evento'),
    h('nav', { class: 'jump', 'aria-label': 'Sezioni' },
      [['sez-dettagli', 'Dettagli'], ['sez-partecipanti', 'Partecipanti'], ['sez-esclusioni', 'Esclusioni'],
        ['sez-abbinamenti', 'Abbinamenti'], ['sez-mail', 'Mail'], ['sez-backup', 'Backup']]
        .map(([id, label]) => h('a', {
          href: `#${id}`,
          onclick: (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); },
        }, label))),
    panel('01', 'Dettagli', 'sez-dettagli', body('details')),
    panel('02', 'Partecipanti', 'sez-partecipanti', body('participants')),
    panel('03', 'Esclusioni', 'sez-esclusioni', body('exclusions')),
    panel('04', 'Abbinamenti', 'sez-abbinamenti', body('assign')),
    panel('05', 'Invio mail', 'sez-mail', body('mailsetup'), body('mail')),
    panel('06', 'Backup e privacy', 'sez-backup', body('backup')));

  ctx = {
    ev,
    sections,
    renderers: {
      details: renderDetails,
      participants: renderParticipants,
      exclusions: renderExclusions,
      assign: renderAssign,
      mailsetup: renderMailSetup,
      mail: renderMailList,
      backup: renderBackup,
    },
  };
  refresh(...Object.keys(ctx.renderers));
}

function refresh(...keys) {
  if (!ctx) return;
  for (const k of keys) ctx.sections[k].replaceChildren(...[].concat(ctx.renderers[k](ctx.ev)).filter(Boolean));
}

// 01 Dettagli

function renderDetails(ev) {
  const bind = (key, el) => {
    el.value = ev[key] || '';
    el.addEventListener('input', () => {
      ev[key] = el.value;
      persist(ev);
      if (key === 'name') {
        document.getElementById('event-title').textContent = el.value || 'Nuovo evento';
        document.title = `${el.value || 'Nuovo evento'} - Secret Santa`;
      }
    });
    el.addEventListener('change', () => refresh('mail'));
    return el;
  };
  return h('div', { class: 'grid-2' },
    field('Nome evento', bind('name', h('input', { class: 'input', placeholder: 'Es. Natale in ufficio', maxlength: 120 }))),
    field('Organizzatore', bind('organizer', h('input', { class: 'input', placeholder: 'Il tuo nome, firma le mail', maxlength: 80 }))),
    field('Data dello scambio', bind('date', h('input', { class: 'input', type: 'date', min: today() }))),
    field('Luogo', bind('location', h('input', { class: 'input', placeholder: 'Es. Sala riunioni, terzo piano', maxlength: 160 }))),
    field('Budget', bind('budget', h('input', { class: 'input', placeholder: 'Es. 20 euro', maxlength: 40 }))),
    h('div', { class: 'span-2' },
      field('Messaggio per tutti', bind('message', h('textarea', { class: 'input', rows: 4, maxlength: 1500, placeholder: 'Es. Portate il regalo incartato con il nome sopra.' })))));
}

// 02 Partecipanti

function renderParticipants(ev) {
  const drawn = !!ev.assignments;
  const nodes = [];
  nodes.push(h('p', { class: drawn ? 'notice' : 'hint' }, drawn
    ? "L'estrazione è già fatta. Chi aggiungi ora entra nel giro senza rifare tutto: cambia solo la mail di una persona già avvisata. Se togli qualcuno, chi gli faceva il regalo prende il suo destinatario."
    : 'Servono almeno 3 persone. Ogni nome deve essere diverso dagli altri.'));

  if (ev.participants.length) {
    nodes.push(h('ol', { class: 'people' }, ev.participants.map((p, i) => personRow(ev, p, i))));
  }

  const nameIn = h('input', { class: 'input', placeholder: 'Nome', autocomplete: 'off', maxlength: 80, required: true });
  const mailIn = h('input', { class: 'input', type: 'email', placeholder: 'Email', autocomplete: 'off', maxlength: 200, required: true });
  const partnerSel = h('select', { class: 'input' },
    h('option', { value: '' }, 'Nessuna'),
    ev.participants.map((p) => h('option', { value: p.id }, p.name || '(senza nome)')));
  nodes.push(h('form', {
    class: 'add-form',
    onsubmit: (e) => {
      e.preventDefault();
      const res = addPeople(ev, [{ name: nameIn.value, email: mailIn.value, partnerId: partnerSel.value }]);
      if (res.added.length) {
        const again = ctx.sections.participants.querySelector('.add-form input');
        if (again) again.focus();
      }
    },
  },
  h('h3', {}, drawn ? "Aggiungi all'ultimo minuto" : 'Aggiungi una persona'),
  h('div', { class: 'add-grid' },
    field('Nome', nameIn),
    field('Email', mailIn),
    field('Non deve pescare', partnerSel, 'Es. il partner. Vale nei due sensi.'),
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Aggiungi'))));

  const bulk = h('textarea', { class: 'input', rows: 5, placeholder: 'Mario Rossi; mario@esempio.it\nGiulia Bianchi <giulia@esempio.it>\nluca@esempio.it' });
  nodes.push(h('details', { class: 'bulk' },
    h('summary', {}, 'Incolla una lista di persone'),
    h('p', { class: 'hint' }, 'Una persona per riga: nome ed email separati da punto e virgola, virgola o tab. Funziona anche una colonna copiata da Excel.'),
    bulk,
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          const { people, bad } = parseList(bulk.value);
          if (bad.length) toast(`Righe non riconosciute: ${bad.join(' | ')}`, 'error');
          if (people.length) addPeople(ev, people);
        },
      }, 'Aggiungi tutti'))));
  return nodes;
}

function personRow(ev, p, i) {
  const nameIn = h('input', { class: 'input', value: p.name, 'aria-label': `Nome partecipante ${i + 1}`, maxlength: 80 });
  const mailIn = h('input', {
    class: `input${isValidEmail(p.email) ? '' : ' input-error'}`, type: 'email', value: p.email,
    'aria-label': `Email di ${p.name}`, maxlength: 200,
  });
  nameIn.addEventListener('change', () => {
    const value = nameIn.value.trim();
    const dup = ev.participants.some((x) => x.id !== p.id && x.name.trim().toLowerCase() === value.toLowerCase());
    if (!value || dup) {
      toast(!value ? 'Il nome non può essere vuoto.' : `${value} c'è già.`, 'error');
      nameIn.value = p.name;
      return;
    }
    p.name = value;
    persist(ev);
    refresh('participants', 'exclusions', 'assign', 'mail');
  });
  mailIn.addEventListener('change', () => {
    p.email = mailIn.value.trim();
    if (!isValidEmail(p.email)) toast(`Email non valida per ${p.name}.`, 'error');
    persist(ev);
    refresh('participants', 'assign', 'mail');
  });
  const excl = (p.exclusions || []).length;
  return h('li', { class: 'person' },
    h('span', { class: 'person-num' }, String(i + 1)),
    nameIn,
    mailIn,
    h('span', { class: 'person-meta' }, excl ? `${excl} ${excl === 1 ? 'esclusione' : 'esclusioni'}` : ''),
    h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: () => removePerson(ev, p.id) }, 'Togli'));
}

function parseList(text) {
  const people = [];
  const bad = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.*?)[\s;,\t"]*<?([^\s<>;,"]+@[^\s<>;,"]+?)>?[\s;,"]*$/);
    if (!m) {
      bad.push(line);
      continue;
    }
    let name = m[1].replace(/^["'\s]+|["'\s;,]+$/g, '').trim();
    const email = m[2].trim();
    if (!name) name = email.split('@')[0];
    people.push({ name, email, partnerId: '' });
  }
  return { people, bad };
}

function addPeople(ev, list) {
  const added = [];
  const problems = [];
  const changed = new Set();
  const stuck = [];
  for (const item of list) {
    const name = String(item.name || '').trim();
    const email = String(item.email || '').trim();
    if (!name) { problems.push(`manca il nome per ${email || 'una riga'}`); continue; }
    if (!isValidEmail(email)) { problems.push(`email non valida per ${name}`); continue; }
    if (ev.participants.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) { problems.push(`${name} c'è già`); continue; }
    const p = { id: newId(), name, email, exclusions: [], sent: null };
    const partner = item.partnerId ? ev.participants.find((x) => x.id === item.partnerId) : null;
    if (partner) {
      p.exclusions.push(partner.id);
      partner.exclusions = [...new Set([...(partner.exclusions || []), p.id])];
    }
    if (ev.assignments) {
      const res = insertParticipant(ev.participants, ev.assignments, p);
      ev.participants.push(p);
      if (res) {
        ev.assignments = res.assignments;
        res.changed.forEach((id) => changed.add(id));
      } else {
        stuck.push(name);
      }
    } else {
      ev.participants.push(p);
    }
    added.push(name);
  }
  if (added.length) persist(ev);
  if (problems.length) toast(`Non aggiunti: ${problems.join('; ')}.`, 'error');
  if (added.length) {
    let msg = `Aggiunti: ${added.join(', ')}.`;
    if (changed.size) msg += ` Mail da inviare: ${names(ev, [...changed])}.`;
    toast(msg, 'success');
  }
  if (stuck.length) {
    toast(`Non riesco a inserire ${stuck.join(', ')} nel giro senza violare le esclusioni. Correggi gli abbinamenti a mano o rifai l'estrazione.`, 'error');
  }
  refresh('participants', 'exclusions', 'assign', 'mail');
  return { added, problems };
}

function removePerson(ev, id) {
  const p = ev.participants.find((x) => x.id === id);
  if (!p) return;
  const drawn = !!ev.assignments;
  const question = drawn
    ? `Togliere ${p.name}? L'estrazione resta valida: cambia solo la mail di chi gli faceva il regalo.`
    : `Togliere ${p.name}?`;
  if (!confirm(question)) return;

  const remaining = ev.participants
    .filter((x) => x.id !== id)
    .map((x) => ({ ...x, exclusions: (x.exclusions || []).filter((e) => e !== id) }));

  let changed = [];
  if (drawn) {
    if (remaining.length < 3) {
      toast("Dopo l'estrazione servono almeno 3 persone. Aggiungi qualcuno prima di togliere.", 'error');
      return;
    }
    const res = removeFromAssignments(remaining, ev.assignments, id);
    if (res) {
      ev.assignments = res.assignments;
      changed = res.changed;
    } else {
      const next = { ...ev.assignments };
      const giver = Object.keys(next).find((g) => next[g] === id);
      delete next[id];
      if (giver) delete next[giver];
      ev.assignments = next;
      toast('Non riesco a ricollegare il giro rispettando le esclusioni. Correggi gli abbinamenti a mano o rifai l\'estrazione.', 'error');
    }
  }
  for (const x of ev.participants) x.exclusions = (x.exclusions || []).filter((e) => e !== id);
  ev.participants = ev.participants.filter((x) => x.id !== id);
  persist(ev);

  let msg = `${p.name} tolto.`;
  if (changed.length) msg += ` Mail da aggiornare: ${names(ev, changed)}.`;
  if (drawn && p.sent) msg += ` Avvisa ${p.name} che non partecipa più.`;
  toast(msg, 'success');
  refresh('participants', 'exclusions', 'assign', 'mail');
}

// 03 Esclusioni

function exclusionPairs(ev) {
  const pairs = [];
  const seen = new Set();
  for (const a of ev.participants) {
    for (const bId of a.exclusions || []) {
      const b = ev.participants.find((x) => x.id === bId);
      if (!b) continue;
      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([a, b]);
    }
  }
  return pairs;
}

function renderExclusions(ev) {
  const nodes = [h('p', { class: 'hint' }, 'Due persone in coppia non si pescano a vicenda. Utile per partner, genitori e figli o colleghi dello stesso ufficio.')];
  if (ev.assignments) {
    nodes.push(h('p', { class: 'hint' }, "Le esclusioni valgono per le prossime estrazioni e per le aggiunte dell'ultimo minuto. Sugli abbinamenti attuali vedi un avviso se qualcosa non torna."));
  }
  if (ev.participants.length < 2) {
    nodes.push(h('p', { class: 'muted' }, 'Aggiungi prima almeno due persone.'));
    return nodes;
  }
  const pairs = exclusionPairs(ev);
  if (pairs.length) {
    nodes.push(h('ul', { class: 'pairs' }, pairs.map(([a, b]) => h('li', { class: 'pair' },
      h('span', {}, `${a.name} e ${b.name}`),
      h('button', {
        class: 'btn btn-small', type: 'button',
        onclick: () => {
          a.exclusions = (a.exclusions || []).filter((x) => x !== b.id);
          b.exclusions = (b.exclusions || []).filter((x) => x !== a.id);
          persist(ev);
          refresh('participants', 'exclusions', 'assign');
        },
      }, 'Rimuovi')))));
  } else {
    nodes.push(h('p', { class: 'muted' }, 'Nessuna esclusione.'));
  }
  const options = () => ev.participants.map((p) => h('option', { value: p.id }, p.name || '(senza nome)'));
  const selA = h('select', { class: 'input', 'aria-label': 'Prima persona' }, options());
  const selB = h('select', { class: 'input', 'aria-label': 'Seconda persona' }, options());
  if (ev.participants[1]) selB.value = ev.participants[1].id;
  nodes.push(h('form', {
    class: 'pair-form',
    onsubmit: (e) => {
      e.preventDefault();
      const a = ev.participants.find((p) => p.id === selA.value);
      const b = ev.participants.find((p) => p.id === selB.value);
      if (!a || !b || a.id === b.id) {
        toast('Scegli due persone diverse.', 'error');
        return;
      }
      a.exclusions = [...new Set([...(a.exclusions || []), b.id])];
      b.exclusions = [...new Set([...(b.exclusions || []), a.id])];
      persist(ev);
      refresh('participants', 'exclusions', 'assign');
    },
  }, selA, h('span', { class: 'pair-and' }, 'e'), selB, h('button', { class: 'btn', type: 'submit' }, 'Non si pescano')));
  return nodes;
}

// 04 Abbinamenti

function readiness(ev) {
  const issues = [];
  if (ev.participants.length < 3) issues.push(`Servono almeno 3 persone (ora ${ev.participants.length}).`);
  for (const p of ev.participants) {
    if (!p.name.trim()) issues.push('Una persona non ha il nome.');
    else if (!isValidEmail(p.email)) issues.push(`Email non valida per ${p.name}.`);
  }
  return issues;
}

function doDraw(ev) {
  const issues = readiness(ev);
  if (issues.length) {
    toast(issues[0], 'error');
    return;
  }
  const anySent = ev.participants.some((p) => p.sent);
  if (ev.assignments && !confirm(anySent
    ? "Rifare l'estrazione? Tutti dovranno ricevere una nuova mail e le mail già inviate non saranno più valide."
    : "Rifare l'estrazione da capo?")) return;
  try {
    ev.assignments = draw(ev.participants);
    ev.drawnAt = new Date().toISOString();
    ui.editing = null;
    persist(ev);
    const cycles = countCycles(ev.assignments);
    toast(cycles === 1
      ? 'Estrazione fatta: un unico giro, nessuno si scambia il regalo con chi glielo fa.'
      : `Estrazione fatta. Con queste esclusioni non è possibile un giro unico: ci sono ${cycles} giri separati.`, 'success');
    refresh('participants', 'assign', 'mail');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function issuesBox(errors, warnings, revealed) {
  if (!errors.length && !warnings.length) return null;
  if (!revealed) {
    const parts = [];
    if (errors.length) parts.push(`${errors.length} ${errors.length === 1 ? 'problema' : 'problemi'}`);
    if (warnings.length) parts.push(`${warnings.length} ${warnings.length === 1 ? 'avviso' : 'avvisi'}`);
    return h('p', { class: errors.length ? 'alert alert-error' : 'alert alert-warn' },
      `Negli abbinamenti ci sono ${parts.join(' e ')}. Mostra gli abbinamenti per vederli.`);
  }
  return h('div', {},
    errors.length ? h('div', { class: 'alert alert-error' }, h('strong', {}, 'Da correggere'), h('ul', {}, errors.map((e) => h('li', {}, e)))) : null,
    warnings.length ? h('div', { class: 'alert alert-warn' }, h('strong', {}, 'Avvisi'), h('ul', {}, warnings.map((w) => h('li', {}, w)))) : null);
}

function renderAssign(ev) {
  if (!ev.assignments) {
    const issues = readiness(ev);
    return [
      h('p', { class: 'hint' }, "L'estrazione crea un unico giro: ognuno fa un regalo e ne riceve uno, senza coppie che si scambiano il regalo tra loro. Dopo puoi correggere gli abbinamenti a mano."),
      issues.length ? h('ul', { class: 'issues' }, issues.map((i) => h('li', {}, i))) : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn btn-primary btn-large', type: 'button', disabled: issues.length > 0, onclick: () => doDraw(ev) }, "Fai l'estrazione")),
    ];
  }
  if (ui.editing) return renderEditor(ev);

  const { errors, warnings } = validateAssignments(ev.participants, ev.assignments);
  const map = new Map(ev.participants.map((p) => [p.id, p]));
  const cycles = errors.length ? null : countCycles(ev.assignments);
  return [
    h('p', { class: 'muted' },
      `Estrazione del ${formatDateTime(ev.drawnAt)}.`,
      cycles ? ` ${cycles === 1 ? 'Un unico giro.' : `${cycles} giri separati.`}` : ''),
    issuesBox(errors, warnings, ui.reveal),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn', type: 'button', 'aria-pressed': String(ui.reveal),
        onclick: () => { ui.reveal = !ui.reveal; refresh('assign'); },
      }, ui.reveal ? 'Nascondi abbinamenti' : 'Mostra abbinamenti'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => { ui.editing = { ...ev.assignments }; ui.reveal = true; refresh('assign'); },
      }, 'Modifica a mano'),
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => doDraw(ev) }, "Rifai l'estrazione")),
    h('ul', { class: 'pairs-table' }, ev.participants.map((g) => {
      const r = map.get(ev.assignments[g.id]);
      return h('li', { class: 'pairs-row' },
        h('span', { class: 'giver' }, g.name),
        h('span', { class: 'arrow' }, 'regala a'),
        ui.reveal
          ? h('span', { class: r ? 'receiver' : 'receiver bad' }, r ? r.name : 'nessuno')
          : h('span', { class: 'receiver masked' }, 'nascosto'));
    })),
  ];
}

function renderEditor(ev) {
  const draft = ui.editing;
  const { errors, warnings } = validateAssignments(ev.participants, draft);
  const changedCount = ev.participants.filter((g) => draft[g.id] !== ev.assignments[g.id]).length;
  const rows = ev.participants.map((g) => {
    const sel = h('select', {
      class: 'input', 'data-giver': g.id, 'aria-label': `Destinatario di ${g.name}`,
      onchange: (e) => {
        if (e.target.value) draft[g.id] = e.target.value;
        else delete draft[g.id];
        refresh('assign');
        ctx.sections.assign.querySelector(`[data-giver="${g.id}"]`)?.focus();
      },
    },
    h('option', { value: '' }, '-- scegli --'),
    ev.participants.filter((r) => r.id !== g.id).map((r) => h('option', { value: r.id },
      r.name + ((g.exclusions || []).includes(r.id) ? ' (esclusione)' : ''))));
    sel.value = draft[g.id] || '';
    const changed = draft[g.id] !== ev.assignments[g.id];
    return h('li', { class: `pairs-row${changed ? ' changed' : ''}` },
      h('span', { class: 'giver' }, g.name),
      h('span', { class: 'arrow' }, 'regala a'),
      sel);
  });
  return [
    h('p', { class: 'notice' }, 'Modalità modifica. Ogni persona deve fare un solo regalo e riceverne uno solo. Per scambiare due destinatari cambia entrambe le righe, poi salva.'),
    issuesBox(errors, warnings, true),
    h('ul', { class: 'pairs-table' }, rows),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn btn-primary', type: 'button', disabled: errors.length > 0 || changedCount === 0,
        onclick: () => {
          if (warnings.length && !confirm(`Ci sono avvisi:\n- ${warnings.join('\n- ')}\n\nSalvare lo stesso?`)) return;
          const changed = ev.participants.filter((g) => draft[g.id] !== ev.assignments[g.id]).map((g) => g.id);
          ev.assignments = Object.fromEntries(ev.participants.map((g) => [g.id, draft[g.id]]));
          ui.editing = null;
          persist(ev);
          toast(`Abbinamenti salvati. Mail da inviare o aggiornare: ${names(ev, changed)}.`, 'success');
          refresh('assign', 'mail');
        },
      }, changedCount ? `Salva (${changedCount} ${changedCount === 1 ? 'modifica' : 'modifiche'})` : 'Salva'),
      h('button', { class: 'btn', type: 'button', onclick: () => { ui.editing = null; refresh('assign'); } }, 'Annulla')),
  ];
}

// 05 Invio mail

function renderMailSetup(ev) {
  const clientSel = h('select', {
    class: 'input',
    onchange: (e) => { ev.mail.client = e.target.value; persist(ev); refresh('mailsetup'); },
  }, CLIENTS.map(([v, label]) => h('option', { value: v }, label)));
  clientSel.value = ev.mail.client;

  const clientHint = {
    mailto: 'Si apre il programma di posta predefinito del computer con la mail già scritta. Controlla e premi Invia.',
    'outlook-live': 'Si apre Outlook.com in una nuova scheda con la mail già scritta. Devi essere connesso al tuo account.',
    'outlook-365': 'Si apre Outlook sul web del tuo account di lavoro o scuola con la mail già scritta.',
  }[ev.mail.client] || '';

  const subject = h('input', { class: 'input', value: ev.mail.subject, maxlength: 200 });
  const body = h('textarea', { class: 'input mono', rows: 12, value: ev.mail.body, maxlength: 4000 });
  subject.addEventListener('input', () => { ev.mail.subject = subject.value; persist(ev); });
  body.addEventListener('input', () => { ev.mail.body = body.value; persist(ev); });
  subject.addEventListener('change', () => refresh('mail'));
  body.addEventListener('change', () => refresh('mail'));

  const details = h('details', { class: 'template', open: ui.templateOpen },
    h('summary', {}, 'Testo della mail'),
    field('Oggetto', subject),
    field('Testo', body),
    h('p', { class: 'field-hint' }, 'Segnaposto: ', PLACEHOLDERS.map(([k, label], i) => [i ? ', ' : '', h('code', {}, `{${k}}`), ` ${label}`])),
    h('p', { class: 'field-hint' }, 'Le righe con un segnaposto vuoto (es. luogo non indicato) spariscono dalla mail. Se cambi il testo dopo aver inviato, le mail risultano da aggiornare.'),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn btn-small', type: 'button',
        onclick: () => {
          if (!confirm('Ripristinare oggetto e testo predefiniti?')) return;
          ev.mail.subject = DEFAULT_SUBJECT;
          ev.mail.body = DEFAULT_BODY;
          persist(ev);
          refresh('mailsetup', 'mail');
        },
      }, 'Ripristina il testo predefinito')));
  details.addEventListener('toggle', () => { ui.templateOpen = details.open; });

  return [h('div', { class: 'grid-2' }, field('Come invii le mail', clientSel), h('p', { class: 'hint align-end' }, clientHint)), details];
}

function renderMailList(ev) {
  if (!ev.assignments) return h('p', { class: 'muted' }, "Fai prima l'estrazione: qui compare l'elenco delle mail da inviare.");
  const states = ev.participants.map((p) => ({ p, state: mailState(ev, p) }));
  const count = (s) => states.filter((x) => x.state === s).length;
  const todo = states.filter((x) => x.state === 'pending' || x.state === 'outdated');
  const stat = (label, n, cls) => h('div', { class: `stat ${cls}` }, h('span', { class: 'stat-n' }, String(n)), h('span', { class: 'stat-l' }, label));
  return [
    h('div', { class: 'stats' },
      stat('Da inviare', count('pending'), 'stat-pending'),
      stat('Da aggiornare', count('outdated'), 'stat-outdated'),
      stat('Inviate', count('sent'), 'stat-sent')),
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn btn-primary', type: 'button', disabled: !todo.length,
        onclick: () => openMail(ev, todo[0].p),
      }, todo.length ? `Apri la prossima: ${todo[0].p.name}` : 'Tutte le mail risultano inviate'),
      h('button', { class: 'btn', type: 'button', disabled: !todo.length, onclick: () => exportCsv(ev, todo.map((x) => x.p)) }, 'CSV MailUp: solo da inviare'),
      h('button', { class: 'btn', type: 'button', onclick: () => exportCsv(ev, states.filter((x) => x.state !== 'none').map((x) => x.p)) }, 'CSV MailUp: tutte')),
    h('p', { class: 'field-hint' }, 'Quando apri una mail il sito la segna come inviata. Se poi non la invii, usa "Segna da inviare".'),
    h('ul', { class: 'mail-list' }, states.map(({ p, state }) => mailRow(ev, p, state))),
  ];
}

function mailRow(ev, p, state) {
  const m = buildMail(ev, p);
  return h('li', { class: 'mail-row' },
    h('div', { class: 'mail-who' }, h('strong', {}, p.name), h('span', { class: 'muted' }, p.email)),
    h('span', { class: `badge badge-${state}` }, STATE_LABEL[state]),
    h('div', { class: 'mail-actions' },
      m ? h('button', { class: 'btn btn-small btn-outline', type: 'button', onclick: () => openMail(ev, p) }, state === 'sent' ? 'Riapri' : 'Apri mail') : null,
      m ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => copyMail(m) }, 'Copia') : null,
      m && state !== 'sent' ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => markSent(ev, p, true) }, 'Segna inviata') : null,
      state === 'sent' ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => markSent(ev, p, false) }, 'Segna da inviare') : null),
    m ? h('details', { class: 'preview' }, h('summary', {}, 'Anteprima'), h('pre', {}, `A: ${m.to}\nOggetto: ${m.subject}\n\n${m.body}`)) : null);
}

function markSent(ev, p, sent) {
  const m = buildMail(ev, p);
  p.sent = sent && m ? { hash: mailHash(m), at: new Date().toISOString() } : null;
  persist(ev);
  refresh('mail');
}

function openMail(ev, p) {
  const m = buildMail(ev, p);
  if (!m) return;
  const url = composeUrl(m, ev.mail.client);
  if (ev.mail.client === 'mailto') {
    if (url.length > 1900) toast('Il testo è lungo: alcuni programmi di posta lo tagliano. Se succede usa "Copia".', 'error');
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
  markSent(ev, p, true);
  toast(`Mail per ${p.name} aperta. Controlla e premi Invia.`);
}

async function copyMail(m) {
  const text = `A: ${m.to}\nOggetto: ${m.subject}\n\n${m.body}`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Mail copiata negli appunti.');
  } catch {
    toast('Il browser non permette di copiare. Apri "Anteprima" e copia a mano.', 'error');
  }
}

function exportCsv(ev, people) {
  if (!people.length) return;
  download(`mailup-${slug(ev.name)}-${today()}.csv`, mailupCsv(ev, people), 'text/csv;charset=utf-8');
  if (confirm(`Scaricato il CSV con ${people.length} ${people.length === 1 ? 'destinatario' : 'destinatari'}. Segnare queste mail come inviate?`)) {
    for (const p of people) {
      const m = buildMail(ev, p);
      if (m) p.sent = { hash: mailHash(m), at: new Date().toISOString() };
    }
    persist(ev);
    refresh('mail');
  }
}

// 06 Backup

function renderBackup(ev) {
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'Facoltativa, almeno 8 caratteri' });
  return [
    h('p', {}, "Nomi, email e abbinamenti sono salvati solo in questo browser. Se cancelli i dati di navigazione o cambi computer perdi l'evento: scarica un backup."),
    h('p', { class: 'muted' }, `Ultimo backup: ${ev.lastBackupAt ? formatDateTime(ev.lastBackupAt) : 'mai'}.`),
    h('form', {
      class: 'inline-form',
      onsubmit: async (e) => {
        e.preventDefault();
        if (pw.value && pw.value.length < 8) {
          toast('La password deve avere almeno 8 caratteri.', 'error');
          return;
        }
        try {
          const prev = ev.lastBackupAt;
          ev.lastBackupAt = new Date().toISOString();
          let text;
          try {
            text = await exportBackup(ev, pw.value);
          } catch (err) {
            ev.lastBackupAt = prev;
            throw err;
          }
          download(`secretsanta-${slug(ev.name)}-${today()}.json`, text, 'application/json');
          persist(ev);
          pw.value = '';
          toast(text.includes('"encrypted": true') ? 'Backup cifrato scaricato. Senza password non si apre.' : 'Backup scaricato.', 'success');
          refresh('backup');
        } catch (err) {
          toast(err.message, 'error');
        }
      },
    },
    field('Password del backup', pw, 'Con la password il file è cifrato (AES-256). Se la dimentichi, il backup non si apre.'),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Scarica il backup'))),
    h('div', { class: 'danger-zone' },
      h('h3', {}, 'Elimina evento'),
      h('p', { class: 'muted' }, 'Cancella evento, partecipanti e abbinamenti da questo browser. Non si può annullare.'),
      h('button', {
        class: 'btn btn-danger', type: 'button',
        onclick: () => {
          if (!confirm(`Eliminare "${ev.name || 'Evento senza nome'}" da questo browser?`)) return;
          events = events.filter((e) => e.id !== ev.id);
          persist();
          toast('Evento eliminato.');
          location.hash = '#/';
        },
      }, 'Elimina evento')),
  ];
}

// ---------- avvio ----------

window.addEventListener('hashchange', (e) => {
  // I link interni "#sez-..." non cambiano pagina.
  if (!location.hash.startsWith('#/') && location.hash !== '') return;
  route(e);
});

window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith('secretsanta.')) {
    events = loadEvents();
    route();
  }
});

route();
