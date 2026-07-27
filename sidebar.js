// StryK Sidebar — clean, no body.overflow, no dynamic injection
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.sidebar');
    var burger  = document.getElementById('sidebarHamburger');
    var closeBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar || !burger) return;

    sidebar.id = 'appSidebar';

    // Create overlay via JS (lightweight)
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
      burger.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      // NO body overflow:hidden — causes stuck scroll bug
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      // NO body overflow reset needed
    }

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeSidebar();
      });
    }

    overlay.addEventListener('click', closeSidebar);

    // Close sidebar links on mobile
    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 860) closeSidebar();
      });
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // Auto-close on desktop resize
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeSidebar();
    });
  });
})();
