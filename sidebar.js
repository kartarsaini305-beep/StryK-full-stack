// Shared sidebar hamburger for all inner pages
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Create overlay
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Create hamburger button and inject into navbar
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;

    var burger = document.createElement('button');
    burger.className = 'hamburger';
    burger.setAttribute('aria-label', 'Toggle menu');
    burger.innerHTML = '<span></span><span></span><span></span>';

    // Insert hamburger as first child of navbar nav, or after logo
    var navRight = navbar.querySelector('nav');
    if (navRight) {
      navRight.insertBefore(burger, navRight.firstChild);
    } else {
      navbar.appendChild(burger);
    }

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
      burger.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
      burger.classList.remove('open');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    overlay.addEventListener('click', closeSidebar);

    // Close on nav link click (mobile)
    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeSidebar);
    });

    // Close on resize back to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeSidebar();
    });
  });
})();
