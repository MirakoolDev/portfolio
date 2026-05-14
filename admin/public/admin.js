/* ═══════════════════════════════════════════
   Admin Panel — admin.js  (full rewrite)
   ═══════════════════════════════════════════ */
'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let projectsData = { art: [], design: [], experiments: [] };
let currentCat   = 'art';

// ─── Navigation ──────────────────────────────────────────────────────────────
function showPanel(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  btn.classList.add('active');
}

// ─── Notification ─────────────────────────────────────────────────────────────
function notify(msg, isError = false) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
  el.style.display = 'block';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 300); }, 3000);
}

// ─── ABOUT ───────────────────────────────────────────────────────────────────
async function loadAbout() {
  try {
    const data = await fetchJSON('/api/about');
    document.getElementById('about-tagline').value = data.tagline || '';
    document.getElementById('about-email').value   = data.email   || '';
    document.getElementById('about-traits').value  = (data.traits || []).join('\n');
    const wrap = document.getElementById('roles-list');
    wrap.innerHTML = '';
    (data.roles || []).forEach(r => addRoleRow(r.title, r.company, r.url));
  } catch(e) { notify('Failed to load about: ' + e.message, true); }
}

function addRoleRow(title = '', company = '', url = '') {
  const wrap = document.getElementById('roles-list');
  const row  = document.createElement('div');
  row.className = 'role-row';
  row.innerHTML = `
    <input type="text" placeholder="Role title" class="role-title-input" value="${esc(title)}">
    <input type="text" placeholder="Company" class="role-company-input" value="${esc(company)}">
    <input type="text" placeholder="URL (optional)" class="role-url-input" value="${esc(url)}">
    <button class="btn-icon remove-role" title="Remove">✕</button>`;
  row.querySelector('.remove-role').addEventListener('click', () => row.remove());
  wrap.appendChild(row);
}

async function saveAbout() {
  const tagline = document.getElementById('about-tagline').value.trim();
  const email   = document.getElementById('about-email').value.trim();
  const traits  = document.getElementById('about-traits').value.split('\n').map(t => t.trim()).filter(Boolean);
  const roles   = [...document.querySelectorAll('#roles-list .role-row')].map(r => ({
    title:   r.querySelector('.role-title-input').value.trim(),
    company: r.querySelector('.role-company-input').value.trim(),
    url:     r.querySelector('.role-url-input').value.trim()
  }));
  try {
    const d = await postJSON('/api/about', { tagline, email, traits, roles });
    d.success ? notify('About saved ✓') : notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
async function loadProjects() {
  try {
    projectsData = await fetchJSON('/api/data');
    renderCat('art');
    renderCat('design');
    renderCat('experiments');
  } catch(e) { notify('Failed to load projects: ' + e.message, true); }
}

function switchCat(cat, btn) {
  currentCat = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.cat-panel').forEach(p => p.style.display = 'none');
  document.getElementById('projects-' + cat).style.display = '';
}

function renderCat(cat) {
  const wrap = document.getElementById('projects-' + cat);
  wrap.innerHTML = '';
  (projectsData[cat] || []).forEach((p, i) => wrap.appendChild(buildProjectCard(cat, i, p)));
}

function buildProjectCard(cat, idx, p) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.cat = cat;
  card.dataset.idx = idx;
  card.draggable = true;

  // Drag events
  card.addEventListener('dragstart', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      e.preventDefault();
      return;
    }
    _dragSrc = card;
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragover',  e => { e.preventDefault(); card.classList.add('drag-over'); });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', e => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (_dragSrc && _dragSrc !== card && _dragSrc.dataset.cat === card.dataset.cat) {
      const list = card.parentElement;
      const allRows = [...list.querySelectorAll('.project-card')];
      const srcIdx  = allRows.indexOf(_dragSrc);
      const tgtIdx  = allRows.indexOf(card);
      if (srcIdx < tgtIdx) list.insertBefore(_dragSrc, card.nextSibling);
      else list.insertBefore(_dragSrc, card);
    }
  });
  card.addEventListener('dragend', () => {
    _dragSrc = null;
    if (card.parentElement) {
      card.parentElement.querySelectorAll('.project-card').forEach(r => r.classList.remove('drag-over'));
    }
  });

  const mediaRows = (p.media || []).map((m, mi) => mediaRowHTML(mi, m.type, m.url)).join('');

  card.innerHTML = `
    <div class="project-card-header" onclick="toggleCard(this)">
      <span class="nav-order-handle" style="margin-right:8px;color:var(--text-muted);cursor:grab;">⠿</span>
      <span class="project-card-title">${esc(p.title || 'Untitled')}</span>
      <button class="btn-icon" style="color:var(--danger)" onclick="event.stopPropagation();removeProject(this)" title="Delete">✕</button>
      <span class="project-card-toggle">+</span>
    </div>
    <div class="project-card-body">
      <label>ID (slug)</label>
      <input type="text" class="pf-id"    value="${esc(p.id    || '')}" placeholder="my-project-24">
      <label>Title</label>
      <input type="text" class="pf-title" value="${esc(p.title || '')}" placeholder="project title" oninput="this.closest('.project-card').querySelector('.project-card-title').textContent=this.value||'Untitled'">
      <label>Description (HTML spans OK)</label>
      <textarea class="pf-desc" rows="3">${escTA(p.desc || '')}</textarea>
      <label>External Link (or leave blank)</label>
      <input type="text" class="pf-link" value="${esc(p.link || '')}" placeholder="https://…">
      <label>Media</label>
      <div class="media-list">${mediaRows}</div>
      <div style="display:flex; gap: 8px; margin-top:6px;">
        <button class="btn btn-ghost btn-sm" onclick="addMediaRow(this, 'image')">+ Add image</button>
        <button class="btn btn-ghost btn-sm" onclick="addMediaRow(this, 'video')">+ Embed video</button>
      </div>
    </div>`;
  return card;
}

