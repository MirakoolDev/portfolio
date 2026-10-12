/* ═══════════════════════════════════════════
   Portfolio — script.js
   ═══════════════════════════════════════════ */

'use strict';

const PROJECTS    = window.PROJECTS    || {};
const SITE_CONFIG = window.SITE_CONFIG || {};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal-on-scroll hides content until it's observed, so only arm it once
// the script is actually running — otherwise a JS failure blanks the page.
document.documentElement.classList.add('js');

/* ─────────────────────────────────────────
   Lightbox State
   ───────────────────────────────────────── */
let lightboxData = [];
let lightboxIndex = 0;
let lightboxOpener = null;

/* ─────────────────────────────────────────
   Nav Rendering (from SITE_CONFIG.navOrder)
   ───────────────────────────────────────── */
function renderNav() {
  const nav    = document.getElementById('main-nav');
  if (!nav) return;
  const items  = (SITE_CONFIG.navOrder || []);

  nav.innerHTML = items.map((item, i) => {
    // Only show the image box when an image URL is actually set
    const imgHTML = item.image
      ? `<div class="nav-preview"><img src="${item.image}" alt="${item.label} preview" loading="eager" decoding="async"></div>`
      : '';
    return `
      <a href="#${item.hash}" class="nav-link${item.image ? ' nav-link--has-image' : ''}" id="nav-${item.hash}" style="--i:${i}">
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
    .map(k => `<a href="${normaliseUrl(socials[k])}" target="_blank" rel="noopener" class="social-link" id="icon-${k}" aria-label="${k}">${SOCIAL_ICONS[k]}</a>`)
    .join('');

  document.querySelectorAll('.social-links').forEach(el => {
    el.innerHTML = links;
  });
}

/** Social URLs are sometimes saved without a scheme — don't let them resolve as relative paths. */
function normaliseUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* ─────────────────────────────────────────
   Content Margin
   ───────────────────────────────────────── */
function applyContentMargin() {
  const adminMargin = SITE_CONFIG.contentMarginLeft || 0;
  document.documentElement.style.setProperty('--admin-margin', adminMargin + 'px');
}

/* ─────────────────────────────────────────
   Reveal-on-scroll
   ───────────────────────────────────────── */
let revealObserver = null;

function getRevealObserver() {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) return null;
  if (revealObserver) return revealObserver;

  revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  return revealObserver;
}

function observeReveals(root) {
  const obs = getRevealObserver();
  const items = root.querySelectorAll('.reveal');

  if (!obs) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  items.forEach((el, i) => {
    el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
    obs.observe(el);
  });
}

/* ─────────────────────────────────────────
   Play videos only while they're on screen
   ───────────────────────────────────────── */
let videoObserver = null;

function getVideoObserver() {
  if (!('IntersectionObserver' in window)) return null;
  if (videoObserver) return videoObserver;

  videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        const play = v.play();
        if (play && play.catch) play.catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.25 });

  return videoObserver;
}

function observeVideos(root) {
  const obs = getVideoObserver();
  root.querySelectorAll('video[data-inview]').forEach(v => {
    if (obs) obs.observe(v);
    else { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  });
}

/* ─────────────────────────────────────────
   Router
   ───────────────────────────────────────── */
// Views that have been renamed — old links should still land somewhere
const LEGACY_HASHES = { experiments: 'builds' };

function getHash() {
  const raw = window.location.hash.replace('#', '') || 'main';
  return LEGACY_HASHES[raw] || raw;
}

function route() {
  const target = getHash();

  // Quietly bring a legacy URL up to date (replaceState won't re-fire route)
  const raw = window.location.hash.replace('#', '');
  if (raw && LEGACY_HASHES[raw] && window.history.replaceState) {
    window.history.replaceState(null, '', `#${target}`);
  }

  document.querySelectorAll('.view').forEach(view => {
    const matches = view.dataset.view === target;
    view.classList.toggle('hidden', !matches);
  });

  // Lazy-render project lists on first visit
  if (PROJECTS[target]) {
    renderProjectList(target);
  }

  // Scroll active view to top (instantly — this is a page change, not a jump)
  const active = document.getElementById(`view-${target}`);
  if (active) {
    const previous = active.style.scrollBehavior;
    active.style.scrollBehavior = 'auto';
    active.scrollTop = 0;
    active.style.scrollBehavior = previous;
  }
}

/* ─────────────────────────────────────────
   Project List Rendering
   ───────────────────────────────────────── */
function renderProjectList(category) {
  const container = document.getElementById(`project-list-${category}`);
  if (!container || container.dataset.rendered === 'true') return;

  container.innerHTML = PROJECTS[category].map(buildProjectItem).join('');
  container.dataset.rendered = 'true';

  // Single delegated listener per list
  container.addEventListener('click', handleListClick);

  container.querySelectorAll('.carousel-viewport').forEach(initCarousel);
  container.querySelectorAll('.carousel-slide img').forEach(markWhenLoaded);
  observeVideos(container);
  observeReveals(container);
}

/** Fade media in once the bytes have actually arrived. */
function markWhenLoaded(img) {
  if (img.complete && img.naturalWidth > 0) {
    img.classList.add('is-loaded');
    return;
  }
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
}

function buildProjectItem(p, projectIndex) {
  // Title: link if external URL provided, otherwise plain text
  const titleEl = p.link
    ? `<a href="${p.link}" target="_blank" rel="noopener" class="project-title-link">${p.title}</a>`
    : `<span class="project-title-text" data-pid="${p.id}">${p.title}</span>`;

  const slideCount = p.media && p.media.length > 0 ? p.media.length : 1;
  const isSingle   = slideCount <= 1;
  const isEmbedOnly = isSingle
    && p.media && p.media[0]
    && p.media[0].type === 'video'
    && !/^images\/|\.(mp4|webm)$/.test(p.media[0].url);

  const slides = Array.from({ length: slideCount }, (_, i) => {
    if (p.media && p.media[i]) {
      const m = p.media[i];
      // First couple of frames load eagerly so the open panel is never blank
      const loading = projectIndex === 0 && i < 2 ? 'eager' : 'lazy';

      if (m.type === 'video') {
         // Check if it's a local file or an external embed
         if (m.url.startsWith('images/') || m.url.endsWith('.mp4') || m.url.endsWith('.webm')) {
           return `<div class="carousel-slide" role="figure" data-pid="${p.id}" data-index="${i}"><video src="${m.url}" muted loop playsinline preload="metadata" data-inview></video></div>`;
         }
         const embedUrl = formatEmbedUrl(m.url);
         return `<div class="carousel-slide is-embed" role="figure" data-pid="${p.id}" data-index="${i}"><iframe src="${embedUrl}" title="${p.title}" loading="lazy" allowfullscreen></iframe></div>`;
      }
      return `<div class="carousel-slide" role="figure" data-pid="${p.id}" data-index="${i}"><img src="${m.url}" alt="${p.title}" loading="${loading}" decoding="async"></div>`;
    }
    return `
      <div class="carousel-slide" role="img" aria-label="Image ${i + 1} of ${slideCount}">
        <span class="slide-placeholder-label">${p.title}</span>
        <span class="slide-index">${pad(i + 1)} / ${pad(slideCount)}</span>
      </div>`;
  }).join('');

  const description = p.desc
    ? `<p class="project-description">${p.desc}</p>`
    : '';

  return `
    <div class="project-item reveal" id="item-${p.id}">
      <div class="project-header">
        <div class="project-title-row">
          ${titleEl}
          <button
            type="button"
            class="project-toggle is-open"
            data-pid="${p.id}"
            aria-expanded="true"
            aria-controls="expand-${p.id}"
            aria-label="Collapse ${p.title}">+</button>
        </div>
        ${description}
      </div>

      <div class="project-expand open" id="expand-${p.id}">
        <div class="project-expand-inner">
          <div class="carousel-wrap${isSingle ? ' is-single' : ''}${isEmbedOnly ? ' is-wide' : ''}">
            <button class="carousel-btn" data-dir="prev" data-pid="${p.id}" aria-label="Previous image" disabled>←</button>
            <div class="carousel-viewport" id="vp-${p.id}" tabindex="0" role="group" aria-label="${p.title} media">${slides}</div>
            <button class="carousel-btn" data-dir="next" data-pid="${p.id}" aria-label="Next image">→</button>
          </div>
          <div class="carousel-meta${isSingle ? ' is-single-meta' : ''}">
            <span class="carousel-counter" id="counter-${p.id}" aria-live="polite">${pad(1)} / ${pad(slideCount)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/* ─────────────────────────────────────────
   Carousel — native scroll-snap, no transform math
   ───────────────────────────────────────── */
function initCarousel(vp) {
  const pid     = vp.id.replace('vp-', '');
  const counter = document.getElementById(`counter-${pid}`);
  const wrap    = vp.closest('.carousel-wrap');
  const prevBtn = wrap && wrap.querySelector('[data-dir="prev"]');
  const nextBtn = wrap && wrap.querySelector('[data-dir="next"]');
  const total   = vp.children.length;

  let ticking = false;

  const sync = () => {
    ticking = false;
    const step    = slideStep(vp);
    const index   = step ? Math.round(vp.scrollLeft / step) : 0;
    const atStart = vp.scrollLeft <= 1;
    const atEnd   = vp.scrollLeft >= vp.scrollWidth - vp.clientWidth - 1;

    if (counter) counter.textContent = `${pad(Math.min(index + 1, total))} / ${pad(total)}`;
    if (prevBtn) prevBtn.disabled = atStart;
    if (nextBtn) nextBtn.disabled = atEnd;
  };

  vp.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sync);
  }, { passive: true });

  // Keyboard paging / opening when the scroller itself has focus
  vp.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); slide(pid, 'next'); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); slide(pid, 'prev'); return; }

    if (e.key === 'Enter' || e.key === ' ') {
      const step    = slideStep(vp);
      const current = vp.children[step ? Math.round(vp.scrollLeft / step) : 0];
      if (current && current.dataset.pid) {
        e.preventDefault();
        openLightbox(current.dataset.pid, parseInt(current.dataset.index, 10), vp);
      }
    }
  });

  if (window.ResizeObserver) new ResizeObserver(sync).observe(vp);
  sync();
}

/** Width of one slide plus the gap between slides. */
function slideStep(vp) {
  const first = vp.children[0];
  if (!first) return 0;
  const gap = parseFloat(getComputedStyle(vp).columnGap) || 0;
  return first.getBoundingClientRect().width + gap;
}

function slide(pid, dir) {
  const vp = document.getElementById(`vp-${pid}`);
  if (!vp) return;
  const step = slideStep(vp);
  vp.scrollBy({
    left: dir === 'next' ? step : -step,
    behavior: prefersReducedMotion ? 'auto' : 'smooth'
  });
}

/* ─────────────────────────────────────────
   Event Handlers (delegated)
   ───────────────────────────────────────── */
function handleListClick(e) {
  const toggle = e.target.closest('.project-toggle');
  if (toggle) { toggleExpand(toggle.dataset.pid, toggle); return; }

  // Titles without an external link act as the expand/collapse control too
  const title = e.target.closest('.project-title-text');
  if (title && title.dataset.pid) {
    const btn = document.querySelector(`.project-toggle[data-pid="${title.dataset.pid}"]`);
    if (btn) toggleExpand(title.dataset.pid, btn);
    return;
  }

  const btn = e.target.closest('.carousel-btn');
  if (btn) { slide(btn.dataset.pid, btn.dataset.dir); return; }

  const slideEl = e.target.closest('.carousel-slide');
  if (slideEl && slideEl.dataset.pid) {
    openLightbox(slideEl.dataset.pid, parseInt(slideEl.dataset.index, 10), slideEl);
  }
}

/* ─────────────────────────────────────────
   Expand / Collapse
   ───────────────────────────────────────── */
const expandTimers = new WeakMap();

function toggleExpand(pid, toggleEl) {
  const panel = document.getElementById(`expand-${pid}`);
  if (!panel) return;

  const open = !panel.classList.contains('open');

  // height:auto can't be transitioned, so pin the current px height,
  // flip the class, then animate to the measured target. scrollHeight
  // reports the full content height even while the panel is clipped.
  panel.style.height = `${panel.offsetHeight}px`;
  panel.classList.toggle('open', open);
  void panel.offsetHeight; // force the start value to stick

  panel.style.height = open ? `${panel.scrollHeight}px` : '0px';

  clearTimeout(expandTimers.get(panel));
  expandTimers.set(panel, setTimeout(() => {
    // Hand sizing back to CSS so the panel can reflow with the viewport
    panel.style.height = '';
  }, 520));

  toggleEl.classList.toggle('is-open', open);
  toggleEl.setAttribute('aria-expanded', String(open));
  toggleEl.setAttribute(
    'aria-label',
    `${open ? 'Collapse' : 'Expand'} ${toggleEl.getAttribute('aria-label').replace(/^(Collapse|Expand) /, '')}`
  );
}

/* ─────────────────────────────────────────
   Lightbox
   ───────────────────────────────────────── */
function openLightbox(pid, startIndex, opener) {
  let proj = null;
  for (const cat in PROJECTS) {
    proj = PROJECTS[cat].find(p => p.id === pid);
    if (proj) break;
  }
  if (!proj || !proj.media || proj.media.length === 0) return;

  lightboxData = proj.media;
  lightboxIndex = startIndex;
  lightboxOpener = opener || null;

  renderLightboxSlide();

  const lb = document.getElementById('lightbox');
  if (!lb) return;

  lb.classList.toggle('is-single', lightboxData.length <= 1);
  lb.classList.remove('hidden');
  lb.setAttribute('aria-hidden', 'false');

  const close = document.getElementById('lightbox-close');
  if (close) close.focus({ preventScroll: true });
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb || lb.classList.contains('hidden')) return;

  lb.classList.add('hidden');
  lb.setAttribute('aria-hidden', 'true');
  // clear media so videos and embeds stop playing
  document.getElementById('lightbox-content').innerHTML = '';

  if (lightboxOpener && document.contains(lightboxOpener)) {
    lightboxOpener.focus({ preventScroll: true });
  }
  lightboxOpener = null;
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
    if (m.url.startsWith('images/') || m.url.endsWith('.mp4') || m.url.endsWith('.webm')) {
      content.innerHTML = `<video src="${m.url}" style="max-width:100%; max-height:100%;" controls autoplay loop playsinline></video>`;
    } else {
      const embedUrl = formatEmbedUrl(m.url);
      content.innerHTML = `<iframe src="${embedUrl}" style="width:100%;height:100%;border:none;" title="Media ${lightboxIndex + 1}" allowfullscreen></iframe>`;
    }
  } else {
    content.innerHTML = `<img src="${m.url}" alt="Media ${lightboxIndex + 1} of ${lightboxData.length}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
  }

  if (counter) counter.textContent = `${pad(lightboxIndex + 1)} / ${pad(lightboxData.length)}`;
}

