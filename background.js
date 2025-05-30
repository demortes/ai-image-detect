// REMEMBER TO REPLACE 'YOUR_CLIENT_ID' WITH YOUR ACTUAL CLIENT ID FROM AUTH.DEMORTES.COM

const authEndpoint = 'https://auth.demortes.com/application/o/authorize/';
const clientId = 'n5VWXQV2oNpyFpspkGQRYGLRPtEh6uLLAfDlHexf';
const redirectUri = chrome.identity.getRedirectURL("oauth2");
const scopes = ['openid', 'profile', 'email'];

function parseJwt(token) {
  // Basic JWT decode (no verification)
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

// PKCE helpers
function generateCodeVerifier(length = 128) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64Digest;
}

async function authenticate(interactive) {
  const nonce = Math.random().toString(36).substring(2, 15);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store codeVerifier for use after redirect
  chrome.storage.local.set({ pkce_code_verifier: codeVerifier });

  let authUrl = `${authEndpoint}?client_id=${clientId}`;
  authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  authUrl += `&response_type=code`;
  authUrl += `&scope=${encodeURIComponent(scopes.join(' '))}`;
  authUrl += `&nonce=${encodeURIComponent(nonce)}`;
  authUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}`;
  authUrl += `&code_challenge_method=S256`;

  console.log("Redirect URI:", redirectUri);
  console.log("Auth URL:", authUrl);

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: interactive,
    },
    async (responseUrl) => {
      if (chrome.runtime.lastError) {
        const errorMsg = `Authentication failed: ${chrome.runtime.lastError.message}`;
        console.error(errorMsg);
        chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        return;
      }
      if (!responseUrl) {
        const errorMsg = "Authentication failed: No response URL received.";
        console.error(errorMsg);
        chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        return;
      }

      console.log("Response URL:", responseUrl);
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');

      if (code) {
        console.log("Authorization Code:", code);
        // Retrieve code_verifier from storage
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
              console.error(errorMsg);
              chrome.storage.local.set({ authError: errorMsg, userInfo: null });
              return;
            }
            console.log("Tokens received:", tokens);
            const idToken = tokens.id_token;
            console.log("ID Token:", idToken);
            const jwt = parseJwt(idToken);
            console.log("Parsed JWT:", jwt);
            const user = {
              loginName: jwt?.name || jwt?.preferred_username || jwt?.email || "Unknown User"
            };
            chrome.storage.local.set({ userInfo: user, authError: null }, () => {
              console.log("User info stored:", user);
              chrome.storage.local.remove('authError');
              chrome.runtime.sendMessage({ message: "loginSuccess", profile: user });
            });
          })
          .catch(error => {
            const errorMsg = `Token exchange request failed: ${error.message}`;
            console.error(errorMsg);
            chrome.storage.local.set({ authError: errorMsg, userInfo: null });
          });
        });
      } else {
        const errorMsg = "No authorization code found in responseUrl.";
        console.error(errorMsg);
        chrome.storage.local.set({ authError: errorMsg, userInfo: null });
      }
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Use request.type for consistency with popup.js if it was changed there
  // For now, assuming popup.js sends {message: "login"} or {message: "getProfile"}
  if (request.message === "login" || request.type === "login") { // Accommodate both message structures
    // Clear previous errors before attempting new login
    chrome.storage.local.remove('authError', () => {
      authenticate(true);
    });
    return true; // Indicates an asynchronous response
  } else if (request.message === "getProfile" || request.type === "getProfile") {
    // Send back both userInfo and authError
    chrome.storage.local.get(["userInfo", "authError"], (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting data from storage:", chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      console.log("Sending stored data to popup:", data);
      sendResponse({ profile: data.userInfo, error: data.authError });
    });
    return true; // Indicates an asynchronous response
  }
});

// Attempt non-interactive authentication on startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension startup, attempting non-interactive auth.");
  // Clear previous errors before attempting new login
  chrome.storage.local.remove('authError', () => {
    authenticate(false);
  });
});

// Also attempt non-interactive authentication on install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install" || details.reason === "update") {
    console.log("Extension installed/updated, attempting non-interactive auth.");
    // Clear previous errors before attempting new login
    chrome.storage.local.remove('authError', () => {
      authenticate(false);
    });
  }
});