function mediaRowHTML(idx, type = 'image', url = '') {
  const isVid = type === 'video';
  return `<div class="media-row">
    <select class="media-type">
      <option value="image"${!isVid?' selected':''}>Image</option>
      <option value="video"${isVid?' selected':''}>Video</option>
    </select>
    <input type="text" class="media-url" value="${esc(url)}" placeholder="${isVid ? 'https://youtube.com/watch?v=...' : 'images/photo.webp'}">
    <button class="btn-icon" onclick="this.closest('.media-row').remove()" title="Remove">✕</button>
  </div>`;
}

function addMediaRow(btn, defaultType = 'image') {
  const list = btn.closest('.project-card-body').querySelector('.media-list');
  const tmp  = document.createElement('div');
  tmp.innerHTML = mediaRowHTML(0, defaultType);
  list.appendChild(tmp.firstElementChild);
}

function toggleCard(header) {
  const card = header.closest('.project-card');
  card.classList.toggle('open');
}

function removeProject(btn) {
  if (!confirm('Remove this project?')) return;
  btn.closest('.project-card').remove();
}

function addProject() {
  const wrap = document.getElementById('projects-' + currentCat);
  const newP = { id: 'new-project', title: 'New Project', desc: '', link: null, media: [] };
  const card = buildProjectCard(currentCat, wrap.children.length, newP);
  card.classList.add('open');
  wrap.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function collectProjects() {
  const result = { art: [], design: [], experiments: [] };
  ['art','design','experiments'].forEach(cat => {
    document.querySelectorAll(`#projects-${cat} .project-card`).forEach(card => {
      const media = [...card.querySelectorAll('.media-row')].map(row => ({
        type: row.querySelector('.media-type').value,
        url:  row.querySelector('.media-url').value.trim()
      })).filter(m => m.url);
      result[cat].push({
        id:    card.querySelector('.pf-id').value.trim(),
        title: card.querySelector('.pf-title').value.trim(),
        desc:  card.querySelector('.pf-desc').value.trim(),
        link:  card.querySelector('.pf-link').value.trim() || null,
        media
      });
    });
  });
  return result;
}

async function saveProjects() {
  try {
    const data = collectProjects();
    const d    = await postJSON('/api/data', data);
    d.success ? notify('Projects saved ✓') : notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// ─── IMAGES ──────────────────────────────────────────────────────────────────
async function loadImages() {
  const gallery = document.getElementById('image-gallery');
  gallery.innerHTML = '<span style="color:#666;font-size:12px">Loading…</span>';
  try {
    const data = await fetchJSON('/api/images');
    gallery.innerHTML = '';
    if (!data.images || data.images.length === 0) {
      gallery.innerHTML = '<p class="gallery-empty">No images uploaded yet.</p>';
      return;
    }
    data.images.forEach(img => {
      const isVideo = /\.(mp4|webm)$/i.test(img.name);
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `
        ${isVideo
          ? `<video src="${img.url}" muted loop></video>`
          : `<img src="${img.url}" alt="${esc(img.name)}" loading="lazy">`}
        <div class="gallery-name">${esc(img.name)}</div>
        <div class="gallery-actions">
          <button class="gallery-action-btn" onclick="copyPath('${esc(img.url)}')">Copy</button>
          <button class="gallery-action-btn" style="background:rgba(200,50,50,.8)" onclick="deleteImage('${esc(img.name)}',this)">Del</button>
        </div>`;
      gallery.appendChild(item);
    });
  } catch(e) { gallery.innerHTML = '<p class="gallery-empty">Error loading images.</p>'; }
}

function copyPath(url) {
  navigator.clipboard.writeText(url).then(() => notify('Path copied: ' + url));
}

async function deleteImage(name, btn) {
  if (!confirm('Delete ' + name + '?')) return;
  try {
    const res = await fetch('/api/images/' + encodeURIComponent(name), { method: 'DELETE' });
    const d   = await res.json();
    if (d.success) { btn.closest('.gallery-item').remove(); notify('Deleted ✓'); }
    else notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// Upload
function initUpload() {
  const zone  = document.getElementById('drop-zone');
  const input = document.getElementById('upload-file');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    uploadFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => uploadFiles(input.files));
}

async function uploadFiles(files) {
  if (!files || !files.length) return;
  const bar  = document.getElementById('upload-bar');
  const prog = document.getElementById('upload-progress');
  prog.style.display = 'block';
  let done = 0;
  for (const file of files) {
    const form = new FormData();
    form.append('media', file);
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) notify('Uploaded: ' + data.url);
      else notify('Upload failed', true);
    } catch(e) { notify('Upload error: ' + e.message, true); }
    done++;
    bar.style.width = (done / files.length * 100) + '%';
  }
  setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0'; }, 800);
  loadImages();
}

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────
const GOOGLE_FONTS = {
  "'Inter',sans-serif": 'Inter',
  "'DM Sans',sans-serif": 'DM Sans',
  "'Space Grotesk',sans-serif": 'Space Grotesk',
  "'Outfit',sans-serif": 'Outfit',
  "'Playfair Display',serif": 'Playfair Display',
  "'IBM Plex Mono',monospace": 'IBM Plex Mono',
  // Geometric / Display
  "'Space Mono',monospace": 'Space Mono',
  "'Major Mono Display',monospace": 'Major Mono Display',
  "'Bebas Neue',sans-serif": 'Bebas Neue',
  "'Barlow Condensed',sans-serif": 'Barlow Condensed',
  "'Syne',sans-serif": 'Syne',
  "'Oxanium',sans-serif": 'Oxanium',
  "'Share Tech Mono',monospace": 'Share Tech Mono',
};

function loadGoogleFont(family) {
  const existing = document.getElementById('dynamic-font');
  if (existing) existing.remove();
  if (!GOOGLE_FONTS[family]) return;
  const link = document.createElement('link');
  link.id   = 'dynamic-font';
  link.rel  = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(GOOGLE_FONTS[family])}&display=swap`;
  document.head.appendChild(link);
}

function updateFontPreview() {
  const select  = document.getElementById('font-family-select');
  const custom  = document.getElementById('font-family-custom');
  const preview = document.getElementById('font-preview');
  const sizeEl  = document.getElementById('font-size');
  const lsEl    = document.getElementById('letter-spacing');

  let family = select.value;
  custom.style.display = family === 'custom' ? 'block' : 'none';
  if (family === 'custom') family = custom.value || 'inherit';
  else loadGoogleFont(family);

  preview.style.fontFamily      = family;
  preview.style.fontSize        = sizeEl.value + 'px';
  preview.style.letterSpacing   = (lsEl.value / 100).toFixed(2) + 'em';
}

async function loadTypography() {
  try {
    const data   = await fetchJSON('/api/styles');
    const select = document.getElementById('font-family-select');
    const sizeEl = document.getElementById('font-size');
    const lsEl   = document.getElementById('letter-spacing');

    if (data.fontFamily) {
      let matched = false;
      for (const opt of select.options) {
        if (opt.value === data.fontFamily) { opt.selected = true; matched = true; break; }
      }
      if (!matched) {
        select.value = 'custom';
        document.getElementById('font-family-custom').value = data.fontFamily;
        document.getElementById('font-family-custom').style.display = 'block';
      }
    }

    if (data.fontSize) {
      const px = parseFloat(data.fontSize);
      if (!isNaN(px)) { sizeEl.value = px; document.getElementById('font-size-val').textContent = px + 'px'; }
    }

    if (data.letterSpacing) {
      const em = parseFloat(data.letterSpacing);
      if (!isNaN(em)) { lsEl.value = Math.round(em * 100); document.getElementById('letter-spacing-val').textContent = em.toFixed(2) + 'em'; }
    }

    updateFontPreview();
  } catch(e) { /* ignore */ }
}

async function saveTypography() {
  const select = document.getElementById('font-family-select');
  let family   = select.value === 'custom'
    ? document.getElementById('font-family-custom').value.trim()
    : select.value;
  const fontSize      = document.getElementById('font-size').value + 'px';
  const letterSpacing = (document.getElementById('letter-spacing').value / 100).toFixed(2) + 'em';

  try {
    const d = await postJSON('/api/styles', { fontFamily: family, fontSize, letterSpacing });
    d.success ? notify('Typography saved ✓') : notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// ─── DESIGN ───────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  bg:   { text: 'design-bg',          picker: 'cpicker-bg',   swatch: 'swatch-bg'   },
  text: { text: 'design-text',        picker: 'cpicker-text', swatch: 'swatch-text' },
  blue: { text: 'design-accent-blue', picker: 'cpicker-blue', swatch: 'swatch-blue' },
  warm: { text: 'design-accent-warm', picker: 'cpicker-warm', swatch: 'swatch-warm' },
};

function syncColor(key) {
  const m   = COLOR_MAP[key];
  const val = document.getElementById(m.picker).value;
  document.getElementById(m.text).value = val;
  document.getElementById(m.swatch).style.background = val;
}

function syncSwatch(key) {
  const m   = COLOR_MAP[key];
  const val = document.getElementById(m.text).value;
  document.getElementById(m.swatch).style.background = val;
  try { document.getElementById(m.picker).value = toHex(val); } catch(e) {}
}

function toHex(color) {
  const d = document.createElement('div');
  d.style.color = color;
  document.body.appendChild(d);
  const c = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return '#000000';
  return '#' + m.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
}

async function loadDesign() {
  try {
    const data = await fetchJSON('/api/styles');
    const pairs = [
      ['bg',   data.bg         || ''],
      ['text', data.textPrimary|| ''],
      ['blue', data.accentBlue || ''],
      ['warm', data.accentWarm || ''],
    ];
    pairs.forEach(([key, val]) => {
      const m = COLOR_MAP[key];
      document.getElementById(m.text).value = val;
      document.getElementById(m.swatch).style.background = val;
      try { document.getElementById(m.picker).value = toHex(val); } catch(e) {}
    });
  } catch(e) { /* ignore */ }
}

async function saveDesign() {
  const payload = {
    bg:          document.getElementById('design-bg').value.trim(),
    textPrimary: document.getElementById('design-text').value.trim(),
    accentBlue:  document.getElementById('design-accent-blue').value.trim(),
    accentWarm:  document.getElementById('design-accent-warm').value.trim(),
  };
  try {
    const d = await postJSON('/api/styles', payload);
    d.success ? notify('Design saved ✓') : notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────────
let _dragSrc = null;

function renderNavOrderList(navOrder) {
  const list = document.getElementById('nav-order-list');
  list.innerHTML = '';
  navOrder.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'nav-order-row';
    row.draggable = true;
    row.dataset.idx = i;
    row.innerHTML = `
      <span class="nav-order-handle">⠿</span>
      <input type="text" class="nav-order-label-input" value="${esc(item.label)}" placeholder="Label" title="Nav label">
      <input type="text" class="nav-order-img" value="${esc(item.image || '')}" placeholder="Image URL (images/…)" data-hash="${esc(item.hash)}">`;

    // Drag events
    row.addEventListener('dragstart', e => { _dragSrc = row; e.dataTransfer.effectAllowed = 'move'; });
    row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('drag-over'); });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (_dragSrc && _dragSrc !== row) {
        const allRows = [...list.querySelectorAll('.nav-order-row')];
        const srcIdx  = allRows.indexOf(_dragSrc);
        const tgtIdx  = allRows.indexOf(row);
        if (srcIdx < tgtIdx) list.insertBefore(_dragSrc, row.nextSibling);
        else list.insertBefore(_dragSrc, row);
      }
    });
    row.addEventListener('dragend', () => { _dragSrc = null; list.querySelectorAll('.nav-order-row').forEach(r => r.classList.remove('drag-over')); });

    list.appendChild(row);
  });
}

async function loadHomepage() {
  try {
    const data = await fetchJSON('/api/config');
    const navOrder = data.navOrder || [];
    renderNavOrderList(navOrder);

    const socials = data.socials || {};
    document.getElementById('input-twitter').value   = socials.twitter   || '';
    document.getElementById('input-linkedin').value  = socials.linkedin  || '';
    document.getElementById('input-instagram').value = socials.instagram || '';

    const margin = typeof data.contentMarginLeft === 'number' ? data.contentMarginLeft : 48;
    document.getElementById('content-margin').value = margin;
    document.getElementById('margin-val').textContent = margin + 'px';

    document.getElementById('mo-label-input').value = data.moButtonLabel || 'MO';
  } catch(e) { notify('Failed to load homepage config: ' + e.message, true); }
}

async function saveHomepage() {
  // Collect nav order rows
  const rows = [...document.querySelectorAll('#nav-order-list .nav-order-row')];
  const navOrder = rows.map(row => ({
    label: row.querySelector('.nav-order-label-input').value.trim(),
    hash:  row.querySelector('.nav-order-img').dataset.hash,
    image: row.querySelector('.nav-order-img').value.trim()
  }));

  const socials = {
    twitter:   document.getElementById('input-twitter').value.trim(),
    linkedin:  document.getElementById('input-linkedin').value.trim(),
    instagram: document.getElementById('input-instagram').value.trim()
  };

  const contentMarginLeft = parseInt(document.getElementById('content-margin').value, 10);
  const moButtonLabel = document.getElementById('mo-label-input').value.trim() || 'MO';

  try {
    const d = await postJSON('/api/config', { navOrder, socials, contentMarginLeft, moButtonLabel });
    d.success ? notify('Homepage saved ✓') : notify('Error: ' + d.error, true);
  } catch(e) { notify(e.message, true); }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function postJSON(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escTA(str) {
  return String(str || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAbout();
  loadProjects();
  loadImages();
  loadTypography();
  loadDesign();
  loadHomepage();
  initUpload();

  document.getElementById('add-role-btn').addEventListener('click', () => addRoleRow());
  document.getElementById('font-family-select').addEventListener('change', updateFontPreview);
  document.getElementById('font-family-custom').addEventListener('input', updateFontPreview);
});
