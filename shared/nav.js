(function () {
  var isHome = location.pathname === '/' || location.pathname === '/index.html';

  var sections = [
    { label: 'Skills', href: '/#skills' },
    { label: 'Experience', href: '/#experience' },
    { label: 'Projects', href: '/#projects' },
    { label: 'Education', href: '/#education' }
  ];

  var nav = document.createElement('nav');
  nav.className = 'site-nav';

  var inner = document.createElement('div');
  inner.className = 'nav-inner';

  var brand = document.createElement('a');
  brand.className = 'nav-brand';
  brand.href = '/';
  brand.textContent = 'Mars Liu';

  inner.appendChild(brand);

  if (isHome) {
    var toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle navigation');
    toggle.innerHTML = '&#9776;';

    var ul = document.createElement('ul');
    ul.className = 'nav-links';

    sections.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = s.href.substring(1);
      a.textContent = s.label;
      a.addEventListener('click', function (e) {
        var target = document.querySelector(s.href.substring(1));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
          ul.classList.remove('open');
        }
      });
      li.appendChild(a);
      ul.appendChild(li);
    });

    toggle.addEventListener('click', function () {
      ul.classList.toggle('open');
    });

    inner.appendChild(toggle);
    inner.appendChild(ul);
  }
  nav.appendChild(inner);

  document.body.insertBefore(nav, document.body.firstChild);

  if (!document.querySelector('link[href*="nav.css"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://marsantony.github.io/shared/nav.css';
    document.head.appendChild(link);
  }
})();
