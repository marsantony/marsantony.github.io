(function () {
  var REDIRECT_URI = 'https://marsantony.github.io/auth/';
  var WORKER_URL = 'https://twitch-oauth-proxy.marsantonymars1017.workers.dev';
  var KEY_TOKEN = 'Twitch_OAuthToken';
  var KEY_USERNAME = 'Twitch_OAuthUsername';
  var KEY_STATE = 'Twitch_OAuthState';
  var KEY_RETURN_URL = 'Twitch_OAuthReturnUrl';
  var KEY_SESSION_ID = 'Twitch_OAuthSessionId';

  function login(clientId, scopes) {
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    var state = Array.from(arr, function (b) { return b.toString(36); }).join('').substring(0, 22);
    sessionStorage.setItem(KEY_STATE, state);
    sessionStorage.setItem(KEY_RETURN_URL, location.href);

    var scopeStr = (scopes || ['chat:read', 'chat:edit']).join('+');
    var url = 'https://id.twitch.tv/oauth2/authorize'
      + '?client_id=' + encodeURIComponent(clientId)
      + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
      + '&response_type=code'
      + '&scope=' + scopeStr
      + '&state=' + encodeURIComponent(state);

    location.href = url;
  }

  function handleCallback() {
    var params = new URLSearchParams(location.search);
    var code = params.get('code');
    var state = params.get('state');

    if (!code) return Promise.resolve(false);

    var savedState = sessionStorage.getItem(KEY_STATE);
    if (state !== savedState) {
      sessionStorage.removeItem(KEY_STATE);
      return Promise.reject(new Error('State mismatch'));
    }

    sessionStorage.removeItem(KEY_STATE);
    history.replaceState(null, '', location.pathname);

    return fetch(WORKER_URL + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, redirect_uri: REDIRECT_URI }),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (err) {
            throw new Error(err.error || 'Token exchange failed');
          });
        }
        return res.json();
      })
      .then(function (data) {
        sessionStorage.setItem(KEY_TOKEN, data.access_token);
        if (data.username) {
          sessionStorage.setItem(KEY_USERNAME, data.username);
          localStorage.setItem(KEY_USERNAME, data.username);
        }
        if (data.session_id) {
          localStorage.setItem(KEY_SESSION_ID, data.session_id);
        }

        var returnUrl = sessionStorage.getItem(KEY_RETURN_URL);
        sessionStorage.removeItem(KEY_RETURN_URL);

        return { token: data.access_token, username: data.username || '', returnUrl: returnUrl };
      });
  }

  function refreshToken() {
    var sessionId = localStorage.getItem(KEY_SESSION_ID);
    if (!sessionId) return Promise.reject(new Error('No session'));

    return fetch(WORKER_URL + '/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem(KEY_SESSION_ID);
          }
          return res.json().then(function (err) {
            throw new Error(err.error || 'Refresh failed');
          });
        }
        return res.json();
      })
      .then(function (data) {
        sessionStorage.setItem(KEY_TOKEN, data.access_token);
        var username = localStorage.getItem(KEY_USERNAME) || '';
        if (username) sessionStorage.setItem(KEY_USERNAME, username);
        return { token: data.access_token, username: username };
      });
  }

  function tryRestore() {
    var token = sessionStorage.getItem(KEY_TOKEN);
    if (token) return Promise.resolve({ token: token, username: getUsername() });

    var sessionId = localStorage.getItem(KEY_SESSION_ID);
    if (!sessionId) return Promise.resolve(false);

    return refreshToken();
  }

  function getToken() {
    return sessionStorage.getItem(KEY_TOKEN) || '';
  }

  function getUsername() {
    return sessionStorage.getItem(KEY_USERNAME) || localStorage.getItem(KEY_USERNAME) || '';
  }

  function isLoggedIn() {
    return !!sessionStorage.getItem(KEY_TOKEN) || !!localStorage.getItem(KEY_SESSION_ID);
  }

  function logout() {
    var sessionId = localStorage.getItem(KEY_SESSION_ID);

    sessionStorage.removeItem(KEY_TOKEN);
    sessionStorage.removeItem(KEY_USERNAME);
    localStorage.removeItem(KEY_SESSION_ID);
    localStorage.removeItem(KEY_USERNAME);

    if (sessionId) {
      return fetch(WORKER_URL + '/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(function () {});
    }
    return Promise.resolve();
  }

  window.TwitchAuth = {
    login: login,
    handleCallback: handleCallback,
    refreshToken: refreshToken,
    tryRestore: tryRestore,
    getToken: getToken,
    getUsername: getUsername,
    isLoggedIn: isLoggedIn,
    logout: logout,
    REDIRECT_URI: REDIRECT_URI,
    WORKER_URL: WORKER_URL,
    KEY_TOKEN: KEY_TOKEN,
    KEY_USERNAME: KEY_USERNAME,
    KEY_STATE: KEY_STATE,
    KEY_RETURN_URL: KEY_RETURN_URL,
    KEY_SESSION_ID: KEY_SESSION_ID
  };
})();
