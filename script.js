/* ═══════════════════════════════════════════
   Portfolio — script.js
   ═══════════════════════════════════════════ */

'use strict';

const PROJECTS    = window.PROJECTS    || {};
const SITE_CONFIG = window.SITE_CONFIG || {};

/* ─────────────────────────────────────────
   State
   ───────────────────────────────────────── */
const carouselState = {};

/* ─────────────────────────────────────────
   Lightbox State
   ───────────────────────────────────────── */
let lightboxData = [];
let lightboxIndex = 0;

/* ─────────────────────────────────────────
   Nav Rendering (from SITE_CONFIG.navOrder)
   ───────────────────────────────────────── */
function renderNav() {
  const nav    = document.getElementById('main-nav');
  if (!nav) return;
  const items  = (SITE_CONFIG.navOrder || []);

  nav.innerHTML = items.map(item => {
    // Only show the image box when an image URL is actually set
    const imgHTML = item.image
      ? `<div class="nav-preview"><img src="${item.image}" alt="${item.label} preview"></div>`
      : '';
    return `
      <a href="#${item.hash}" class="nav-link${item.image ? ' nav-link--has-image' : ''}" id="nav-${item.hash}">
        ${imgHTML}
        <span class="nav-label">${item.label}</span>
      </a>`;
  }).join('');
}

/* ─────────────────────────────────────────
   Social Links Rendering
   ───────────────────────────────────────── */
const SOCIAL_ICONS = {
  twitter:   `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.4 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  linkedin:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`
};

function renderSocialLinks() {
  const socials = SITE_CONFIG.socials || {};
  const links = ['twitter','linkedin','instagram']
    .filter(k => socials[k])
    .map(k => `<a href="${socials[k]}" target="_blank" rel="noopener" class="social-link" id="icon-${k}" aria-label="${k}">${SOCIAL_ICONS[k]}</a>`)
    .join('');

  document.querySelectorAll('.social-links').forEach(el => {
    el.innerHTML = links;
  });
}

/* ─────────────────────────────────────────
   Content Margin
   ───────────────────────────────────────── */
function applyContentMargin() {
  const adminMargin = SITE_CONFIG.contentMarginLeft || 0;
  document.documentElement.style.setProperty('--admin-margin', adminMargin + 'px');

  const moBtn = document.getElementById('mo-home');
  if (moBtn) {
    const updateWidth = () => {
      const rect = moBtn.getBoundingClientRect();
      const safeLeft = rect.right > 0 ? rect.right + 24 : 160;
      document.documentElement.style.setProperty('--mo-width', safeLeft + 'px');
    };

    updateWidth();
    if (document.fonts) document.fonts.ready.then(updateWidth);
    if (window.ResizeObserver) new ResizeObserver(updateWidth).observe(moBtn);
  }
}

/* ─────────────────────────────────────────
   MO Home Button — always visible
   ───────────────────────────────────────── */
function updateMOVisibility() {
  // Button is always visible on all pages — no-op
}

/* ─────────────────────────────────────────
   Router
   ───────────────────────────────────────── */
function getHash() {
  return window.location.hash.replace('#', '') || 'main';
}

function route() {
  const target = getHash();

  document.querySelectorAll('.view').forEach(view => {
    const matches = view.dataset.view === target;
    view.classList.toggle('hidden', !matches);
  });

  // Lazy-render project lists on first visit
  if (PROJECTS[target]) {
    renderProjectList(target);
  }

  // Scroll active view to top
  const active = document.getElementById(`view-${target}`);
  if (active) active.scrollTop = 0;

  updateMOVisibility();
}

/* ─────────────────────────────────────────
   Project List Rendering
   ───────────────────────────────────────── */
