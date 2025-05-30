document.addEventListener('DOMContentLoaded', () => {
  const statusMessageEl = document.getElementById('statusMessage');
  const loginNameEl = document.getElementById('loginName');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');

  const userInfoKey = 'userInfo'; // Consistent with background.js
  const authErrorKey = 'authError'; // Consistent with background.js

  function updateUI(userInfo, error) {
    statusMessageEl.style.color = 'black'; // Default color

    if (error) {
      console.error("Auth Error:", error);
      statusMessageEl.textContent = error;
      statusMessageEl.style.color = 'red'; // Make error visually distinct
      statusMessageEl.style.display = 'block';
      loginNameEl.style.display = 'none';
      logoutButton.style.display = 'none';
      loginButton.style.display = 'block';
      loginButton.disabled = false;
    } else if (userInfo && userInfo.loginName) {
      loginNameEl.textContent = `Logged in as: ${userInfo.loginName}`;
      loginNameEl.style.display = 'block';
      // statusMessageEl.textContent = 'Login successful!'; // Or clear it
      statusMessageEl.style.display = 'none'; 
      logoutButton.style.display = 'block';
      loginButton.style.display = 'none';
      loginButton.disabled = false; // Re-enable in case it was disabled
    } else {
      // Logged out state or userInfo is null/undefined
      statusMessageEl.textContent = 'Please log in.';
      statusMessageEl.style.display = 'block';
      loginNameEl.textContent = '';
      loginNameEl.style.display = 'none';
      logoutButton.style.display = 'none';
      loginButton.style.display = 'block';
      loginButton.disabled = false;
    }
  }

  // 1. On DOMContentLoaded: Initial UI setup
  // Request current profile and error status from background script
  statusMessageEl.textContent = 'Loading...';
  chrome.runtime.sendMessage({ type: "getProfile" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending getProfile message:", chrome.runtime.lastError.message);
      updateUI(null, "Could not connect to background service. Please try again.");
      return;
    }
    
    if (response) {
        console.log("Profile and error status received from background:", response);
        // The response from background.js should be { profile: data.userInfo, error: data.authError }
        updateUI(response.profile, response.error);
    } else {
        // Fallback if background doesn't respond as expected, though it should.
        updateUI(null, "Failed to get initial status from background.");
    }
  });

  // 2. Login Button Event Listener
  loginButton.addEventListener('click', () => {
    statusMessageEl.textContent = 'Attempting login...'; // UI Feedback
    statusMessageEl.style.color = 'black'; // Reset color
    loginButton.disabled = true;

    // Clear any existing authError from chrome.storage.local
    chrome.storage.local.remove(authErrorKey, () => {
        if (chrome.runtime.lastError) {
            console.warn(`Could not clear ${authErrorKey} before login: ${chrome.runtime.lastError.message}`);
        }
        // Send message to background script (using 'type' as per current popup.js, ensure background.js handles it)
        chrome.runtime.sendMessage({ type: "login" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Login message failed to send:", chrome.runtime.lastError.message);
            updateUI(null, 'Login failed to initiate. Please try again.');
            // loginButton.disabled = false; // updateUI will handle this
          }
          // Background script handles auth. UI updates via storage listener.
          console.log("Login message sent to background script.");
        });
    });
  });

  // 3. Logout Button Event Listener
  logoutButton.addEventListener('click', () => {
    console.log(`Logout clicked. Removing ${userInfoKey} and ${authErrorKey} from storage.`);
    // Also remove authError on logout to ensure clean state for next login
    chrome.storage.local.remove([userInfoKey, authErrorKey], () => {
      if (chrome.runtime.lastError) {
        console.error(`Error removing keys:`, chrome.runtime.lastError.message);
        // Even if removal fails, update UI to reflect attempted logout
        updateUI(null, 'Logout failed. Please try again.');
        return;
      }
      console.log(`${userInfoKey} and ${authErrorKey} removed from storage.`);
      statusMessageEl.textContent = 'You have been logged out.'; // Set this before calling updateUI
      statusMessageEl.style.color = 'black';
      updateUI(null, null); // Update UI to logged-out state, clear any error
    });
  });

  // 4. Listener for Storage Changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      let newInfo = null;
      let newError = null;
      let needsUpdate = false;

      if (changes[userInfoKey]) {
        newInfo = changes[userInfoKey].newValue;
        console.log(`Storage changed for ${userInfoKey}. New value:`, newInfo);
        needsUpdate = true;
      }
      if (changes[authErrorKey]) {
        newError = changes[authErrorKey].newValue;
        console.log(`Storage changed for ${authErrorKey}. New value:`, newError);
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Fetch both keys to ensure updateUI has the complete current state
        chrome.storage.local.get([userInfoKey, authErrorKey], (data) => {
          if (chrome.runtime.lastError) {
            console.error("Error fetching state in onChanged listener:", chrome.runtime.lastError.message);
            // Decide on fallback behavior, maybe do nothing or show a generic error
            return;
          }
          console.log("onChanged: fetched current state for updateUI:", data);
          updateUI(data[userInfoKey], data[authErrorKey]);
        });
      }
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.message === "loginSuccess") {
      // Handle login success (e.g., update UI)
      console.log("Login successful:", message.profile);
    }
  });
});
