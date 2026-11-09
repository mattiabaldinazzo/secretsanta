// Genera assets/js/mail-assets.js: immagini PNG/JPEG delle decorazioni e font
// della mail HTML, codificati in base64. Le mail .eml le incorporano come allegati
// inline (CID), quindi non dipendono da nessun server.
//
// Uso: node tools/build-mail-assets.cjs   (richiede Playwright e Python 3)

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = 8799;

function startServer() {
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((resolve) => setTimeout(() => resolve(server), 800));
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1200 } });
    // Luci accese fisse nelle immagini.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${port}/tools/mail-assets.html`);
    await page.waitForSelector('body[data-ready="1"]');
    await page.addStyleTag({ content: '.led,.glint{animation:none!important;opacity:1!important}' });
    await page.waitForTimeout(300);

    const shot = async (id, opts = {}) => {
      const el = page.locator(`#${id}`);
      const buf = await el.screenshot({ omitBackground: !opts.jpeg, type: opts.jpeg ? 'jpeg' : 'png', quality: opts.jpeg ? 72 : undefined, scale: opts.scale || 'device' });
      const box = await el.boundingBox();
      return { b64: buf.toString('base64'), type: opts.jpeg ? 'image/jpeg' : 'image/png', width: Math.round(box.width), height: Math.round(box.height), bytes: buf.length };
    };

    const images = {
      'garland-top': await shot('top', { jpeg: true }),
      'garland-bottom': await shot('bottom', { jpeg: true }),
      'garland-left': await shot('sideL', { jpeg: true }),
      'garland-right': await shot('sideR', { jpeg: true }),
      logo: await shot('logo'),
      // Trama della carta: solo il centro della tessera, senza i bordi del filtro.
      paper: await (async () => {
        const box = await page.locator('#paper').boundingBox();
        const buf = await page.screenshot({ type: 'png', scale: 'css', clip: { x: box.x + 30, y: box.y + 30, width: 240, height: 240 } });
        return { b64: buf.toString('base64'), type: 'image/png', width: 240, height: 240, bytes: buf.length };
      })(),
    };

    const font = (file) => fs.readFileSync(path.join(root, 'assets/fonts', file)).toString('base64');
    const fonts = {
      pen500: font('dancing-script-500.woff2'),
      pen700: font('dancing-script-700.woff2'),
    };

    let out = '// File generato da tools/build-mail-assets.cjs: non modificare a mano.\n';
    out += '// Decorazioni e font della mail HTML in base64 (immagini derivate da garland.js).\n\n';
    out += 'export const MAIL_IMAGES = {\n';
    for (const [name, img] of Object.entries(images)) {
      out += `  '${name}': { type: '${img.type}', width: ${img.width}, height: ${img.height}, data: '${img.b64}' },\n`;
    }
    out += '};\n\n';
    out += `export const MAIL_FONTS = {\n  pen500: '${fonts.pen500}',\n  pen700: '${fonts.pen700}',\n};\n`;
    fs.writeFileSync(path.join(root, 'assets/js/mail-assets.js'), out);

    for (const [name, img] of Object.entries(images)) console.log(`${name}: ${img.width}x${img.height}, ${Math.round(img.bytes / 1024)} KB`);
    console.log(`mail-assets.js: ${Math.round(out.length / 1024)} KB`);
  } finally {
    await browser.close();
    server.kill();
  }
})();
