// StryK — Global Animations (Fixed: no opacity fighting with preloader)
(function() {
  'use strict';

  // ── Intersection Observer for scroll animations ──────────────────────
  function initScrollAnimations() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up, .fade-in').forEach(function(el) {
      observer.observe(el);
    });
  }

  // ── Count-up animation for stat values ──────────────────────────────
  function countUp(el) {
    var raw = el.textContent.trim();
    var prefix = (raw.match(/^[₹]?/) || [''])[0];
    var suffix = (raw.match(/[k%+]?$/) || [''])[0];
    var num = parseFloat(raw.replace(/[₹k%+,↑↓]/g, '')) || 0;
    var isK = raw.includes('k');
    var target = isK ? num * 1000 : num;
    if (target === 0) return;

    var duration = 900;
    var start = performance.now();

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(target * ease);

      if (isK) {
        el.textContent = prefix + (current / 1000).toFixed(current >= 1000 ? 0 : 1) + 'k' + suffix.replace('k','');
      } else {
        el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
      }

      if (progress < 1) requestAnimationFrame(step);
      else {
        el.textContent = raw;
        el.classList.add('count-done');
      }
    }
    requestAnimationFrame(step);
  }

  function initCountUps() {
    var statObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var val = entry.target.querySelector('.stat-value');
          if (val) countUp(val);
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-card').forEach(function(card) {
      statObserver.observe(card);
    });
  }

  // ── Auto add fade-up to sections (public pages only) ───────────────
  function addFadeClasses() {
    // Only animate on public marketing pages, NOT dashboard/inner app pages
    // Dashboard cards are already in viewport — fade-up would leave them invisible
    var isDashboard = !!document.querySelector('.sidebar, .app-layout');
    if (isDashboard) return;

    document.querySelectorAll('.section-title, .section-label').forEach(function(el) {
      if (!el.closest('.navbar')) el.classList.add('fade-up');
    });

    document.querySelectorAll('.cat-card, .step-card, .level-card, .client-feat').forEach(function(el, i) {
      if (!el.classList.contains('fade-up') && !el.closest('.navbar')) {
        el.classList.add('fade-up', 'delay-' + Math.min((i % 6) + 1, 6));
      }
    });
    // Never add fade-up to generic .card on dashboard pages
  }

  // ── Navbar scroll effect ─────────────────────────────────────────────
  function initNavbarScroll() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;
    window.addEventListener('scroll', function() {
      if (window.scrollY > 80) {
        nav.style.borderBottomColor = 'rgba(245,158,11,0.15)';
      } else {
        nav.style.borderBottomColor = '';
      }
    }, { passive: true });
  }

  // ── Button ripple effect ─────────────────────────────────────────────
  function initRipple() {
    document.querySelectorAll('.btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var rect = this.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var ripple = document.createElement('span');
        ripple.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.3);transform:scale(0);pointer-events:none;animation:rippleAnim 0.5s ease-out forwards;';
        if (getComputedStyle(this).position === 'static') this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(function() { ripple.remove(); }, 600);
      });
    });

    if (!document.getElementById('rippleStyle')) {
      var s = document.createElement('style');
      s.id = 'rippleStyle';
      s.textContent = '@keyframes rippleAnim{to{transform:scale(60);opacity:0}}';
      document.head.appendChild(s);
    }
  }

  // ── Accent underline on hero ─────────────────────────────────────────
  function initHeroUnderline() {
    var hero = document.querySelector('.hero');
    if (hero) setTimeout(function() { hero.classList.add('accent-underline-ready'); }, 200);
  }

  // ── Page transition link clicks ──────────────────────────────────────
  // NOTE: Only apply subtle transition, do NOT set opacity:0 on body
  // because preloader already manages page entry visibility
  function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && href.endsWith('.html') && !href.startsWith('http') && !href.startsWith('#')) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var target = href;
          window.location.href = target;
        });
      }
    });
  }

  // ── Init all ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    addFadeClasses();
    initScrollAnimations();
    initCountUps();
    initNavbarScroll();
    initRipple();
    initHeroUnderline();
    initPageTransitions();

    // Body visibility handled by preloader.css — no opacity manipulation here
  });
})();