function renderProjectList(category) {
  const container = document.getElementById(`project-list-${category}`);
  if (!container || container.dataset.rendered === 'true') return;

  container.innerHTML = PROJECTS[category].map(buildProjectItem).join('');
  container.dataset.rendered = 'true';

  // Initialise carousel state for each project
  PROJECTS[category].forEach(p => {
    const slideCount = p.media && p.media.length > 0 ? p.media.length : 1;
    carouselState[p.id] = { current: 0, total: slideCount };
  });

  // Single delegated listener per list
  container.addEventListener('click', handleListClick);
  container.addEventListener('keydown', handleListKeydown);
}

function buildProjectItem(p) {
  // Title: link if external URL provided, otherwise plain text
  const titleEl = p.link
    ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-title-link">${p.title}</a>`
    : `<span class="project-title-text">${p.title}</span>`;

  // Generate slides
  const slideCount = p.media && p.media.length > 0 ? p.media.length : 1;
  const slides = Array.from({ length: slideCount }, (_, i) => {
    if (p.media && p.media[i]) {
      const m = p.media[i];
      if (m.type === 'video') {
         return `<div class="carousel-slide" role="figure" data-pid="${p.id}" data-index="${i}"><iframe src="${m.url}" style="width:100%;height:100%;border:none;pointer-events:none;" allowfullscreen></iframe></div>`;
      } else {
         return `<div class="carousel-slide" role="figure" data-pid="${p.id}" data-index="${i}"><img src="${m.url}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;"></div>`;
      }
    }
    return `
      <div class="carousel-slide" role="img" aria-label="Image ${i + 1} of ${slideCount}">
        <span class="slide-placeholder-label">${p.title}</span>
        <span class="slide-index">${pad(i + 1)} / ${pad(slideCount)}</span>
      </div>`;
  }).join('');

  return `
    <div class="project-item" id="item-${p.id}">
      <div class="project-header">
        ${titleEl}
        <p class="project-description">${p.desc}</p>
        <span
          class="project-toggle is-open"
          data-pid="${p.id}"
          role="button"
          tabindex="0"
          aria-expanded="true"
          aria-controls="expand-${p.id}"
          aria-label="Collapse ${p.title}">+</span>
      </div>

      <div class="project-expand open" id="expand-${p.id}" aria-hidden="false">
        <div class="carousel-wrap">
          <button class="carousel-btn" data-dir="prev" data-pid="${p.id}" aria-label="Previous">←</button>
          <div class="carousel-viewport" id="vp-${p.id}">
            <div class="carousel-track" id="track-${p.id}">${slides}</div>
          </div>
          <button class="carousel-btn" data-dir="next" data-pid="${p.id}" aria-label="Next">→</button>
        </div>
        <div class="carousel-meta">
          <span class="carousel-counter" id="counter-${p.id}">${pad(1)} / ${pad(slideCount)}</span>
        </div>
      </div>
    </div>`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/* ─────────────────────────────────────────
   Event Handlers (delegated)
   ───────────────────────────────────────── */
function handleListClick(e) {
  const toggle = e.target.closest('.project-toggle');
  if (toggle) { toggleExpand(toggle.dataset.pid, toggle); return; }

  const btn = e.target.closest('.carousel-btn');
  if (btn) { slide(btn.dataset.pid, btn.dataset.dir); return; }

  const slideEl = e.target.closest('.carousel-slide');
  if (slideEl && slideEl.dataset.pid) {
    openLightbox(slideEl.dataset.pid, parseInt(slideEl.dataset.index, 10));
    return;
  }
}

function handleListKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    const toggle = e.target.closest('.project-toggle');
    if (toggle) {
      e.preventDefault();
      toggleExpand(toggle.dataset.pid, toggle);
    }
  }
}

/* ─────────────────────────────────────────
   Expand / Collapse
   ───────────────────────────────────────── */
function toggleExpand(pid, toggleEl) {
  const panel = document.getElementById(`expand-${pid}`);
  if (!panel) return;

  const open = panel.classList.toggle('open');
  toggleEl.classList.toggle('is-open', open);
  toggleEl.setAttribute('aria-expanded', String(open));
  panel.setAttribute('aria-hidden', String(!open));
}