function initLightboxGestures() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  // Clicking the backdrop (but not the media or the buttons) closes
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.id === 'lightbox-content') closeLightbox();
  });

  let startX = 0;
  let startY = 0;
  let tracking = false;

  lb.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  lb.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) prevLightbox();
    else nextLightbox();
  });
}

/**
 * Automatically converts watch URLs to embed URLs for YT and Vimeo
 */
function formatEmbedUrl(url) {
  if (url.includes('youtube.com/watch?v=')) {
    return url.replace('watch?v=', 'embed/');
  }
  if (url.includes('youtube.com/shorts/')) {
    return url.replace('shorts/', 'embed/');
  }
  if (url.includes('youtu.be/')) {
    return url.replace('youtu.be/', 'youtube.com/embed/');
  }
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const id = url.split('/').pop().split('?')[0];
    return `https://player.vimeo.com/video/${id}`;
  }
  return url;
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
  if (btn) {
    btn.textContent = theme === 'dark' ? '○' : '●';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
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
    return;
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
  initLightboxGestures();

  // Apply Favicon
  if (SITE_CONFIG.favicon) {
    const tag = document.getElementById('favicon-tag');
    if (tag) tag.href = SITE_CONFIG.favicon;
  }

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

  document.querySelectorAll('.view:not(#view-main)').forEach(observeReveals);
}

document.addEventListener('DOMContentLoaded', init);
