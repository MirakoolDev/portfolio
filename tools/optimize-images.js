/* ═══════════════════════════════════════════
   optimize-images.js

   Builds responsive WebP derivatives + a tiny blurred placeholder for
   every image in images/, and writes images/manifest.json mapping each
   original to them.

   Originals are never touched, so the admin panel keeps working and any
   image missing from the manifest simply falls back to its original.

   Run after adding images:  npm run images
   ═══════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGES = path.join(__dirname, '..', 'images');
const OUT = path.join(IMAGES, 'opt');
const MANIFEST = path.join(IMAGES, 'manifest.json');

// Slides render ~330–560px wide, lightbox up to ~1200px. 2x covers retina.
const WIDTHS = [320, 640, 1280];
const LQIP_WIDTH = 16;
const SOURCE_EXT = /\.(png|jpe?g|webp)$/i;

function slug(file) {
  return file.replace(SOURCE_EXT, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function build() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const files = fs.readdirSync(IMAGES).filter(f => SOURCE_EXT.test(f));
  const manifest = {};
  let before = 0;
  let after = 0;

  for (const file of files) {
    const src = path.join(IMAGES, file);
    before += fs.statSync(src).size;

    let meta;
    try {
      meta = await sharp(src).metadata();
    } catch (e) {
      console.warn(`skip ${file}: ${e.message}`);
      continue;
    }

    const base = slug(file);
    const entry = { w: meta.width, h: meta.height, src: {} };

    for (const width of WIDTHS) {
      // Never upscale — a 600px original stays 600px.
      if (meta.width < width && width !== WIDTHS[0]) continue;
      const target = Math.min(width, meta.width);
      const out = path.join(OUT, `${base}-${width}.webp`);

      await sharp(src)
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(out);

      entry.src[width] = `images/opt/${base}-${width}.webp`;
      after += fs.statSync(out).size;
    }

    // Tiny blurred placeholder, inlined as a data URI so it costs no request
    const lqip = await sharp(src)
      .resize({ width: LQIP_WIDTH })
      .webp({ quality: 40 })
      .toBuffer();
    entry.lqip = `data:image/webp;base64,${lqip.toString('base64')}`;

    manifest[`images/${file}`] = entry;
    process.stdout.write('.');
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
  const mb = n => (n / 1e6).toFixed(1);
  console.log(
    `\n${files.length} images: ${mb(before)}MB -> ${mb(after)}MB ` +
    `(${Math.round((1 - after / before) * 100)}% smaller)`
  );
}

build().catch(e => {
  console.error(e);
  process.exit(1);
});
