// StryK — Global Animations
(function() {
  'use strict';

  // ── Intersection Observer for scroll animations ──────────────────────
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up, .fade-in').forEach(el => {
      observer.observe(el);
    });
  }

  // ── Count-up animation for stat values ──────────────────────────────
  function countUp(el) {
    const raw = el.textContent.trim();
    // Parse numeric value (handles ₹, k, %, +)
    const prefix = raw.match(/^[₹]?/)[0] || '';
    const suffix = raw.match(/[k%+]?$/)[0] || '';
    const num = parseFloat(raw.replace(/[₹k%+,↑↓]/g, '')) || 0;
    const isK = raw.includes('k');
    const target = isK ? num * 1000 : num;
    if (target === 0) return;

    const duration = 900;
    const start = performance.now();
    const startVal = 0;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(startVal + (target - startVal) * ease);

      if (isK) {
        el.textContent = prefix + (current / 1000).toFixed(current >= 1000 ? 0 : 1) + 'k' + suffix.replace('k','');
      } else {
        el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      }

      if (progress < 1) requestAnimationFrame(step);
      else {
        el.textContent = raw; // restore original
        el.classList.add('count-done');
      }
    }
    requestAnimationFrame(step);
  }

  function initCountUps() {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const val = entry.target.querySelector('.stat-value');
          if (val) countUp(val);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-card').forEach(card => {
      statObserver.observe(card);
    });
  }

  // ── Auto add fade-up to sections ────────────────────────────────────
  function addFadeClasses() {
    // Section titles and labels
    document.querySelectorAll('.section-title, .section-label').forEach((el, i) => {
      if (!el.closest('.navbar')) {
        el.classList.add('fade-up');
      }
    });

    // Cards in grids
    document.querySelectorAll(
      '.cat-card, .step-card, .level-card, .client-feat, .card'
    ).forEach((el, i) => {
      if (!el.classList.contains('fade-up') && !el.closest('.navbar')) {
        el.classList.add('fade-up', 'delay-' + Math.min((i % 6) + 1, 6));
      }
    });
  }

  // ── Navbar scroll effect ─────────────────────────────────────────────
  function initNavbarScroll() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    let lastY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 80) {
        nav.style.borderBottomColor = 'rgba(245,158,11,0.15)';
      } else {
        nav.style.borderBottomColor = '';
      }
      lastY = y;
    }, { passive: true });
  }

  // ── Button ripple effect ─────────────────────────────────────────────
  function initRipple() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement('span');
        ripple.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:4px;height:4px;border-radius:50%;
          background:rgba(255,255,255,0.3);
          transform:scale(0);pointer-events:none;
          animation:rippleAnim 0.5s ease-out forwards;
        `;
        if (getComputedStyle(this).position === 'static') {
          this.style.position = 'relative';
        }
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Add ripple keyframe
    if (!document.getElementById('rippleStyle')) {
      const s = document.createElement('style');
      s.id = 'rippleStyle';
      s.textContent = '@keyframes rippleAnim{to{transform:scale(60);opacity:0}}';
      document.head.appendChild(s);
    }
  }

  // ── Accent underline on hero ─────────────────────────────────────────
  function initHeroUnderline() {
    const hero = document.querySelector('.hero');
    if (hero) {
      setTimeout(() => hero.classList.add('accent-underline-ready'), 200);
    }
  }

  // ── Page transition link clicks ──────────────────────────────────────
  function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html') && !href.startsWith('http')) {
        link.addEventListener('click', function(e) {
          // tiny delay for visual feedback
          e.preventDefault();
          document.body.style.opacity = '0.85';
          document.body.style.transition = 'opacity 0.15s ease';
          setTimeout(() => { window.location.href = href; }, 120);
        });
      }
    });
  }

  // ── Init all ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    addFadeClasses();
    initScrollAnimations();
    initCountUps();
    initNavbarScroll();
    initRipple();
    initHeroUnderline();
    initPageTransitions();

    // Fade in page
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.25s ease';
      document.body.style.opacity = '1';
    });
  });
})();
