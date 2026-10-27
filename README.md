# 📂 Telegram Cloud Uploader (Frontend)

A sleek, fast, and modern web application to upload documents, photos, videos, and archives directly to a Telegram channel without needing to manually open Telegram each time.

Built with high-performance vanilla JavaScript and CSS, featuring drag-and-drop batch intake, real-time upload speed metrics, granular queue management, and configurable backend connectivity.

---

## ✨ Features

- **Modern Drag & Drop Zone:** Intuitive drop target with interactive hover states, multi-file intake, and keyboard accessibility (`Space` or `Enter` to browse).
- **Staging & Queue Management:**
  - Preview staged files before starting uploads.
  - Automatic thumbnail generation for image files (`image/*`).
  - File category badges for documents, videos, audio, and compressed archives.
  - Human-readable file size formatting (`KB`, `MB`, `GB`).
  - Remove individual files or clear finished items from the queue.
- **Real-Time Progress & Metrics:**
  - Smooth progress bar with percentage tracking for each individual file.
  - Live upload speed calculation (`MB/s`, `KB/s`) and estimated time remaining (ETA).
  - Aggregate queue progress indicator for batch operations.
- **Resilient Upload Engine:**
  - Cancel/abort active uploads at any time without freezing the interface.
  - One-click retry for failed items.
  - Preserves item details and state without clearing or breaking the DOM.
- **Configurable Backend Integration:**
  - Default connection to the production Render backend (`https://telegram-uploader-backend.onrender.com/upload`).
  - Settings drawer to switch between production and local development (`http://localhost:3000/upload`).
  - Live server health check with latency measurement (`ms`) and cold-start wake-up notification for sleeping free-tier servers.
  - Optional custom caption/tag input saved across sessions in `localStorage`.
- **Telegram Aesthetic & Dark/Light Mode:**
  - Clean, high-contrast dark theme inspired by Telegram's sleek slate palette.
  - Crisp light theme with seamless theme toggle and persistent user preference.
  - Fully responsive across desktop, tablet, and mobile displays.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16.0 or higher recommended)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Local Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AdibAziman/telegram-uploader-frontend.git
   cd telegram-uploader-frontend
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```
   or
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

*(Alternatively, because this project uses pure standard HTML/CSS/JS with zero build steps, you can also open `index.html` directly or serve it via any static web server like Netlify, Vercel, GitHub Pages, or Cloudflare Pages).*

---

## 🛠️ Configuration & Settings

Click the **gear icon** in the top navigation bar to open the **Backend Configuration** drawer:

1. **Backend API Endpoint:** Specify the URL of the Telegram uploader backend that handles Telegram Bot API dispatches.
   - Default: `https://telegram-uploader-backend.onrender.com/upload`
   - Local: `http://localhost:3000/upload`
2. **Test Connection:** Test the endpoint with a single click to verify latency and connectivity before initiating large file uploads.
3. **Default Caption / Note (Optional):** Define a default caption or hashtag to accompany your uploaded files in your Telegram channel.

---

## 📂 Project Structure

```
telegram-uploader-frontend/
├── index.html       # Accessible HTML5 semantic application layout & SVG sprite system
├── style.css        # Responsive design system with Telegram light/dark tokens
├── script.js        # Queue controller, XHR upload engine, speed/ETA calculator, & settings
├── serve.js         # Zero-dependency local development server
├── package.json     # Project metadata and run scripts
└── README.md        # Documentation and usage guide
```

---

## 🔒 Privacy & Security

- **Client-Side Processing:** All file staging and thumbnail rendering are performed locally in the browser memory.
- **No Credential Exposure:** Telegram bot tokens and channel secrets remain securely stored on the backend service.
- **Settings Persistence:** Custom configuration endpoints and captions are stored strictly in your browser's local storage.

---

## 🤝 Contributing

Contributions, feedback, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
