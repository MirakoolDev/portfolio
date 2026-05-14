const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');
const cheerio = require('cheerio');
const sharp   = require('sharp');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the portfolio site itself at /preview
app.use((req, res, next) => {
  if (req.path === '/preview') return res.redirect(301, '/preview/');
  next();
});
app.use('/preview/', express.static(path.join(__dirname, '..')));

// Setup file paths (server lives in admin/, so go one level up for site files)
const SITE_ROOT  = path.join(__dirname, '..');
const DATA_FILE  = path.join(SITE_ROOT, 'data.js');
const CSS_FILE   = path.join(SITE_ROOT, 'styles.css');
const HTML_FILE  = path.join(SITE_ROOT, 'index.html');
const IMAGES_DIR = path.join(SITE_ROOT, 'images');

// Create images folder if it doesn't exist
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

app.use('/images', express.static(IMAGES_DIR));

// -------------- MEDIA UPLOAD --------------
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  })
});

app.post('/api/upload', upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const isImage = req.file.mimetype.startsWith('image/') && !req.file.mimetype.includes('svg');
  if (isImage) {
    try {
      const originalPath = req.file.path;
      const baseName = path.parse(req.file.filename).name;
      const newFilename = `${baseName}.webp`;
      const outputPath = path.join(IMAGES_DIR, newFilename);

      await sharp(originalPath)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outputPath);

      fs.unlinkSync(originalPath); // Delete the original uploaded file
      res.json({ url: `images/${newFilename}` });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to process image' });
    }
  } else {
    res.json({ url: `images/${req.file.filename}` });
  }
});

