// Ghirlande natalizie sui bordi: rami di pino, stalattiti e stelle di cristallo,
// fiocchi di velluto rosso e lucine LED calde che si accendono a ritmo costante.
// Disegno generato in SVG con numeri casuali a seme fisso: sempre uguale, nessuna immagine esterna.

const SVG_NS = 'http://www.w3.org/2000/svg';

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

const n = (v) => (Math.round(v * 10) / 10).toString();

function defs(uid) {
  return `<defs>
<radialGradient id="${uid}-velvet" cx="35%" cy="30%" r="75%">
  <stop offset="0" stop-color="#F0524A"/>
  <stop offset="0.45" stop-color="#CC0000"/>
  <stop offset="1" stop-color="#6E0000"/>
</radialGradient>
<radialGradient id="${uid}-glow">
  <stop offset="0" stop-color="#FFC977" stop-opacity="0.85"/>
  <stop offset="0.35" stop-color="#FFB04A" stop-opacity="0.38"/>
  <stop offset="1" stop-color="#FF9A2E" stop-opacity="0"/>
</radialGradient>
<radialGradient id="${uid}-bulb" cx="40%" cy="35%" r="70%">
  <stop offset="0" stop-color="#FFF6D8"/>
  <stop offset="0.5" stop-color="#FFD27A"/>
  <stop offset="1" stop-color="#F29A2E"/>
</radialGradient>
<linearGradient id="${uid}-ice" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/>
  <stop offset="0.5" stop-color="#D6ECFF" stop-opacity="0.75"/>
  <stop offset="1" stop-color="#A8D3F5" stop-opacity="0.35"/>
</linearGradient>
<radialGradient id="${uid}-crystal" cx="45%" cy="40%" r="65%">
  <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.98"/>
  <stop offset="0.6" stop-color="#DDF0FF" stop-opacity="0.85"/>
  <stop offset="1" stop-color="#9CC8EE" stop-opacity="0.7"/>
</radialGradient>
</defs>`;
}

