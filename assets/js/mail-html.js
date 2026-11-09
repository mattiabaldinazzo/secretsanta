// Mail HTML decorata (stesso stile del sito) e file .eml pronti da aprire in Outlook.
// L'HTML usa tabelle e stili in linea: è il formato che i programmi di posta capiscono.

import { buildMail, mailValues } from './mail.js';
import { MAIL_IMAGES, MAIL_FONTS } from './mail-assets.js';

const COLORS = { page: '#EFDDBD', card: '#FBF2E1', text: '#2B1F14', muted: '#76634D', red: '#CC0000' };
const PEN = "'Dancing Script','Segoe Script',Georgia,serif";
const IMAGE_NAMES = ['garland-top', 'garland-bottom', 'garland-left', 'garland-right', 'logo', 'paper'];

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Testo della mail -> paragrafi HTML. Il nome del destinatario del regalo
// viene evidenziato in rosso, solo come parola intera.
export function bodyToHtml(body, highlight) {
  const strong = (t) => `<strong class="pen" style="font-family:${PEN};font-weight:700;font-size:28px;color:${COLORS.red};">${t}</strong>`;
  const re = highlight ? new RegExp(`(?<![\\p{L}\\p{N}])${escRe(esc(highlight))}(?![\\p{L}\\p{N}])`, 'gu') : null;
  return String(body || '')
    .split(/\n{2,}/)
    .map((para) => {
      let html = para.split('\n').map(esc).join('<br>');
      if (re) html = html.replace(re, (m) => strong(m));
      return `<p class="pen" style="margin:0 0 16px;font-family:${PEN};font-size:22px;line-height:1.5;color:${COLORS.text};">${html}</p>`;
    })
    .join('\n');
}

export function cidSrc(name) {
  return `cid:${name}@secretsanta`;
}

export function dataSrc(name) {
  const img = MAIL_IMAGES[name];
  return `data:${img.type};base64,${img.data}`;
}

// opts.src: funzione nome-immagine -> URL (cid: per .eml, data: per l'anteprima).
// opts.fontBaseUrl: indirizzo pubblico dei font, usato solo se il font incorporato non si carica.
export function buildMailHtml(ev, giver, opts = {}) {
  const m = buildMail(ev, giver);
  if (!m) return null;
  const receiver = ev.participants.find((p) => p.id === ev.assignments[giver.id]);
  const values = mailValues(ev, giver, receiver);
  const src = opts.src || cidSrc;
  const img = (name) => MAIL_IMAGES[name];
  const fontFace = (weight, key, file) => {
    let s = `url(data:font/woff2;base64,${MAIL_FONTS[key]}) format('woff2')`;
    if (opts.fontBaseUrl) s += `, url(${opts.fontBaseUrl}${file}) format('woff2')`;
    return `@font-face{font-family:'Dancing Script';font-style:normal;font-weight:${weight};src:${s};}`;
  };
  const top = img('garland-top');
  const bottom = img('garland-bottom');
  const logo = img('logo');
  const side = img('garland-left');

  const html = `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(m.subject)}</title>
<style>
${fontFace(500, 'pen500', 'dancing-script-500.woff2')}
${fontFace(700, 'pen700', 'dancing-script-700.woff2')}
body{margin:0;padding:0;background-color:${COLORS.page};}
.pen{font-family:${PEN};}
@media (max-width:640px){
  .side{display:none !important;width:0 !important;}
  .card{width:100% !important;}
  .deco{width:100% !important;height:auto !important;}
  .content{padding:20px 18px 24px !important;}
}
</style>
<!--[if mso]><style>.pen{font-family:'Segoe Script',Georgia,serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(`${values.nome}, ecco a chi fai il regalo per ${values.evento}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}" style="background-color:${COLORS.page};">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" class="card" width="${top.width}" cellpadding="0" cellspacing="0" border="0" style="width:${top.width}px;max-width:${top.width}px;">
<tr><td colspan="3" style="line-height:0;font-size:0;"><img class="deco" src="${src('garland-top')}" width="${top.width}" height="${top.height}" alt="" style="display:block;border:0;width:${top.width}px;height:${top.height}px;"></td></tr>
<tr>
<td class="side" width="${side.width}" valign="top" bgcolor="${COLORS.page}" background="${src('garland-left')}" style="width:${side.width}px;background-color:${COLORS.page};background-image:url('${src('garland-left')}');background-repeat:repeat-y;background-size:${side.width}px ${side.height}px;">&nbsp;</td>
<td class="content" valign="top" bgcolor="${COLORS.card}" background="${src('paper')}" style="background-color:${COLORS.card};background-image:url('${src('paper')}');padding:26px 30px 30px;border-radius:6px;">
<div style="text-align:center;margin:0 0 18px;"><img src="${src('logo')}" width="${logo.width}" height="${logo.height}" alt="Secret Santa" style="display:inline-block;border:0;width:${logo.width}px;max-width:100%;height:auto;font-family:Georgia,serif;font-size:28px;color:${COLORS.red};"></div>
${bodyToHtml(m.body, values.destinatario)}
</td>
<td class="side" width="${side.width}" valign="top" bgcolor="${COLORS.page}" background="${src('garland-right')}" style="width:${side.width}px;background-color:${COLORS.page};background-image:url('${src('garland-right')}');background-repeat:repeat-y;background-size:${side.width}px ${side.height}px;">&nbsp;</td>
</tr>
<tr><td colspan="3" style="line-height:0;font-size:0;"><img class="deco" src="${src('garland-bottom')}" width="${bottom.width}" height="${bottom.height}" alt="" style="display:block;border:0;width:${bottom.width}px;height:${bottom.height}px;"></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  return { html, mail: m };
}

