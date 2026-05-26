/* ═══════════════════════════════════════════
   LUMIÈRE CLINIC — ScrollCanvas Engine + UI
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Config ──
  const TOTAL_FRAMES = 560;
  const PAGE_COUNT = 6;
  const LERP = 0.02;
  const CONCURRENCY = 48;
  const isMobile = innerWidth < 768;
  const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

  // ── Elements ──
  const canvas = document.getElementById('gl-canvas');
  const ctx = canvas.getContext('2d');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const loaderPct = document.getElementById('loader-pct');
  const navbar = document.getElementById('navbar');
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('nav-drawer');
  const scrim = document.getElementById('nav-scrim');
  const drawerClose = document.getElementById('drawer-close');
  const pages = Array.from(document.querySelectorAll('.page'));
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const drawerLinks = Array.from(document.querySelectorAll('.drawer-link'));

  // ── State ──
  const frames = new Array(TOTAL_FRAMES);
  let loaded = 0;
  let isReady = false;
  let currentFrame = 0;
  let targetFrame = 0;

  // ── Canvas Sizing ──
  function resizeCanvas() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ── Frame Loader ──
  function framePath(i) {
    const n = String(i + 1).padStart(6, '0');
    return FRAME_DIR + '/frame_' + n + '.webp';
  }

  async function loadFrame(idx) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { frames[idx] = img; loaded++; updateLoader(); resolve(); };
      img.onerror = () => { loaded++; updateLoader(); resolve(); };
      img.src = framePath(idx);
    });
  }

  function updateLoader() {
    const pct = Math.min(100, Math.round((loaded / TOTAL_FRAMES) * 100));
    loaderFill.style.width = pct + '%';
    loaderPct.textContent = pct + '%';
  }

  async function loadAllFrames() {
    const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
    async function worker() {
      while (queue.length > 0) {
        const idx = queue.shift();
        await loadFrame(idx);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  }

  // ── Draw Frame (cover fit) ──
  function drawFrame(idx) {
    const img = frames[idx];
    if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }

  // ── Scroll Handler ──
  window.addEventListener('scroll', () => {
    if (!isReady) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    targetFrame = progress * (TOTAL_FRAMES - 1);
  }, { passive: true });

  // ── rAF Loop ──
  function animate() {
    requestAnimationFrame(animate);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) {
      drawFrame(Math.round(currentFrame));
    }
  }
  animate();

  // ── IntersectionObserver ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = pages.indexOf(entry.target);
        pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
        navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
        drawerLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
      }
    });
  }, { root: null, rootMargin: '-40% 0px -40% 0px' });

  pages.forEach(p => observer.observe(p));

  // ── Smooth Scroll Navigation ──
  function scrollToSection(idx) {
    const target = pages[idx];
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }

  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.scroll);
      scrollToSection(idx);
      // Close drawer if open
      if (drawer && !drawer.hidden) {
        drawer.hidden = true;
        scrim.hidden = true;
      }
    });
  });

  // ── Mobile Drawer ──
  burger.addEventListener('click', () => {
    drawer.hidden = false;
    scrim.hidden = false;
  });
  drawerClose.addEventListener('click', () => {
    drawer.hidden = true;
    scrim.hidden = true;
  });
  scrim.addEventListener('click', () => {
    drawer.hidden = true;
    scrim.hidden = true;
  });

  // ── Navbar scroll effect ──
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // ── Contact Form ──
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit');
      btn.textContent = '✓ Заявка отправлена!';
      btn.style.background = 'linear-gradient(135deg, #7abfb5, #5a9f95)';
      setTimeout(() => {
        btn.textContent = 'להירשם бесплатно';
        btn.style.background = '';
        form.reset();
      }, 3000);
    });
  }

  // ── Init ──
  async function init() {
    // Draw a gradient background while loading
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0a0a12');
    grad.addColorStop(0.5, '#12101e');
    grad.addColorStop(1, '#0a0a12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await loadAllFrames();

    isReady = true;

    // If no frames loaded (no video yet), show static gradient
    if (!frames[0]) {
      isReady = false;
      // Draw elegant animated gradient as fallback
      drawFallbackBg();
    }

    // Activate first section
    pages[0].classList.add('is-active');

    // Hide loader
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 700);
  }

  // ── Fallback animated background ──
  let fallbackHue = 0;
  function drawFallbackBg() {
    fallbackHue += 0.15;
    const cw = canvas.width, ch = canvas.height;

    const grad = ctx.createRadialGradient(cw * 0.3, ch * 0.3, 0, cw * 0.5, ch * 0.5, cw * 0.8);
    grad.addColorStop(0, `hsla(${(fallbackHue + 30) % 360}, 15%, 12%, 1)`);
    grad.addColorStop(0.4, `hsla(${(fallbackHue + 10) % 360}, 12%, 8%, 1)`);
    grad.addColorStop(1, '#0a0a12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle gold particles
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(fallbackHue * 0.01 + i * 1.7) * 0.4 + 0.5) * cw;
      const y = (Math.cos(fallbackHue * 0.008 + i * 2.3) * 0.4 + 0.5) * ch;
      const r = 1 + Math.sin(fallbackHue * 0.02 + i) * 0.8;
      const alpha = 0.08 + Math.sin(fallbackHue * 0.015 + i * 0.5) * 0.06;
      ctx.beginPath();
      ctx.arc(x, y, r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201, 169, 110, ${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(drawFallbackBg);
  }

  init();
})();