// length: lunghezza lungo la ghirlanda; thick: spessore; horizontal: striscia orizzontale.
export function buildSvg({ length, thick, horizontal, seed, uid, k, base }) {
  const R = seeded(seed);
  const rand = (a, b) => a + R() * (b - a);
  const P = (a, c) => (horizontal ? [a, c] : [c, a]);
  const pt = (a, c) => P(a, c).map(n).join(',');
  const spine = (a) => base + Math.sin(a / (70 * k) + seed) * 4 * k + Math.sin(a / (23 * k)) * 1.5 * k;

  // Rami: rametto marrone con aghi su due lati, in tre strati di profondita.
  const layers = { twig: '', back: '', mid: '', front: '', light: '' };
  const layerPick = ['back', 'back', 'mid', 'mid', 'front'];
  const outward = horizontal ? 0.3 : 0.35;
  for (let a = -30 * k; a < length + 30 * k; a += 10 * k) {
    for (let i = 0; i < 2; i++) {
      const side = R() < outward ? -1 : 1;
      const phi = side * rand(22, 118) * (Math.PI / 180);
      const da = Math.cos(phi);
      const dc = Math.sin(phi);
      const len = rand(24, 48) * k;
      const a0 = a + rand(-5, 5) * k;
      const c0 = spine(a0);
      const layer = layerPick[Math.floor(R() * layerPick.length)];
      layers.twig += `M${pt(a0, c0)}L${pt(a0 + da * len, c0 + dc * len)}`;
      for (let t = 2.5 * k; t < len; t += 2.2 * k) {
        const pa = a0 + da * t;
        const pc = c0 + dc * t;
        const nl = (1 - (t / len) * 0.45) * rand(7, 11.5) * k;
        for (const s of [-1, 1]) {
          const ang = phi + s * rand(32, 58) * (Math.PI / 180);
          const seg = `M${pt(pa, pc)}L${pt(pa + Math.cos(ang) * nl, pc + Math.sin(ang) * nl)}`;
          if (layer === 'front' && R() < 0.22) layers.light += seg;
          else layers[layer] += seg;
        }
      }
      const tipLen = rand(6, 9) * k;
      layers[layer] += `M${pt(a0 + da * len, c0 + dc * len)}L${pt(a0 + da * (len + tipLen), c0 + dc * (len + tipLen))}`;
    }
  }

  // Filo delle luci, appoggiato ai rami con una leggera ondulazione.
  const wireC = (a) => spine(a) + Math.sin(a / (31 * k)) * 7 * k + 4 * k;
  let wire = '';
  for (let a = 0; a <= length; a += 6) wire += `${a === 0 ? 'M' : 'L'}${pt(a, wireC(a))}`;

  const busy = [];
  const free = (a, gap) => busy.every((b) => Math.abs(b - a) > gap);

  // Fiocchi di velluto rosso.
  let bows = '';
  for (let a = 120 * k; a < length; a += 270 * k) {
    busy.push(a);
    const [x, y] = P(a, spine(a));
    const s = 15 * k;
    bows += `<g>
<path d="M${n(x)},${n(y)} C${n(x - s * 0.4)},${n(y + s * 1.2)} ${n(x - s * 0.9)},${n(y + s * 1.9)} ${n(x - s * 0.55)},${n(y + s * 2.3)} L${n(x - s * 0.15)},${n(y + s * 2.0)} L${n(x - s * 0.1)},${n(y + s * 2.35)} C${n(x - s * 0.2)},${n(y + s * 1.6)} ${n(x - s * 0.05)},${n(y + s * 0.8)} ${n(x)},${n(y)}Z" fill="url(#${uid}-velvet)" stroke="#7A0000" stroke-width="0.6"/>
<path d="M${n(x)},${n(y)} C${n(x + s * 0.4)},${n(y + s * 1.2)} ${n(x + s * 0.95)},${n(y + s * 1.8)} ${n(x + s * 0.6)},${n(y + s * 2.25)} L${n(x + s * 0.2)},${n(y + s * 1.95)} L${n(x + s * 0.12)},${n(y + s * 2.3)} C${n(x + s * 0.2)},${n(y + s * 1.5)} ${n(x + s * 0.05)},${n(y + s * 0.8)} ${n(x)},${n(y)}Z" fill="url(#${uid}-velvet)" stroke="#7A0000" stroke-width="0.6"/>
<path d="M${n(x)},${n(y)} C${n(x - s * 1.3)},${n(y - s * 1.1)} ${n(x - s * 1.6)},${n(y + s * 0.7)} ${n(x)},${n(y)}Z" fill="url(#${uid}-velvet)" stroke="#7A0000" stroke-width="0.7"/>
<path d="M${n(x)},${n(y)} C${n(x + s * 1.3)},${n(y - s * 1.1)} ${n(x + s * 1.6)},${n(y + s * 0.7)} ${n(x)},${n(y)}Z" fill="url(#${uid}-velvet)" stroke="#7A0000" stroke-width="0.7"/>
<path d="M${n(x - s * 0.95)},${n(y - s * 0.35)} C${n(x - s * 0.7)},${n(y - s * 0.6)} ${n(x - s * 0.4)},${n(y - s * 0.45)} ${n(x - s * 0.25)},${n(y - s * 0.2)}" fill="none" stroke="#FF8A80" stroke-opacity="0.45" stroke-width="${n(1.1 * k)}" stroke-linecap="round"/>
<path d="M${n(x + s * 0.95)},${n(y - s * 0.35)} C${n(x + s * 0.7)},${n(y - s * 0.6)} ${n(x + s * 0.4)},${n(y - s * 0.45)} ${n(x + s * 0.25)},${n(y - s * 0.2)}" fill="none" stroke="#FF8A80" stroke-opacity="0.45" stroke-width="${n(1.1 * k)}" stroke-linecap="round"/>
<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(s * 0.3)}" ry="${n(s * 0.26)}" fill="#B00000" stroke="#7A0000" stroke-width="0.6"/>
</g>`;
  }

  // Stelle di cristallo appese a un filo.
  let stars = '';
  let starIdx = 0;
  for (let a = 255 * k; a < length; a += 270 * k) {
    busy.push(a);
    const c = horizontal ? spine(a) + 6 * k : spine(a) + rand(22, 32) * k;
    const [ax, ay] = P(a, c);
    const thread = rand(10, 18) * k;
    const r = rand(12, 16) * k;
    const cx = ax;
    const cy = ay + thread + r;
    const outer = [];
    let poly = '';
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI / 6) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      poly += `${n(px)},${n(py)} `;
      if (i % 2 === 0) outer.push([px, py]);
    }
    const facets = outer.map(([px, py]) => `M${n(cx)},${n(cy)}L${n(px)},${n(py)}`).join('');
    const gx = cx - r * 0.35;
    const gy = cy - r * 0.4;
    const g = r * 0.55;
    stars += `<g>
<line x1="${n(ax)}" y1="${n(ay)}" x2="${n(cx)}" y2="${n(cy - r)}" stroke="#E8E2D6" stroke-width="0.7" stroke-opacity="0.9"/>
<polygon points="${poly.trim()}" fill="url(#${uid}-crystal)" stroke="#FFFFFF" stroke-width="${n(0.8 * k + 0.3)}" stroke-linejoin="round"/>
<path d="${facets}" stroke="#9CC8EE" stroke-width="0.6" stroke-opacity="0.9"/>
<path class="glint ${starIdx % 2 ? 'glint-b' : ''}" d="M${n(gx - g)},${n(gy)}L${n(gx + g)},${n(gy)}M${n(gx)},${n(gy - g)}L${n(gx)},${n(gy + g)}" stroke="#FFFFFF" stroke-width="${n(1.1 * k + 0.2)}" stroke-linecap="round"/>
</g>`;
    starIdx++;
  }

  // Stalattiti di ghiaccio sul lato interno.
  let ice = '';
  for (let a = 60 * k; a < length; a += 95 * k) {
    if (!free(a, 45 * k)) continue;
    // Attaccate al centro del ramo: i rami davanti ne coprono l'attacco.
    const baseC = horizontal ? spine(a) + 2 * k : spine(a) + rand(-3, 7) * k;
    const count = 2 + Math.floor(R() * 3);
    for (let i = 0; i < count; i++) {
      const [x, y] = P(a + (horizontal ? i * 5.5 * k : rand(-7, 7) * k), baseC + (horizontal ? 0 : i * 5.5 * k));
      const len = rand(18, 38) * k * (i === 1 ? 1.25 : 1);
      const w = rand(4.5, 6.5) * k;
      ice += `<path d="M${n(x - w / 2)},${n(y)} Q${n(x)},${n(y - w * 0.9)} ${n(x + w / 2)},${n(y)} Q${n(x + w * 0.2)},${n(y + len * 0.6)} ${n(x + 0.3)},${n(y + len)} Q${n(x - w * 0.25)},${n(y + len * 0.55)} ${n(x - w / 2)},${n(y)}Z" fill="url(#${uid}-ice)" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="0.5"/>`;
      ice += `<path d="M${n(x - w * 0.1)},${n(y + 2)} L${n(x)},${n(y + len * 0.7)}" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="${n(0.7 * k + 0.2)}" stroke-linecap="round"/>`;
    }
  }

  // Lucine LED calde: due gruppi che si alternano a ritmo costante.
  let leds = '';
  let ledIdx = 0;
  for (let a = 18 * k; a < length; a += 36 * k) {
    const [x, y] = P(a, wireC(a));
    const group = ledIdx % 2 ? 'led-b' : 'led-a';
    const br = 4.1 * k + 0.8;
    leds += `<rect x="${n(x - br * 0.45)}" y="${n(y - br * 1.55)}" width="${n(br * 0.9)}" height="${n(br * 0.7)}" rx="0.6" fill="#2D2A26"/>`;
    leds += `<g class="led ${group}"><circle cx="${n(x)}" cy="${n(y)}" r="${n(br * 5.2)}" fill="url(#${uid}-glow)"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(br * 0.8)}" ry="${n(br)}" fill="url(#${uid}-bulb)"/></g>`;
    ledIdx++;
  }

  const w = horizontal ? length : thick;
  const h = horizontal ? thick : length;
  const sw = (v) => n(v * k + 0.35);
  return `<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
${defs(uid)}
<g fill="none" stroke-linecap="round">
<path d="${layers.twig}" stroke="#4A3526" stroke-width="${sw(1.3)}"/>
<path d="${layers.back}" stroke="#123420" stroke-width="${sw(1.9)}"/>
<path d="${layers.mid}" stroke="#1C4D2D" stroke-width="${sw(1.7)}"/>
<path d="${wire}" stroke="#2D2A26" stroke-width="${sw(0.9)}"/>
</g>
${ice}
<g fill="none" stroke-linecap="round">
<path d="${layers.front}" stroke="#2C6B3C" stroke-width="${sw(1.5)}"/>
<path d="${layers.light}" stroke="#4E8F52" stroke-width="${sw(1.3)}"/>
</g>
${bows}
${stars}
${leds}
</svg>`;
}

