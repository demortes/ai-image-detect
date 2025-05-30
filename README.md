# AI Image Detection Chrome Extension

AI Image Detection is a Chrome extension that detects and identifies AI-generated images on web pages, helping users distinguish between real and synthetic content. It uses OpenID Connect authentication (PKCE flow) with Authentik as the identity provider.

## Features

- Detects and identifies AI-generated images on supported web pages.
- Authenticates users via OpenID Connect (PKCE) with Authentik.
- Displays user profile information (name, email, email verification, groups) after login.
- Modern, dark-themed popup UI.
- Secure token handling using Chrome extension best practices.

## Installation

1. **Clone or Download the Repository**
   ```sh
   git clone https://github.com/yourusername/ai-image-detect.git
   ```

2. **Load the Extension in Chrome**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

3. **Configure Authentik**
   - Register your extension's redirect URI with Authentik:
     ```
     https://<your-extension-id>.chromiumapp.org/oauth2
     ```
   - Set the client ID in `background.js`:
     ```js
     const clientId = 'YOUR_CLIENT_ID';
     ```

4. **Icons**
   - Ensure PNG icons are present in the `images/` directory as referenced in `manifest.json`.

## Usage

- Click the extension icon in the Chrome toolbar.
- Log in using your Authentik credentials.
- The popup will display your user info and allow you to log out.

## Development

- All authentication and user info is handled in [`background.js`](background.js).
- The popup UI is defined in [`popup.html`](popup.html) and [`popup.js`](popup.js).
- User profile and error state are stored in `chrome.storage.sync`.

## Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for manual testing instructions and test cases.

## License

All rights reserved. See [LICENSE](LICENSE) for details.

## Contributing

Pull requests and issues are welcome! Please open an issue to discuss your ideas or report bugs.

---

**Maintainer:** webmaster@demortes.com
