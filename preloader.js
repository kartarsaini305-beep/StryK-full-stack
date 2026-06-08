(function () {
  // index.html = dramatic first-visit animation (2s)
  // all other pages = quick logo flash (0.8s)
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

  function dismiss() {
    pl.classList.add('exit');
    document.body.classList.remove('preloading');
    document.body.classList.add('page-ready');
    setTimeout(function () { pl.style.display = 'none'; }, 600);
  }

  var minTime = isIndex ? 1900 : 700;
  var start = Date.now();

  window.addEventListener('load', function () {
    var elapsed = Date.now() - start;
    setTimeout(dismiss, Math.max(0, minTime - elapsed));
  });

  setTimeout(dismiss, isIndex ? 3200 : 1400);
})();
