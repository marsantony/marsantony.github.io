(function () {
  var BASE = 'https://marsantony.github.io/shared';
  var isHome = location.pathname === '/' || location.pathname === '/index.html';

  // Load CSS if not present
  function loadCSS(href) {
    if (!document.querySelector('link[href*="' + href.split('/').pop() + '"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  loadCSS(BASE + '/nav.css');
  loadCSS('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

  // Fetch and inject nav
  fetch(BASE + '/nav.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
      document.body.insertAdjacentHTML('afterbegin', html);

      var nav = document.querySelector('.site-nav');
      if (!nav) return;

      // Non-home pages: remove section links, keep brand only
      if (!isHome) {
        var links = nav.querySelector('.nav-links');
        var toggle = nav.querySelector('.nav-toggle');
        if (links) links.remove();
        if (toggle) toggle.remove();
        return;
      }

      // Home page: smooth scroll + mobile toggle
      var links = nav.querySelectorAll('.nav-links a');
      links.forEach(function (a) {
        a.addEventListener('click', function (e) {
          var target = document.querySelector(a.getAttribute('href'));
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
            nav.querySelector('.nav-links').classList.remove('open');
          }
        });
      });

      var toggle = nav.querySelector('.nav-toggle');
      if (toggle) {
        toggle.addEventListener('click', function () {
          nav.querySelector('.nav-links').classList.toggle('open');
        });
      }
    });

  // Fetch and inject footer
  fetch(BASE + '/footer.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
      document.body.insertAdjacentHTML('beforeend', html);
    });

  // Load analytics monitor
  (function () {
    var MONITOR_ENDPOINT = 'https://site-dashboard-api.marsantonymars1017.workers.dev';
    var s = document.createElement('script');
    s.src = MONITOR_ENDPOINT + '/monitor.js';
    s.dataset.endpoint = MONITOR_ENDPOINT;
    // Derive project name from URL path (e.g. /bot-cmd-sync/ -> bot-cmd-sync)
    var pathParts = location.pathname.split('/').filter(Boolean);
    s.dataset.project = pathParts[0] || 'marsantony.github.io';
    s.defer = true;
    document.head.appendChild(s);
  })();
})();
