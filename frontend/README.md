# 🏥 Swasthya Sangam — Frontend Client

This is the client-side single page application (SPA) for **Swasthya Sangam: Rural Health Access & Care Navigator**, built with **React 19**, **Vite 8**, and **Tailwind CSS v4**.

---

## 🛠️ Key Technologies & Libraries

- **React 19**: Modern component architecture, reactive state management, and optimized hooks.
- **Vite 8**: Rapid Hot Module Replacement (HMR) and optimized production bundling.
- **Tailwind CSS v4**: Utility-first responsive design, styled for ultra-fast rendering on rural and mobile connections.
- **Leaflet & OpenStreetMap**: Interactive geospatial mapping for PHCs, CHCs, SDHs, and District Hospitals.
- **Web Audio API**: Real-time dual-frequency telecom dialing and ringtone synthesis for 108 emergency calls.
- **Web Speech API**: In-browser speech recognition (STT) and voice synthesis (TTS) for hands-free audio triage.
- **HTML5 MediaDevices API**: Multi-camera support (integrated webcam vs. mobile rear camera) for live prescription and medical report scanning.

---

## 📂 Frontend Directory Structure

```plaintext
frontend/
├── index.html                 # HTML shell with meta tags & mobile viewport settings
├── package.json               # Dependencies and build scripts
├── vercel.json                # Vercel deployment & reverse proxy configuration
├── vite.config.js             # Vite configuration with Tailwind CSS plugin
├── public/                    # Static assets, SVG logos, and icons
└── src/
    ├── App.jsx                # Main application controller, tab navigation & views
    ├── App.css                # Global animations and custom modal styles
    ├── index.css              # Tailwind CSS directives
    ├── main.jsx               # Application entry point
    ├── api.js                 # Centralized API fetch wrapper with token management
    ├── translations.js        # Multilingual dictionary (EN, HI, MR, TE)
    └── components/
        ├── FacilityMap.jsx        # Leaflet interactive map with custom markers
        ├── DoctorRosterModal.jsx  # Doctor duty roster and 1-click status toggle
        ├── SosBeaconModal.jsx     # Golden Hour Bystander SOS distress beacon
        ├── VoiceCallModal.jsx     # Simulated 108/102 emergency voice hotline
        ├── LiveCameraModal.jsx    # Camera scanner for prescriptions & wounds
        └── FloatingAIAssistant.jsx# Floating multimodal clinical triage widget
```

---

## 🌐 Supported Languages

All user-facing interfaces, alerts, and instructions support 4 languages defined in `src/translations.js`:
- **English**
- **Hindi (हिन्दी)**
- **Marathi (मराठी)**
- **Telugu (తెలుగు)**

---

## ⚡ Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables (Optional)**:
   Create a `.env` file in the `frontend` folder:
   ```ini
   VITE_API_BASE_URL=http://localhost:5000
   ```
   *(If omitted, the app defaults to local proxy or production cloud endpoints)*.

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:5173`.

4. **Build for Production**:
   ```bash
   npm run build
   ```

5. **Linting**:
   ```bash
   npm run lint
   ```

---

## 🚀 Deployment

The frontend is ready for 1-click deployment on **Vercel**. The included `vercel.json` ensures all `/api/*` requests are seamlessly forwarded to your hosted backend (e.g. Render) without encountering CORS issues.