// -------------- IMAGE LISTING --------------
app.get('/api/images', (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_DIR)) return res.json({ images: [] });
    const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.avif','.svg','.mp4','.webm']);
    const files = fs.readdirSync(IMAGES_DIR)
      .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => {
        const stat = fs.statSync(path.join(IMAGES_DIR, f));
        return {
          url:   `images/${f}`,
          name:  f,
          size:  stat.size,
          mtime: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    res.json({ images: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------- DELETE IMAGE --------------
app.delete('/api/images/:filename', (req, res) => {
  try {
    const safe = path.basename(req.params.filename);
    const fp   = path.join(IMAGES_DIR, safe);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------- DATA.JS (projects) --------------
app.get('/api/data', (req, res) => {
  if (!fs.existsSync(DATA_FILE)) return res.json({ art: [], design: [], experiments: [] });
  try {
    let content = fs.readFileSync(DATA_FILE, 'utf8');
    const match = content.match(/window\.PROJECTS\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) {
      // Try alternate format
      const match2 = content.match(/(?:const|var|let)\s+PROJECTS\s*=\s*(\{[\s\S]*\});?\s*$/);
      if (!match2) return res.status(500).json({ error: 'Could not parse data.js' });
      const projects2 = (new Function('return ' + match2[1]))();
      return res.json(projects2);
    }
    const projects = (new Function('return ' + match[1]))();
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const jsonString = JSON.stringify(req.body, null, 2);
    let content = '';
    if (fs.existsSync(DATA_FILE)) {
      content = fs.readFileSync(DATA_FILE, 'utf8');
    }
    const startIdx = content.indexOf('window.PROJECTS');
    if (startIdx !== -1) {
      const before = content.slice(0, startIdx);
      fs.writeFileSync(DATA_FILE, before + `window.PROJECTS = ${jsonString};\n`);
    } else {
      // Fallback if window.PROJECTS is missing but maybe SITE_CONFIG is there
      fs.writeFileSync(DATA_FILE, content + `\nwindow.PROJECTS = ${jsonString};\n`);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------- SITE_CONFIG (data.js) --------------
app.get('/api/config', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json({});
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    // Extract just the SITE_CONFIG assignment block
    const startIdx = content.indexOf('window.SITE_CONFIG');
    const endIdx   = content.indexOf('window.PROJECTS');
    if (startIdx === -1 || endIdx === -1) return res.json({});
    const block = content.slice(startIdx, endIdx).trim();
    // Remove 'window.SITE_CONFIG = ' prefix and trailing ';'
    const jsonPart = block.replace(/^window\.SITE_CONFIG\s*=\s*/, '').replace(/;\s*$/, '');
    const config = (new Function('return ' + jsonPart))();
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    let content = fs.readFileSync(DATA_FILE, 'utf8');
    const newConfigStr = JSON.stringify(req.body, null, 2);
    // Replace everything between the comment line and window.PROJECTS
    const startIdx = content.indexOf('window.SITE_CONFIG');
    const endIdx   = content.indexOf('window.PROJECTS');
    if (startIdx === -1 || endIdx === -1) {
      return res.status(500).json({ error: 'Could not locate SITE_CONFIG in data.js' });
    }
    const before = content.slice(0, startIdx);
    const after  = content.slice(endIdx);
    content = before + `window.SITE_CONFIG = ${newConfigStr};\n\n` + after;
    fs.writeFileSync(DATA_FILE, content);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// -------------- ABOUT TEXT (index.html) --------------
app.get('/api/about', (req, res) => {
  try {
    const html = fs.readFileSync(HTML_FILE, 'utf8');
    const $    = cheerio.load(html);

    const tagline = $('.about-tagline').html() || '';

    const traits = [];
    $('.about-traits p').each((_, el) => traits.push($(el).html()));

    const roles = [];
    $('.role-entry').each((_, el) => {
      const companyEl = $(el).find('.role-company');
      const linkEl = companyEl.find('a');
      roles.push({
        title:   $(el).find('.role-title').text().trim(),
        company: linkEl.length ? linkEl.text().trim() : companyEl.text().trim(),
        url:     linkEl.length ? linkEl.attr('href') : ''
      });
    });

    // Nav links
    const navLinks = [];
    $('.main-nav .nav-link').each((_, el) => {
      navLinks.push({
        text: $(el).text().trim(),
        href: $(el).attr('href') || ''
      });
    });

    // Email
    const email = $('.main-footer .email-footer').text().trim();

    res.json({ tagline, traits, roles, navLinks, email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/about', (req, res) => {
  try {
    const html = fs.readFileSync(HTML_FILE, 'utf8');
    const $    = cheerio.load(html, { recognizeSelfClosing: true, xmlMode: false });
    const body = req.body;

    if (typeof body.tagline === 'string') {
      $('.about-tagline').html(body.tagline);
    }

    if (Array.isArray(body.traits)) {
      $('.about-traits').empty();
      body.traits.forEach(t => $('.about-traits').append(`<p>${t}</p>`));
    }

    if (Array.isArray(body.roles)) {
      $('.about-roles').empty();
      body.roles.forEach(r => {
        const companyHtml = r.url ? `<a href="${r.url}" target="_blank" rel="noopener">${r.company}</a>` : r.company;
        $('.about-roles').append(
          `<div class="role-entry">\n  <span class="role-title">${r.title}</span>\n  <span class="role-company">${companyHtml}</span>\n</div>`
        );
      });
    }

    if (typeof body.email === 'string') {
      // Update all email-footer links (main footer + sub-page footers)
      $('a.email-footer').each((_, el) => {
        $(el).attr('href', 'mailto:' + body.email);
        $(el).text(body.email);
      });
    }

    fs.writeFileSync(HTML_FILE, $.html());
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------- CSS VARIABLES --------------
const CSS_VAR_MAP = {
  bg:           '--bg',
  textPrimary:  '--text-primary',
  accentBlue:   '--accent-blue',
  accentWarm:   '--accent-warm',
  fontFamily:   '--font-family',
  fontSize:     '--base-font-size',
  letterSpacing:'--letter-spacing-base',
};

app.get('/api/styles', (req, res) => {
  try {
    const css = fs.readFileSync(CSS_FILE, 'utf8');
    const result = {};

    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      // Escape dashes for regex
      const escaped = cssVar.replace(/-/g, '\\-');
      const rx = new RegExp(escaped + '\\s*:\\s*([^;]+);');
      const m  = css.match(rx);
      if (m && m[1]) result[key] = m[1].trim();
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/styles', (req, res) => {
  try {
    let css = fs.readFileSync(CSS_FILE, 'utf8');

    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      const val = req.body[key];
      if (!val) continue;
      const escaped = cssVar.replace(/-/g, '\\-');
      const rx = new RegExp('(' + escaped + '\\s*:\\s*)([^;]+);');
      if (rx.test(css)) {
        css = css.replace(rx, `$1${val};`);
      } else {
        // Variable doesn't exist — inject it into :root block
        css = css.replace(/(:root\s*\{)/, `$1\n  ${cssVar}: ${val};`);
      }
    }

    fs.writeFileSync(CSS_FILE, css);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -------------- START --------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Admin panel running → http://localhost:${PORT}`);
});
