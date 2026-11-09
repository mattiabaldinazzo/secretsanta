// Anteprima della mail HTML: legge l'evento dal browser (stessi dati del sito)
// e mostra la mail come la vedrà il partecipante. Le immagini sono incorporate.
import { loadEvents } from './store.js';
import { buildMailHtml, dataSrc } from './mail-html.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const params = new URLSearchParams(location.hash.slice(1));
const ev = loadEvents().find((e) => e.id === params.get('e'));
const person = ev ? ev.participants.find((p) => p.id === params.get('p')) : null;
const built = ev && person ? buildMailHtml(ev, person, { src: dataSrc }) : null;

if (!built) {
  document.getElementById('msg').textContent = "Anteprima non disponibile: l'evento non è in questo browser o non è ancora stata fatta l'estrazione.";
} else {
  const banner = `<div style="position:sticky;top:0;z-index:5;background:#2B1F14;color:#FBF2E1;font:14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center;">Anteprima della mail per <strong>${esc(person.name)}</strong> &lt;${esc(person.email)}&gt;. Oggetto: ${esc(built.mail.subject)}. Chiudi la scheda per tornare al sito.</div>`;
  const html = built.html.replace(/(<body[^>]*>)/, `$1${banner}`);
  document.open();
  document.write(html);
  document.close();
}
