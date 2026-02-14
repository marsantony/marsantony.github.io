(function () {
  var REDIRECT_URI = 'https://marsantony.github.io/auth/';
  var KEY_TOKEN = 'Twitch_OAuthToken';
  var KEY_USERNAME = 'Twitch_OAuthUsername';
  var KEY_STATE = 'Twitch_OAuthState';
  var KEY_RETURN_URL = 'Twitch_OAuthReturnUrl';

  function login(clientId, scopes) {
    var state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(KEY_STATE, state);
    sessionStorage.setItem(KEY_RETURN_URL, location.href);

    var scopeStr = (scopes || ['chat:read', 'chat:edit']).join('+');
    var url = 'https://id.twitch.tv/oauth2/authorize'
      + '?client_id=' + encodeURIComponent(clientId)
      + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
      + '&response_type=token'
      + '&scope=' + scopeStr
      + '&state=' + encodeURIComponent(state);

    location.href = url;
  }

  function handleCallback(clientId) {
    var hash = location.hash.substring(1);
    if (!hash) return Promise.resolve(false);

    var params = new URLSearchParams(hash);
    var token = params.get('access_token');
    var state = params.get('state');

    if (!token) return Promise.resolve(false);

    var savedState = sessionStorage.getItem(KEY_STATE);
    if (state !== savedState) {
      sessionStorage.removeItem(KEY_STATE);
      return Promise.reject(new Error('State mismatch'));
    }

    sessionStorage.removeItem(KEY_STATE);
    sessionStorage.setItem(KEY_TOKEN, token);

    history.replaceState(null, '', location.pathname);

    return fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Client-Id': clientId
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch user: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var user = data.data && data.data[0];
        if (user) {
          sessionStorage.setItem(KEY_USERNAME, user.login);
        }

        var returnUrl = sessionStorage.getItem(KEY_RETURN_URL);
        sessionStorage.removeItem(KEY_RETURN_URL);

        return { token: token, username: user ? user.login : '', returnUrl: returnUrl };
      });
  }

  function getToken() {
    return sessionStorage.getItem(KEY_TOKEN) || '';
  }

  function getUsername() {
    return sessionStorage.getItem(KEY_USERNAME) || '';
  }

  function isLoggedIn() {
    return !!sessionStorage.getItem(KEY_TOKEN);
  }

  function logout() {
    sessionStorage.removeItem(KEY_TOKEN);
    sessionStorage.removeItem(KEY_USERNAME);
  }

  window.TwitchAuth = {
    login: login,
    handleCallback: handleCallback,
    getToken: getToken,
    getUsername: getUsername,
    isLoggedIn: isLoggedIn,
    logout: logout,
    REDIRECT_URI: REDIRECT_URI,
    KEY_TOKEN: KEY_TOKEN,
    KEY_USERNAME: KEY_USERNAME,
    KEY_STATE: KEY_STATE,
    KEY_RETURN_URL: KEY_RETURN_URL
  };
})();