let built = { key: '' };

function render() {
  const wide = window.matchMedia('(min-width: 1100px)').matches;
  const side = window.matchMedia('(min-width: 720px)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('garland-still', reduce);

  if (side) {
    const thick = wide ? 110 : 64;
    const k = wide ? 1 : 0.62;
    const length = Math.ceil(Math.max(window.innerHeight, window.screen ? window.screen.height : 0, 900) / 200) * 200;
    const key = `side-${thick}-${length}`;
    if (built.key === key) return;
    built.key = key;
    document.querySelectorAll('.garland').forEach((el) => el.remove());
    for (const [cls, seed] of [['garland-left', 11], ['garland-right', 29]]) {
      const el = document.createElement('div');
      el.className = `garland garland-side ${cls}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = buildSvg({ length, thick, horizontal: false, seed, uid: `gl${seed}`, k, base: thick * 0.34 });
      document.body.append(el);
    }
  } else {
    const length = Math.ceil(window.innerWidth / 100) * 100;
    const key = `top-${length}`;
    if (built.key === key) return;
    built.key = key;
    document.querySelectorAll('.garland').forEach((el) => el.remove());
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const el = document.createElement('div');
    el.className = 'garland garland-top';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = buildSvg({ length, thick: 46, horizontal: true, seed: 7, uid: 'gt7', k: 0.5, base: 6 });
    topbar.append(el);
  }
}

export function initGarlands() {
  try {
    render();
  } catch {
    // Le decorazioni non devono mai bloccare il sito.
    return;
  }
  let timer = null;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { render(); } catch { /* decorazione facoltativa */ }
    }, 200);
  });
}
