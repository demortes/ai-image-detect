# Chrome Extension Testing Guide: OpenID Auth

This guide provides instructions for manually testing the OpenID Authentication Chrome Extension.

## I. Prerequisites

1.  **Load the Extension:**
    *   Open Google Chrome.
    *   Navigate to `chrome://extensions`.
    *   Enable "Developer mode" (usually a toggle in the top right corner).
    *   Click on "Load unpacked".
    *   Select the directory where you have the extension files (`manifest.json`, `background.js`, etc.).

2.  **Configure Client ID:**
    *   Open the `background.js` file in a text editor.
    *   Locate the line: `const clientId = 'YOUR_CLIENT_ID';`
    *   Replace `'YOUR_CLIENT_ID'` with your actual client ID obtained from `auth.demortes.com`. Save the file.
    *   If the extension was already loaded, go back to `chrome://extensions` and click the "reload" icon for this extension.

3.  **Configure Redirect URI on `auth.demortes.com`:**
    *   After loading the extension, find its ID on the `chrome://extensions` page. It will look something like `abcdefghijklmnopabcdefghijklmnop`.
    *   The redirect URI your OpenID provider (`auth.demortes.com`) must be configured to allow is: `https://<extension-id>.chromiumapp.org/oauth2`.
    *   Replace `<extension-id>` with the actual ID of your loaded extension.
    *   Example: If your extension ID is `longstringofchars`, the redirect URI is `https://longstringofchars.chromiumapp.org/oauth2`.
    *   Ensure this exact URI is added to the list of allowed redirect URIs in your application settings on `auth.demortes.com`.

## II. Test Cases

### 1. Initial State (Before Login)

*   **Steps:**
    1.  Ensure all prerequisites are met.
    2.  Click on the extension icon in the Chrome toolbar to open the popup.
*   **Expected Results:**
    *   The popup displays the message: "Please log in." (or a similar message indicating the user is not logged in).
    *   The "Login" button is visible and enabled.
    *   The "Logout" button is hidden.

### 2. Login Process

*   **Steps:**
    1.  With the popup open (as in Test Case 1), click the "Login" button.
    2.  Observe the popup status.
    3.  A new browser tab or window should open.
    4.  On the `auth.demortes.com` page, enter valid user credentials and complete the login/authorization process.
    5.  After successful authorization, the `auth.demortes.com` tab/window should close automatically.
    6.  Re-click the extension icon to open the popup (if it closed).
*   **Expected Results:**
    *   Immediately after clicking "Login", the popup status should change to "Attempting login..." (or similar).
    *   The new tab/window successfully navigates to the `auth.demortes.com` login page.
    *   After completing login on `auth.demortes.com` and the auth tab closes:
        *   The extension popup displays the user's login name. (Currently, this will be "Logged in as: testUser" due to the placeholder in `background.js`).
        *   The "Logout" button is visible and enabled.
        *   The "Login" button is hidden.
        *   The status message ("Please log in", "Attempting login...") is hidden, or a welcome message is shown.

### 3. Logged-In State

*   **Steps:**
    1.  Ensure you have successfully logged in (as per Test Case 2).
    2.  Close the extension popup by clicking outside of it.
    3.  Re-click the extension icon to open the popup again.
*   **Expected Results:**
    *   The popup immediately displays the user's login name ("Logged in as: testUser").
    *   The "Logout" button is visible and enabled.
    *   The "Login" button is hidden.

### 4. Logout Process

*   **Steps:**
    1.  Ensure you are in a logged-in state (as per Test Case 3).
    2.  With the popup open, click the "Logout" button.
    3.  Observe the popup status.
    4.  Close and reopen the popup.
*   **Expected Results:**
    *   Immediately after clicking "Logout", the popup status changes to "You have been logged out."
    *   The displayed login name is cleared.
    *   The "Login" button becomes visible and enabled.
    *   The "Logout" button becomes hidden.
    *   When the popup is closed and reopened, it shows "Please log in." and the "Login" button.

### 5. Authentication Failure (Simulated)

*   **Objective:** To test how the extension handles errors during the authentication initiation.
*   **Steps:**
    1.  Modify `background.js`: Temporarily change `const authEndpoint = 'https://auth.demortes.com/application/o/authorize/';` to an invalid URL (e.g., `https://invalid-auth-demortes.com/authorize/`).
    2.  Save `background.js`.
    3.  Go to `chrome://extensions` and reload the extension.
    4.  Open the extension popup. It should show the "Please log in." state.
    5.  Click the "Login" button.
    6.  **Important:** After this test, remember to revert `authEndpoint` in `background.js` to its correct value and reload the extension again.
*   **Expected Results:**
    *   The popup shows an error message (e.g., "Authentication failed: ...", or a more specific error related to the URL not being reachable). The error message should be displayed in red.
    *   The UI remains in the logged-out state (Login button visible, Logout button hidden).

### 6. Non-Interactive Login Attempt (on browser start)

*   **Objective:** To test if the extension attempts to authenticate silently when the browser starts, potentially picking up an existing session from `auth.demortes.com`. This test's success heavily depends on `auth.demortes.com`'s session management and how it handles non-interactive authentication requests.
*   **Steps:**
    1.  **Scenario A (Simulate Active Session):**
        *   Log in successfully through the extension popup.
        *   Close the browser completely.
        *   Reopen the browser.
        *   Wait a few seconds for the extension to run its startup logic.
        *   Open the extension popup.
    2.  **Scenario B (Simulate No Active Session):**
        *   Ensure you are logged out in the extension AND on `auth.demortes.com` (you might need to manually log out from `auth.demortes.com` in your browser).
        *   Close the browser completely.
        *   Reopen the browser.
        *   Wait a few seconds.
        *   Open the extension popup.
*   **Expected Results:**
    *   **Scenario A (If `auth.demortes.com` session was active and non-interactive flow worked):** The popup should show the user as logged in ("Logged in as: testUser").
    *   **Scenario A (If session was not active or non-interactive flow failed):** The popup should show the "Please log in." state or an error if the non-interactive attempt failed.
    *   **Scenario B:** The popup should show the "Please log in." state.

## III. Notes for Testers

*   **Viewing Background Script Logs:**
    *   Go to `chrome://extensions`.
    *   Find your extension.
    *   Click the link that says "Service worker" (or similar, it might be named `background.js` in older Chrome versions). This will open a DevTools window for the background script.
    *   Look for `console.log` messages in the "Console" tab.

*   **Viewing Popup Script Logs:**
    *   Open the extension popup by clicking its icon.
    *   Right-click anywhere inside the popup.
    *   Select "Inspect". This will open a DevTools window for the popup.
    *   Look for `console.log` messages in the "Console" tab.

*   **Current Limitations:**
    *   The actual user information (like login name, email) is **not yet fetched** from the token. The `background.js` currently uses a hardcoded placeholder: `{ loginName: "testUser" }`.
    *   The process of exchanging the authorization code for an ID token and then fetching user info is also a **placeholder** in `background.js`.
    *   The primary focus of these tests is the authentication *flow*, UI updates in response to state changes, and basic error handling within the extension itself.

Happy Testing!
