import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const NAV_HTML = `<nav class="site-nav">
  <div class="nav-inner">
    <a class="nav-brand" href="/">Mars Liu</a>
    <button class="nav-toggle" aria-label="Toggle navigation">&#9776;</button>
    <ul class="nav-links">
      <li><a href="#skills">Skills</a></li>
      <li><a href="#experience">Experience</a></li>
    </ul>
  </div>
</nav>`;

const FOOTER_HTML = `<footer class="site-footer">
  <div class="site-footer-inner">
    <p>&copy; 2026 Mars Liu</p>
  </div>
</footer>`;

function setupLocation(pathname) {
  const originalLocation = window.location;
  delete window.location;
  window.location = {
    ...originalLocation,
    pathname: pathname,
    href: 'https://marsantony.github.io' + pathname,
  };
}

async function loadSharedJs() {
  vi.resetModules();
  await import('../shared/shared.js');
}

describe('shared.js', () => {
  let fetchMock;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    fetchMock = vi.fn((url) => {
      if (url.includes('nav.html')) {
        return Promise.resolve({
          text: () => Promise.resolve(NAV_HTML),
        });
      }
      if (url.includes('footer.html')) {
        return Promise.resolve({
          text: () => Promise.resolve(FOOTER_HTML),
        });
      }
      return Promise.resolve({
        text: () => Promise.resolve(''),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadCSS', () => {
    it('adds nav.css link element to head', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        expect(links.length).toBeGreaterThanOrEqual(2);
      });

      const navCssLink = document.querySelector('link[href*="nav.css"]');
      expect(navCssLink).not.toBeNull();
      expect(navCssLink.rel).toBe('stylesheet');
    });

    it('adds Font Awesome CSS link to head', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const faLink = document.querySelector('link[href*="font-awesome"]');
        expect(faLink).not.toBeNull();
      });
    });

    it('does not duplicate existing CSS', async () => {
      setupLocation('/');

      const existingLink = document.createElement('link');
      existingLink.rel = 'stylesheet';
      existingLink.href = 'https://marsantony.github.io/shared/nav.css';
      document.head.appendChild(existingLink);

      await loadSharedJs();

      await vi.waitFor(() => {
        const links = document.querySelectorAll('link[href*="nav.css"]');
        expect(links.length).toBe(1);
      });
    });
  });

  describe('nav injection', () => {
    it('fetches nav.html and injects at start of body', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('nav.html')
      );
    });

    it('on home page: keeps nav-links and nav-toggle', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      const links = document.querySelector('.nav-links');
      const toggle = document.querySelector('.nav-toggle');
      expect(links).not.toBeNull();
      expect(toggle).not.toBeNull();
    });

    it('on home page with /index.html: keeps nav-links', async () => {
      setupLocation('/index.html');
      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      const links = document.querySelector('.nav-links');
      expect(links).not.toBeNull();
    });

    it('on non-home page: removes nav-links and nav-toggle', async () => {
      setupLocation('/some-project/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      const links = document.querySelector('.nav-links');
      const toggle = document.querySelector('.nav-toggle');
      expect(links).toBeNull();
      expect(toggle).toBeNull();
    });

    it('on home page: sets up smooth scroll click handlers', async () => {
      setupLocation('/');

      const section = document.createElement('section');
      section.id = 'skills';
      section.scrollIntoView = vi.fn();
      document.body.appendChild(section);

      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      const skillsLink = document.querySelector('.nav-links a[href="#skills"]');
      expect(skillsLink).not.toBeNull();

      const event = new Event('click', { bubbles: true, cancelable: true });
      event.preventDefault = vi.fn();
      skillsLink.dispatchEvent(event);

      expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('on home page: sets up mobile toggle', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const nav = document.querySelector('.site-nav');
        expect(nav).not.toBeNull();
      });

      const toggle = document.querySelector('.nav-toggle');
      const navLinks = document.querySelector('.nav-links');
      expect(toggle).not.toBeNull();

      toggle.click();
      expect(navLinks.classList.contains('open')).toBe(true);

      toggle.click();
      expect(navLinks.classList.contains('open')).toBe(false);
    });
  });

  describe('footer injection', () => {
    it('fetches footer.html and injects at end of body', async () => {
      setupLocation('/');
      await loadSharedJs();

      await vi.waitFor(() => {
        const footer = document.querySelector('.site-footer');
        expect(footer).not.toBeNull();
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('footer.html')
      );
    });
  });

  describe('analytics', () => {
    it('injects analytics script element into head', async () => {
      setupLocation('/');
      await loadSharedJs();

      const script = document.querySelector('script[data-project]');
      expect(script).not.toBeNull();
      expect(script.defer).toBe(true);
    });

    it('derives project name from pathname', async () => {
      setupLocation('/bot-cmd-sync/');
      await loadSharedJs();

      const script = document.querySelector('script[data-project]');
      expect(script).not.toBeNull();
      expect(script.dataset.project).toBe('bot-cmd-sync');
    });

    it('uses default project name for root path', async () => {
      setupLocation('/');
      await loadSharedJs();

      const script = document.querySelector('script[data-project]');
      expect(script).not.toBeNull();
      expect(script.dataset.project).toBe('marsantony.github.io');
    });

    it('sets data-endpoint attribute on script', async () => {
      setupLocation('/');
      await loadSharedJs();

      const script = document.querySelector('script[data-endpoint]');
      expect(script).not.toBeNull();
      expect(script.dataset.endpoint).toBeTruthy();
    });

    it('script src points to monitor.js', async () => {
      setupLocation('/');
      await loadSharedJs();

      const script = document.querySelector('script[data-project]');
      expect(script).not.toBeNull();
      expect(script.src).toContain('monitor.js');
    });
  });
});