/* ─────────────────────────────────────────
   Carousel Navigation
   ───────────────────────────────────────── */
function slide(pid, dir) {
  const state = carouselState[pid];
  if (!state) return;

  state.current = dir === 'next'
    ? (state.current + 1) % state.total
    : (state.current - 1 + state.total) % state.total;

  const track   = document.getElementById(`track-${pid}`);
  const counter = document.getElementById(`counter-${pid}`);

  if (track && track.children.length > 0) {
    const slideWidth = track.children[0].offsetWidth;
    const gap = 20;
    track.style.transform = `translateX(-${state.current * (slideWidth + gap)}px)`;
  }
  if (counter) counter.textContent   = `${pad(state.current + 1)} / ${pad(state.total)}`;
}

/* ─────────────────────────────────────────
   Lightbox Navigation
   ───────────────────────────────────────── */
function openLightbox(pid, startIndex) {
  let proj = null;
  for (const cat in PROJECTS) {
    proj = PROJECTS[cat].find(p => p.id === pid);
    if (proj) break;
  }
  if (!proj || !proj.media || proj.media.length === 0) return;

  lightboxData = proj.media;
  lightboxIndex = startIndex;

  renderLightboxSlide();
  
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.remove('hidden');
    lb.setAttribute('aria-hidden', 'false');
  }
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.add('hidden');
    lb.setAttribute('aria-hidden', 'true');
    // clear iframe to stop video playback
    document.getElementById('lightbox-content').innerHTML = '';
  }
}

function nextLightbox() {
  if (lightboxData.length <= 1) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxData.length;
  renderLightboxSlide();
}

function prevLightbox() {
  if (lightboxData.length <= 1) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxData.length) % lightboxData.length;
  renderLightboxSlide();
}

function renderLightboxSlide() {
  const content = document.getElementById('lightbox-content');
  const counter = document.getElementById('lightbox-counter');
  
  const m = lightboxData[lightboxIndex];
  if (m.type === 'video') {
    content.innerHTML = `<iframe src="${m.url}" style="width:100%;height:100%;border:none;" allowfullscreen></iframe>`;
  } else {
    content.innerHTML = `<img src="${m.url}" alt="Lightbox media" style="max-width:100%; max-height:100%; object-fit:contain;">`;
  }
  
  if (counter) counter.textContent = `${pad(lightboxIndex + 1)} / ${pad(lightboxData.length)}`;
}

// Ensure SITE_CONFIG exists so the page doesn't crash if it's missing from data.js
window.SITE_CONFIG = window.SITE_CONFIG || {};

/* ─────────────────────────────────────────
   Theme
   ───────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('portfolio-theme') || 'dark';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('portfolio-theme', theme);

  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '○' : '●';
}

/* ─────────────────────────────────────────
   Keyboard Shortcuts
   ───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  const lbOpen = lb && !lb.classList.contains('hidden');

  if (e.key === 'Escape') {
    if (lbOpen) {
      closeLightbox();
    } else if (getHash() !== 'main') {
      window.location.hash = 'main';
    }
  }

  if (lbOpen) {
    if (e.key === 'ArrowRight') nextLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
  }
});

/* ─────────────────────────────────────────
   MO Button Label
   ───────────────────────────────────────── */
function applyMOLabel() {
  const btn = document.getElementById('mo-home');
  if (!btn) return;
  const label = (SITE_CONFIG.moButtonLabel || 'MO').trim();
  btn.textContent = label;
}

function init() {
  initTheme();
  renderNav();
  renderSocialLinks();
  applyContentMargin();
  applyMOLabel();

  window.addEventListener('hashchange', route);
  route(); // run immediately for initial URL

  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', toggleTheme);

  const lbClose = document.getElementById('lightbox-close');
  const lbPrev = document.getElementById('lightbox-prev');
  const lbNext = document.getElementById('lightbox-next');
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', prevLightbox);
  if (lbNext) lbNext.addEventListener('click', nextLightbox);
}

document.addEventListener('DOMContentLoaded', init);
