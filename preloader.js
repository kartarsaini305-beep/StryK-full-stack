// StryK — Preloader (Fixed: no stuck preloading class, guaranteed dismiss)
(function () {
  var isIndex = window.location.pathname === '/' ||
                window.location.pathname.endsWith('index.html') ||
                window.location.pathname.endsWith('/');

  var pl = document.createElement('div');
  pl.id = 'preloader';
  if (!isIndex) pl.classList.add('quick-load');

  pl.innerHTML =
    '<div class="pl-logo-wrap">' +
      '<img class="pl-logo" src="stryk_logo_tagline__1_.png" alt="StryK"' +
        ' onerror="this.style.display=\'none\';document.querySelector(\'.pl-logo-text\').style.display=\'block\'">' +
      '<div class="pl-logo-text" style="display:none">Str<span>y</span>K</div>' +
    '</div>' +
    '<div class="pl-progress-wrap"><div class="pl-progress-bar"></div></div>';

  document.body.classList.add('preloading');
  document.body.insertBefore(pl, document.body.firstChild);

  var dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    pl.classList.add('exit');
    document.body.classList.remove('preloading');
    document.body.classList.add('page-ready');
    // Force opacity visible immediately as fallback
    document.body.style.opacity = '';
    setTimeout(function () {
      pl.style.display = 'none';
      pl.remove();
    }, 600);
  }

  var minTime = isIndex ? 1900 : 500; // faster on inner pages: 500ms max
  var start = Date.now();

  window.addEventListener('load', function () {
    var elapsed = Date.now() - start;
    setTimeout(dismiss, Math.max(0, minTime - elapsed));
  });

  // Hard fallback: ALWAYS dismiss — never leave page stuck
  setTimeout(dismiss, isIndex ? 3000 : 1200);

  // Extra safety: if DOMContentLoaded fires and we're an inner page, dismiss fast
  if (!isIndex) {
    document.addEventListener('DOMContentLoaded', function() {
      var elapsed = Date.now() - start;
      setTimeout(dismiss, Math.max(0, 400 - elapsed));
    });
  }
})();
