import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('TwitchAuth', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    delete window.TwitchAuth;
    vi.restoreAllMocks();
    vi.resetModules();
    await import('../shared/twitch-auth.js');
  });

  afterEach(() => {
    delete window.TwitchAuth;
  });

  it('exposes TwitchAuth on window', () => {
    expect(window.TwitchAuth).toBeDefined();
    expect(typeof window.TwitchAuth.login).toBe('function');
    expect(typeof window.TwitchAuth.handleCallback).toBe('function');
    expect(typeof window.TwitchAuth.refreshToken).toBe('function');
    expect(typeof window.TwitchAuth.tryRestore).toBe('function');
    expect(typeof window.TwitchAuth.getToken).toBe('function');
    expect(typeof window.TwitchAuth.getUsername).toBe('function');
    expect(typeof window.TwitchAuth.isLoggedIn).toBe('function');
    expect(typeof window.TwitchAuth.logout).toBe('function');
  });

  describe('getToken', () => {
    it('returns empty string when no token stored', () => {
      expect(window.TwitchAuth.getToken()).toBe('');
    });

    it('returns token from sessionStorage', () => {
      sessionStorage.setItem('Twitch_OAuthToken', 'test-token-123');
      expect(window.TwitchAuth.getToken()).toBe('test-token-123');
    });
  });

  describe('getUsername', () => {
    it('returns empty string when no username stored', () => {
      expect(window.TwitchAuth.getUsername()).toBe('');
    });

    it('returns username from sessionStorage first', () => {
      sessionStorage.setItem('Twitch_OAuthUsername', 'session-user');
      localStorage.setItem('Twitch_OAuthUsername', 'local-user');
      expect(window.TwitchAuth.getUsername()).toBe('session-user');
    });

    it('falls back to localStorage when sessionStorage is empty', () => {
      localStorage.setItem('Twitch_OAuthUsername', 'local-user');
      expect(window.TwitchAuth.getUsername()).toBe('local-user');
    });
  });

  describe('isLoggedIn', () => {
    it('returns false when no session', () => {
      expect(window.TwitchAuth.isLoggedIn()).toBe(false);
    });

    it('returns true when token exists in sessionStorage', () => {
      sessionStorage.setItem('Twitch_OAuthToken', 'some-token');
      expect(window.TwitchAuth.isLoggedIn()).toBe(true);
    });

    it('returns true when session_id exists in localStorage', () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'some-session');
      expect(window.TwitchAuth.isLoggedIn()).toBe(true);
    });
  });

  describe('login', () => {
    let assignedUrl;

    beforeEach(() => {
      assignedUrl = null;
      const originalLocation = window.location;
      delete window.location;
      window.location = {
        ...originalLocation,
        href: 'https://marsantony.github.io/some-page/',
        set href(url) {
          assignedUrl = url;
        },
        get href() {
          return 'https://marsantony.github.io/some-page/';
        },
      };

      vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i + 10;
        }
        return arr;
      });
    });

    it('stores state in sessionStorage', () => {
      window.TwitchAuth.login('test-client-id');
      expect(sessionStorage.getItem('Twitch_OAuthState')).toBeTruthy();
    });

    it('stores return URL in sessionStorage', () => {
      window.TwitchAuth.login('test-client-id');
      expect(sessionStorage.getItem('Twitch_OAuthReturnUrl')).toBe(
        'https://marsantony.github.io/some-page/'
      );
    });

    it('constructs correct Twitch OAuth URL with default scopes', () => {
      window.TwitchAuth.login('test-client-id');
      expect(assignedUrl).toContain('https://id.twitch.tv/oauth2/authorize');
      expect(assignedUrl).toContain('client_id=test-client-id');
      expect(assignedUrl).toContain('response_type=code');
      expect(assignedUrl).toContain('scope=chat:read+chat:edit');
    });

    it('constructs correct URL with custom scopes', () => {
      window.TwitchAuth.login('test-client-id', ['user:read:email', 'bits:read']);
      expect(assignedUrl).toContain('scope=user:read:email+bits:read');
    });

    it('includes redirect_uri in the URL', () => {
      window.TwitchAuth.login('test-client-id');
      expect(assignedUrl).toContain('redirect_uri=');
    });
  });

  describe('handleCallback', () => {
    beforeEach(() => {
      const originalLocation = window.location;
      delete window.location;
      window.location = {
        ...originalLocation,
        search: '',
        pathname: '/auth/',
      };

      vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    });

    it('returns false when no code in URL', async () => {
      window.location.search = '';
      const result = await window.TwitchAuth.handleCallback();
      expect(result).toBe(false);
    });

    it('rejects on state mismatch', async () => {
      window.location.search = '?code=abc&state=wrong-state';
      sessionStorage.setItem('Twitch_OAuthState', 'correct-state');

      await expect(window.TwitchAuth.handleCallback()).rejects.toThrow('State mismatch');
    });

    it('clears state from sessionStorage on mismatch', async () => {
      window.location.search = '?code=abc&state=wrong-state';
      sessionStorage.setItem('Twitch_OAuthState', 'correct-state');

      try {
        await window.TwitchAuth.handleCallback();
      } catch {
        // expected
      }
      expect(sessionStorage.getItem('Twitch_OAuthState')).toBeNull();
    });

    it('exchanges code for token via fetch POST', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      sessionStorage.setItem('Twitch_OAuthReturnUrl', 'https://marsantony.github.io/app/');
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-token',
              username: 'testuser',
              session_id: 'sess-123',
            }),
        })
      );

      const result = await window.TwitchAuth.handleCallback();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/token'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result.token).toBe('new-token');
      expect(result.username).toBe('testuser');
      expect(result.returnUrl).toBe('https://marsantony.github.io/app/');
    });

    it('stores token and username on success', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-token',
              username: 'testuser',
              session_id: 'sess-123',
            }),
        })
      );

      await window.TwitchAuth.handleCallback();

      expect(sessionStorage.getItem('Twitch_OAuthToken')).toBe('new-token');
      expect(sessionStorage.getItem('Twitch_OAuthUsername')).toBe('testuser');
      expect(localStorage.getItem('Twitch_OAuthUsername')).toBe('testuser');
      expect(sessionStorage.getItem('Twitch_OAuthSessionId')).toBe('sess-123');
    });

    it('stores session_id in localStorage when rememberMe is set', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      sessionStorage.setItem('Twitch_OAuthRemember', '1');
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'new-token',
              username: 'testuser',
              session_id: 'sess-123',
            }),
        })
      );

      await window.TwitchAuth.handleCallback();

      expect(localStorage.getItem('Twitch_OAuthSessionId')).toBe('sess-123');
      expect(sessionStorage.getItem('Twitch_OAuthSessionId')).toBeNull();
    });

    it('cleans URL params with history.replaceState', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'tk', session_id: 's1' }),
        })
      );

      await window.TwitchAuth.handleCallback();

      expect(history.replaceState).toHaveBeenCalledWith(null, '', '/auth/');
    });

    it('clears return URL from sessionStorage after use', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      sessionStorage.setItem('Twitch_OAuthReturnUrl', 'https://example.com/return');
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'tk', session_id: 's1' }),
        })
      );

      await window.TwitchAuth.handleCallback();
      expect(sessionStorage.getItem('Twitch_OAuthReturnUrl')).toBeNull();
    });

    it('handles response without username', async () => {
      const mockState = 'matching-state';
      sessionStorage.setItem('Twitch_OAuthState', mockState);
      window.location.search = `?code=auth-code-123&state=${mockState}`;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'tk' }),
        })
      );

      const result = await window.TwitchAuth.handleCallback();
      expect(result.username).toBe('');
      expect(sessionStorage.getItem('Twitch_OAuthUsername')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('rejects when no session_id', async () => {
      await expect(window.TwitchAuth.refreshToken()).rejects.toThrow('No session');
    });

    it('calls /refresh endpoint with session_id', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-abc');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'refreshed-token' }),
        })
      );

      await window.TwitchAuth.refreshToken();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/refresh'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ session_id: 'sess-abc' }),
        })
      );
    });

    it('updates sessionStorage on success', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-abc');
      localStorage.setItem('Twitch_OAuthUsername', 'myuser');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'refreshed-token' }),
        })
      );

      const result = await window.TwitchAuth.refreshToken();

      expect(sessionStorage.getItem('Twitch_OAuthToken')).toBe('refreshed-token');
      expect(sessionStorage.getItem('Twitch_OAuthUsername')).toBe('myuser');
      expect(result.token).toBe('refreshed-token');
      expect(result.username).toBe('myuser');
    });

    it('clears session_id on 401 response', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-abc');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        })
      );

      await expect(window.TwitchAuth.refreshToken()).rejects.toThrow();
      expect(localStorage.getItem('Twitch_OAuthSessionId')).toBeNull();
    });
  });

  describe('tryRestore', () => {
    it('returns cached token if in sessionStorage', async () => {
      sessionStorage.setItem('Twitch_OAuthToken', 'cached-token');
      sessionStorage.setItem('Twitch_OAuthUsername', 'cached-user');

      const result = await window.TwitchAuth.tryRestore();
      expect(result.token).toBe('cached-token');
      expect(result.username).toBe('cached-user');
    });

    it('attempts refresh if session_id exists but no token', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-xyz');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ access_token: 'restored-token' }),
        })
      );

      const result = await window.TwitchAuth.tryRestore();
      expect(result.token).toBe('restored-token');
      expect(fetch).toHaveBeenCalled();
    });

    it('returns false if no session at all', async () => {
      const result = await window.TwitchAuth.tryRestore();
      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears all storage items', async () => {
      sessionStorage.setItem('Twitch_OAuthToken', 'tk');
      sessionStorage.setItem('Twitch_OAuthUsername', 'user');
      localStorage.setItem('Twitch_OAuthSessionId', 'sess');
      localStorage.setItem('Twitch_OAuthUsername', 'user');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true })
      );

      await window.TwitchAuth.logout();

      expect(sessionStorage.getItem('Twitch_OAuthToken')).toBeNull();
      expect(sessionStorage.getItem('Twitch_OAuthUsername')).toBeNull();
      expect(localStorage.getItem('Twitch_OAuthSessionId')).toBeNull();
      expect(localStorage.getItem('Twitch_OAuthUsername')).toBeNull();
    });

    it('calls /logout endpoint if session_id exists', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-to-logout');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true })
      );

      await window.TwitchAuth.logout();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ session_id: 'sess-to-logout' }),
        })
      );
    });

    it('resolves without calling fetch if no session_id', async () => {
      vi.stubGlobal('fetch', vi.fn());

      await window.TwitchAuth.logout();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('resolves even if /logout fetch fails', async () => {
      localStorage.setItem('Twitch_OAuthSessionId', 'sess-fail');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      await expect(window.TwitchAuth.logout()).resolves.toBeUndefined();
    });
  });

  describe('exposed constants', () => {
    it('exposes expected key constants', () => {
      expect(window.TwitchAuth.KEY_TOKEN).toBe('Twitch_OAuthToken');
      expect(window.TwitchAuth.KEY_USERNAME).toBe('Twitch_OAuthUsername');
      expect(window.TwitchAuth.KEY_STATE).toBe('Twitch_OAuthState');
      expect(window.TwitchAuth.KEY_RETURN_URL).toBe('Twitch_OAuthReturnUrl');
      expect(window.TwitchAuth.KEY_SESSION_ID).toBe('Twitch_OAuthSessionId');
    });

    it('exposes REDIRECT_URI', () => {
      expect(window.TwitchAuth.REDIRECT_URI).toContain('/auth/');
    });

    it('exposes WORKER_URL', () => {
      expect(window.TwitchAuth.WORKER_URL).toBeTruthy();
    });
  });
});
