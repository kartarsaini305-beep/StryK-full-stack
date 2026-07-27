// StryK — Mobile Nav for public pages (no body overflow manipulation)
(function() {
  'use strict';
  document.addEventListener('DOMContentLoaded', function() {
    var btn  = document.getElementById('navHamburger');
    var menu = document.getElementById('mobileNavMenu');
    if (!btn || !menu) return;

    function openMenu() {
      menu.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      // NO body overflow:hidden — it gets stuck on navigation
    }
    function closeMenu() {
      menu.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    menu.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', function(e) {
      if (!btn.contains(e.target) && !menu.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 860) closeMenu();
    });
  });
})();
