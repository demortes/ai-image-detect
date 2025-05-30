// REMEMBER TO REPLACE 'YOUR_CLIENT_ID' WITH YOUR ACTUAL CLIENT ID FROM AUTH.DEMORTES.COM

const authEndpoint = 'https://auth.demortes.com/application/o/authorize/';
const clientId = 'YOUR_CLIENT_ID';
const redirectUri = chrome.identity.getRedirectURL("oauth2");
const scopes = ['openid', 'profile', 'email'];

function authenticate(interactive) {
  const nonce = Math.random().toString(36).substring(2, 15); // Simple nonce generation
  let authUrl = `${authEndpoint}?client_id=${clientId}`;
  authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  authUrl += `&response_type=code`;
  authUrl += `&scope=${encodeURIComponent(scopes.join(' '))}`;
  authUrl += `&nonce=${encodeURIComponent(nonce)}`;

  console.log("Redirect URI:", redirectUri);
  console.log("Auth URL:", authUrl);

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: interactive,
    },
    (responseUrl) => {
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
        // TODO: Exchange authorization code for an ID token
        // This typically involves a POST request to the token endpoint.
        // Example:
        // fetch('https://auth.demortes.com/application/o/token/', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        //   body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&client_secret=YOUR_CLIENT_SECRET` // Ensure client_secret is handled securely
        // })
        // .then(response => response.json())
        // .then(tokens => {
        //   if (tokens.error) {
        //     const errorMsg = `Token exchange failed: ${tokens.error_description || tokens.error}`;
        //     console.error(errorMsg);
        //     chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        //     return;
        //   }
        //   const idToken = tokens.id_token;
        //   // TODO: Decode/verify idToken and extract user information
        //   // For now, using a dummy user.
        //   const user = { loginName: "testUserFromToken" }; // Placeholder
        //   chrome.storage.local.set({ userInfo: user, authError: null }, () => { // Changed userProfile to userInfo and clear authError
        //     console.log("User info stored:", user);
        //     chrome.storage.local.remove('authError'); // Explicitly remove authError
        //     chrome.runtime.sendMessage({ message: "loginSuccess", profile: user });
        //   });
        // })
        // .catch(error => {
        //   const errorMsg = `Token exchange request failed: ${error.message}`;
        //   console.error(errorMsg);
        //   chrome.storage.local.set({ authError: errorMsg, userInfo: null });
        //   // Also store this error in chrome.storage.local.set({ authError: "Token exchange failed: " + error.toString() });
        // });

        // For now, as a placeholder for actual user info, store a dummy user object
        const user = { loginName: "testUser" }; // Placeholder
        // Successfully got code, proceeding to (mock) store user info
        chrome.storage.local.set({ userInfo: user, authError: null }, () => { // Changed userProfile to userInfo
          console.log("User info stored (dummy):", user);
          chrome.storage.local.remove('authError'); // Ensure any previous authError is cleared
          // Send message to popup that login was successful
          chrome.runtime.sendMessage({ message: "loginSuccess", profile: user });
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