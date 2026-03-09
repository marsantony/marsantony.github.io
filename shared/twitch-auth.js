(function () {
  var REDIRECT_URI = 'https://marsantony.github.io/auth/';
  var WORKER_URL = 'https://twitch-oauth-proxy.marsantonymars1017.workers.dev';
  var KEY_TOKEN = 'Twitch_OAuthToken';
  var KEY_USERNAME = 'Twitch_OAuthUsername';
  var KEY_STATE = 'Twitch_OAuthState';
  var KEY_RETURN_URL = 'Twitch_OAuthReturnUrl';
  var KEY_SESSION_ID = 'Twitch_OAuthSessionId';
  var KEY_REMEMBER = 'Twitch_OAuthRemember';

  function postJson(path, body, errorMsg, onError) {
    return fetch(WORKER_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) {
        if (onError) onError(res);
        return res.json().then(function (err) {
          throw new Error(err.error || errorMsg);
        });
      }
      return res.json();
    });
  }

  function login(clientId, scopes, options) {
    var rememberMe = options && options.rememberMe;
    sessionStorage.setItem(KEY_REMEMBER, rememberMe ? '1' : '0');

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

    var rememberMe = sessionStorage.getItem(KEY_REMEMBER) === '1';
    sessionStorage.removeItem(KEY_REMEMBER);

    return postJson('/token', { code: code, redirect_uri: REDIRECT_URI }, 'Token exchange failed')
      .then(function (data) {
        sessionStorage.setItem(KEY_TOKEN, data.access_token);
        if (data.username) {
          sessionStorage.setItem(KEY_USERNAME, data.username);
          localStorage.setItem(KEY_USERNAME, data.username);
        }
        if (data.session_id) {
          var sessionIdStorage = rememberMe ? localStorage : sessionStorage;
          sessionIdStorage.setItem(KEY_SESSION_ID, data.session_id);
        }

        var returnUrl = sessionStorage.getItem(KEY_RETURN_URL);
        sessionStorage.removeItem(KEY_RETURN_URL);

        return { token: data.access_token, username: data.username || '', returnUrl: returnUrl };
      });
  }

  function getSessionId() {
    return localStorage.getItem(KEY_SESSION_ID) || sessionStorage.getItem(KEY_SESSION_ID) || '';
  }

  function clearSessionId() {
    localStorage.removeItem(KEY_SESSION_ID);
    sessionStorage.removeItem(KEY_SESSION_ID);
  }

  function refreshToken() {
    var sessionId = getSessionId();
    if (!sessionId) return Promise.reject(new Error('No session'));

    return postJson('/refresh', { session_id: sessionId }, 'Refresh failed', function (res) {
        if (res.status === 401) clearSessionId();
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

    var sessionId = getSessionId();
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
    return !!sessionStorage.getItem(KEY_TOKEN) || !!getSessionId();
  }

  function logout() {
    var sessionId = getSessionId();

    sessionStorage.removeItem(KEY_TOKEN);
    sessionStorage.removeItem(KEY_USERNAME);
    clearSessionId();
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

  var dialogInjected = false;

  function showLoginDialog(clientId, scopes) {
    if (!dialogInjected) {
      var style = document.createElement('style');
      style.textContent =
        '.twauth-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.35);' +
        'display:flex;align-items:center;justify-content:center;z-index:1000;' +
        'opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s,visibility .25s}' +
        '.twauth-overlay.active{opacity:1;visibility:visible;pointer-events:auto;backdrop-filter:blur(6px)}' +
        '.twauth-dialog{width:360px;max-width:calc(100vw - 2rem);border-radius:14px;' +
        'background:var(--bg);box-shadow:var(--neu-raised);padding:1.5rem;' +
        'transform:translateY(8px);transition:transform .25s}' +
        '.twauth-overlay.active .twauth-dialog{transform:translateY(0)}' +
        '.twauth-dialog h3{font-size:1rem;font-weight:600;color:var(--text-primary);margin-bottom:.5rem}' +
        '.twauth-dialog p{font-size:.85rem;color:var(--text-secondary);margin-bottom:1.25rem;line-height:1.6}' +
        '.twauth-checkbox{display:flex;align-items:center;gap:.6rem;margin-bottom:1.25rem;' +
        'padding:.6rem .75rem;border-radius:10px;background:var(--bg);' +
        'box-shadow:var(--neu-pressed);cursor:pointer}' +
        '.twauth-checkbox input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0}' +
        '.twauth-checkbox span{font-size:.83rem;color:var(--text-primary);font-weight:500;user-select:none}' +
        '.twauth-actions{display:flex;gap:.75rem;justify-content:flex-end}';
      document.head.appendChild(style);

      var overlay = document.createElement('div');
      overlay.className = 'twauth-overlay';
      overlay.id = 'twauthModal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'twauthTitle');
      overlay.innerHTML =
        '<div class="twauth-dialog">' +
          '<h3 id="twauthTitle">前往 Twitch 授權</h3>' +
          '<p>即將跳轉到 Twitch 進行登入授權，授權後會自動返回本頁面。</p>' +
          '<label class="twauth-checkbox">' +
            '<input type="checkbox" id="twauthRemember">' +
            '<span>記住我的登入狀態</span>' +
          '</label>' +
          '<div class="twauth-actions">' +
            '<button type="button" class="btn" id="twauthCancel">取消</button>' +
            '<button type="button" class="btn btn-primary" id="twauthConfirm">前往授權</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      function close() { overlay.classList.remove('active'); }

      document.getElementById('twauthCancel').addEventListener('click', close);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) close();
      });

      dialogInjected = true;
    }

    var overlay = document.getElementById('twauthModal');
    document.getElementById('twauthRemember').checked = false;
    overlay.classList.add('active');

    var confirmBtn = document.getElementById('twauthConfirm');
    var newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', function () {
      var remember = document.getElementById('twauthRemember').checked;
      login(clientId, scopes, { rememberMe: remember });
    });
  }

  window.TwitchAuth = {
    login: login,
    showLoginDialog: showLoginDialog,
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
    KEY_SESSION_ID: KEY_SESSION_ID,
    KEY_REMEMBER: KEY_REMEMBER
  };
})();
