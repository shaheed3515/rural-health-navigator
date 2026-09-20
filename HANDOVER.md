# 🏥 Swasthya Sangam: Comprehensive Handover & State Documentation

> **Problem Statement**: SIH 26133 — Rural Health Access & Care Navigator  
> **Production Live URL**: [https://rural-health-navigator.vercel.app](https://rural-health-navigator.vercel.app)  
> **Backend Service**: [https://rural-health-navigator.onrender.com](https://rural-health-navigator.onrender.com)  
> **GitHub Repository**: [https://github.com/shaheed3515/rural-health-navigator](https://github.com/shaheed3515/rural-health-navigator)  
> **Last Updated**: September 20, 2026

---

## 🤖 INSTRUCTIONS FOR INCOMING AI ASSISTANT (ON ANY LAPTOP)
> **READ THIS CAREFULLY WHEN RESUMING ON A NEW MACHINE:**
> You are **Antigravity**, the user's pair programming partner on the *Swasthya Sangam* project.
> The user has switched to this laptop and needs you to seamlessly continue with full context.
>
> **NON-NEGOTIABLE CORE CONSTRAINTS:**
> 1. **STRICTLY ZERO EMOJIS**: Under NO circumstances use emojis in UI buttons, banners, cards, toasts, logs, or chat messages. Only use crisp SVG vector icons (`<svg>...</svg>`).
> 2. **ZERO REFERENCES TO ASHA WORKERS**: The project strictly uses neutral, professional terminology such as "Healthcare Provider", "Field Health Worker", "Verified Clinic", or "Community Health Staff". Never re-introduce "ASHA".
> 3. **CLINICAL LIGHT-BLUE DESIGN SYSTEM**: The entire application uses a crisp, trustworthy medical light-blue palette (`#1d68bd`, `#0284c7`, `#f0f7ff`, `#e0edfd`, `#f8fafc`). Avoid heavy dark-mode banners; keep it clinical, professional, and accessible.
> 4. **LIVE PUSH PIPELINE**: All code pushed to `main` (`git push origin main`) automatically deploys live to Vercel within ~45 seconds. Always test `npm --prefix frontend run build` before pushing.

---

## 📌 1. Project Overview & Features
Swasthya Sangam is an enterprise-grade primary healthcare navigation platform built for rural citizens, field health workers, and district medical officers (CMO):
- **Live Facility Discovery (OSM HOT)**: Dynamic GPS-based discovery of Primary Health Centres (PHCs), Community Health Centres (CHCs), and Sub-Centres within adjustable radii (5km–50km) with real-time bed occupancy gauges and 1-click triage filters (Anti-Venom, 24/7 Labor, Emergency, Pediatric).
- **Essential Medicine Inventory**: Real-time stock tracking for anti-venom (ASV), rabies vaccines, ORS, maternal iron, and antibiotics with requisition workflow.
- **Doctor Duty Roster & Digital OPD Passes**: Real-time shift tracking (`ON_DUTY`, `OFF_DUTY`, `ON_CALL`) across General Medicine, Pediatrics, OBGYN, Orthopedics, and AYUSH with downloadable PDF/print consultation passes.
- **Dynamic Token Expiry**: Appointment passes expire automatically after 24 hours / date passed with real-time countdown badges and auto-cleanup.
- **Multilingual AI Health Assistant**: Symptom tele-triage in 4 languages (English, Hindi, Marathi, Telugu), multimodal prescription photo analysis, and voice dictation.
- **In-App AI Voice Call & 108 Merge**: Web Audio API synthesizer for realistic Indian rural telecom dial tones (400Hz+425Hz cadence), AI voice conversation, live speech recognition, visual audio waveforms, and 1-click 108 emergency conference merge.
- **Golden Hour Bystander SOS Beacon**: High-urgency modal with live GPS coordinates, local emergency contacts, and direct dialing.

---

## 🛠️ 2. Architectural Structure

```
SIH133/
├── backend/
│   ├── index.js             # Express API, mock data, and health endpoints
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LiveCameraModal.jsx     # In-app webcam & phone camera viewfinder (z-index: 9999)
│   │   │   ├── VoiceCallModal.jsx      # Web Audio synthesized 108 emergency voice call
│   │   │   ├── SosBeaconModal.jsx      # Golden Hour emergency beacon
│   │   │   ├── DoctorRosterModal.jsx   # Live doctor shift roster & duty switcher
│   │   │   └── FloatingAIAssistant.jsx # Minimized floating pill assistant
│   │   ├── App.jsx          # Master portal, state-driven routing, 3-column app-shell
│   │   ├── App.css          # Clinical light-blue design system, responsive breakpoints
│   │   ├── index.css        # Tailwind directives and base viewport setup
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── HANDOVER.md              # This document
└── architecture_diagram.html
```

---

## 📱 3. Recent Critical Fixes (Chronological Log)

### A. Laptop Webcam vs Phone Camera Fix
- **Issue**: On laptops, clicking the camera was picking up an external phone camera via wireless link instead of the laptop's built-in front webcam.
- **Fix**: In `LiveCameraModal.jsx`, added intelligent device enumeration:
  - Laptops auto-select `/integrated|internal|front|webcam|facetime|built-in/i`.
  - Added a camera switcher dropdown when multiple video inputs are detected.
  - Mobile devices default to `environment` (rear camera).

### B. Mobile Header Overlap Fix
- **Issue**: On mobile (< 400px), the top language dropdown (`[ EN v ]`) and user badges were pushing leftwards and covering the state emblem and "SWASTHYA SANGAM" title.
- **Fix**: In `App.jsx`, streamlined mobile header elements:
  - Hid redundant decorative icons on mobile while preserving the official emblem and title.
  - Made the guest indicator a compact circular badge.
  - Kept right-side controls under 160px total width, eliminating collisions down to 320px screens.

### C. Docked AI Assistant Input Bar Cutoff on Mobile
- **Issue**: In mobile Chrome, the pop-up AI assistant bottom input bar (camera icon, mic, text box, send button) was pushed off-screen under Android's navigation bar.
- **Fix**: Replaced `height: 100vh` with `inset: 0` and `height: 100dvh` (Dynamic Viewport Height). Added `pb-8` to elevate all buttons safely above Android's navigation bar and gesture pill.

### D. Full-View AI Assistant on Mobile Navigation Bar
- **Issue**: When opening "Multilingual Health AI" from the navigation menu on mobile, it appeared as a narrow boxed card with empty margins on the left and right.
- **Fix**: Set `-mx-4 -my-4`, `p-0`, `rounded-none`, and `height: calc(100dvh - 115px)` on mobile screens for an edge-to-edge native full-screen experience.

### E. Camera Vertical (Portrait) Mode Failure
- **Issue**: Camera worked when rotating phone horizontally, but failed or froze in vertical portrait mode.
- **Fix**: Mobile camera hardware sensors are physically built in landscape (e.g., 1280x720). Requesting strict portrait dimensions (`width: 720, height: 1280`) in WebRTC caused mobile camera drivers (Oppo, Realme, Xiaomi, Samsung) to fail with `OverconstrainedError`.
  - Removed hardcoded width/height constraints on mobile and requested `{ facingMode: { ideal: mode } }`.
  - Added `muted = true`, `playsinline`, `webkit-playsinline`, and `onloadedmetadata` auto-play.
  - Added a direct 1-tap "Use Phone Camera App" fallback (`<input type="file" capture="environment">`).

### F. Camera Modal Trapped Behind AI Assistant
- **Issue**: When tapping the camera button inside the AI assistant drawer, the camera opened *behind* the AI assistant, and was only visible after closing the AI assistant.
- **Fix**: Elevated `LiveCameraModal.jsx` to `z-[9999]` with inline `style={{ zIndex: 9999 }}` and added `.live-camera-modal-overlay { z-index: 9999 !important; }` in `App.css`. Also elevated all other critical modals (`VoiceCallModal`, `SosBeaconModal`, `DoctorRosterModal`) to `z-[9990]`.

### G. Mobile Pull-to-Refresh Gesture
- **Issue**: Swiping down at the top of the mobile screen did not refresh the page because `html, body { overflow: hidden; }` in the app-shell architecture disabled native browser pull-to-refresh.
- **Fix**: Added a custom touch gesture handler (`onTouchStart`, `onTouchMove`, `onTouchEnd`) on `.workspace-col` with:
  - An animated SVG clinical refresh pill at the top.
  - Real-time icon rotation with pull resistance.
  - "Pull to refresh" -> "Release to refresh" -> "Refreshing Portal..." states triggering `window.location.reload()`.

---

## 👥 4. Collaboration Status
- **Collaborator**: Asma Eram (`asmaeram006@gmail.com`) is added as a collaborator on GitHub.
- **Recent Activity**: She created a branch `abc`, committed a test file `file.py`, and merged it via Pull Request #1, then deleted the `abc` branch on GitHub.
- **Repository Cleanliness**: `main` is completely in sync with remote and building cleanly with zero errors.

---

## 💻 5. Setting Up on the New Laptop

### Step 1: Clone Repository
```bash
git clone https://github.com/shaheed3515/rural-health-navigator.git
cd rural-health-navigator
```

### Step 2: Install Dependencies
```bash
# Frontend
cd frontend
npm install
cd ..

# Backend
npm install
```

### Step 3: Run Locally
- **Frontend**:
  ```bash
  cd frontend
  npm run dev
  # Opens at http://localhost:5173/
  ```
- **Backend**:
  ```bash
  node backend/index.js
  # Serves API on port 5000
  ```

### Step 4: Deploying Changes
Whenever you make changes, run:
```bash
npm --prefix frontend run build
git add .
git commit -m "your descriptive message"
git push origin main
```
Vercel will automatically build and deploy the update live to [`https://rural-health-navigator.vercel.app`](https://rural-health-navigator.vercel.app).
