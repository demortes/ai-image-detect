// REMEMBER TO REPLACE 'YOUR_CLIENT_ID' WITH YOUR ACTUAL CLIENT ID FROM AUTH.DEMORTES.COM

const authEndpoint = 'https://auth.demortes.com/application/o/authorize/';
const clientId = 'n5VWXQV2oNpyFpspkGQRYGLRPtEh6uLLAfDlHexf';
const redirectUri = chrome.identity.getRedirectURL("oauth2");
const scopes = ['openid', 'profile', 'email'];

/**
 * Decodes a JWT token and returns its payload as an object.
 * @param {string} token - The JWT token to decode.
 * @returns {object|null} The decoded payload, or null if decoding fails.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Generates a PKCE code verifier.
 * @param {number} length - The length of the code verifier.
 * @returns {string} The generated code verifier.
 */
function generateCodeVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
}

/**
 * Generates a PKCE code challenge from a code verifier.
 * @param {string} codeVerifier - The code verifier.
 * @returns {Promise<string>} The generated code challenge.
 */
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64Digest;
}

/**
 * Initiates the authentication flow using PKCE and handles the OAuth2 process.
 * @param {boolean} interactive - Whether to prompt the user interactively.
 */
async function authenticate(interactive) {
  const nonce = Math.random().toString(36).substring(2, 15);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  chrome.storage.local.set({ pkce_code_verifier: codeVerifier });

  let authUrl = `${authEndpoint}?client_id=${clientId}`;
  authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  authUrl += `&response_type=code`;
  authUrl += `&scope=${encodeURIComponent(scopes.join(' '))}`;
  authUrl += `&nonce=${encodeURIComponent(nonce)}`;
  authUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}`;
  authUrl += `&code_challenge_method=S256`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: interactive,
    },
    async (responseUrl) => {
      if (chrome.runtime.lastError) {
        const errorMsg = `Authentication failed: ${chrome.runtime.lastError.message}`;
        chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        return;
      }
      if (!responseUrl) {
        const errorMsg = "Authentication failed: No response URL received.";
        chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        return;
      }

      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');

      if (code) {
        chrome.storage.local.get('pkce_code_verifier', (result) => {
          const codeVerifier = result.pkce_code_verifier;
          fetch('https://auth.demortes.com/application/o/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&code_verifier=${codeVerifier}`
          })
          .then(response => response.json())
          .then(tokens => {
            if (tokens.error) {
              const errorMsg = `Token exchange failed: ${tokens.error_description || tokens.error}`;
              chrome.storage.sync.set({ authError: errorMsg, userInfo: null });
              return;
            }
            const idToken = tokens.id_token;
            const jwt = parseJwt(idToken);
            const user = {
              loginName: jwt?.name || jwt?.preferred_username || jwt?.email || "Unknown User",
              email: jwt?.email || null,
              email_verified: jwt?.email_verified ?? null,
              groups: jwt?.groups || []
            };
            chrome.storage.sync.set({ userInfo: user, authError: null }, () => {
              chrome.storage.sync.remove('authError');
              chrome.runtime.sendMessage({ message: "loginSuccess", profile: user });
            });
          })
          .catch(error => {
            const errorMsg = `Token exchange request failed: ${error.message}`;
            chrome.storage.sync.set({ authError: errorMsg, userInfo: null });
          });
        });
      } else {
        const errorMsg = "No authorization code found in responseUrl.";
        chrome.storage.sync.set({ authError: errorMsg, userInfo: null });
      }
    }
  );
}

/**
 * Handles messages from popup.js for login and profile retrieval.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login" || request.type === "login") {
    chrome.storage.sync.remove('authError', () => {
      authenticate(true);
    });
    return true;
  } else if (request.message === "getProfile" || request.type === "getProfile") {
    chrome.storage.sync.get(["userInfo", "authError"], (data) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ profile: data.userInfo, error: data.authError });
    });
    return true;
  }
});

/**
 * On browser startup, clears any previous authentication errors and attempts silent authentication.
 */
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.remove('authError', () => {
    authenticate(false);
  });
});

/**
 * On extension install or update, clears authentication errors and attempts silent authentication.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    chrome.storage.sync.remove('authError', () => {
      authenticate(false);
    });
  }
});