// ---------- File .eml ----------

function utf8Bytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

const wrap76 = (b64) => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();

// Intestazione con caratteri non ASCII: parole codificate RFC 2047, max 45 byte l'una.
export function encodeHeader(text) {
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  const words = [];
  let chunk = '';
  for (const ch of text) {
    if (utf8Bytes(chunk + ch).length > 45) {
      words.push(chunk);
      chunk = '';
    }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${bytesToB64(utf8Bytes(w))}?=`).join('\r\n ');
}

function encodeAddress(name, email) {
  const clean = String(name || '').replace(/[\r\n"]/g, ' ').trim();
  if (!clean) return email;
  if (/^[A-Za-z0-9 .'-]+$/.test(clean)) return `"${clean}" <${email}>`;
  return `${encodeHeader(clean)} <${email}>`;
}

function boundary(tag) {
  const rnd = new Uint8Array(9);
  globalThis.crypto.getRandomValues(rnd);
  return `ss-${tag}-${Array.from(rnd, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// Bozza .eml: Outlook la apre come nuovo messaggio da inviare (X-Unsent: 1).
// Le immagini viaggiano dentro la mail come allegati inline (CID).
export function buildEml(ev, giver, opts = {}) {
  const built = buildMailHtml(ev, giver, { ...opts, src: cidSrc });
  if (!built) return null;
  const { html, mail } = built;
  const rel = boundary('rel');
  const alt = boundary('alt');
  const lines = [
    'X-Unsent: 1',
    `To: ${encodeAddress(giver.name, mail.to)}`,
    `Subject: ${encodeHeader(mail.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${rel}"; type="multipart/alternative"`,
    '',
    'Messaggio in formato MIME.',
    '',
    `--${rel}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(bytesToB64(utf8Bytes(mail.body.replace(/\r?\n/g, '\r\n')))),
    '',
    `--${alt}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(bytesToB64(utf8Bytes(html))),
    '',
    `--${alt}--`,
    '',
  ];
  for (const name of IMAGE_NAMES) {
    const img = MAIL_IMAGES[name];
    const ext = img.type === 'image/png' ? 'png' : 'jpg';
    lines.push(
      `--${rel}`,
      `Content-Type: ${img.type}; name="${name}.${ext}"`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${name}@secretsanta>`,
      `Content-Disposition: inline; filename="${name}.${ext}"`,
      '',
      wrap76(img.data),
      '',
    );
  }
  lines.push(`--${rel}--`, '');
  return { eml: lines.join('\r\n'), mail };
}
