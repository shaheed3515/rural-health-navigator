# 🏥 Swasthya Sangam: Context Handover & Architecture Document

> **Rural Health Access & Care Navigator (Problem Statement: SIH 26133)**  
> **Production URL**: [https://rural-health-navigator.vercel.app](https://rural-health-navigator.vercel.app)  
> **Backend URL**: [https://rural-health-navigator.onrender.com](https://rural-health-navigator.onrender.com)  
> **GitHub Repository**: [https://github.com/shaheed3515/rural-health-navigator](https://github.com/shaheed3515/rural-health-navigator)

---

## 📌 1. Project Overview & Mission
Swasthya Sangam is an enterprise-grade rural health grid portal designed for village citizens, field healthcare staff, and healthcare administrators. It solves critical rural healthcare accessibility challenges by providing:
- **Instant Facility Discovery**: Live GPS-based radius discovery of Primary Health Centres (PHCs), Community Health Centres (CHCs), and Sub-Centres using Humanitarian OpenStreetMap (OSM HOT).
- **Essential Medicine Inventory**: Real-time stock tracking for critical rural drugs (anti-venom, ORS, maternal supplements, antibiotics).
- **Golden Hour Bystander SOS Beacon**: Instant emergency broadcast with live GPS coordinates, ambulance dispatch (108), and maternal helpline (102).
- **Digital OPD Passes & 5-Day Department Availability Matrix**: Real-time appointment tokens pre-populating doctor availability across General Medicine, Pediatrics, OBGYN, Orthopedics, and AYUSH.
- **Multilingual AI Health Assistant**: Symptom tele-triage, voice guidance (English, Hindi, Marathi, Telugu), and OCR prescription scanning.

---

## 🎨 2. UI/UX Architecture & Modernization
### A. Header De-Congestion
- **Previous State**: 3 stacked headers (Emergency ribbon, Government authority strip, Main navigation navbar) consuming ~180px of vertical space, creating a crowded wireframe feel.
- **Current State**: Consolidated into a single, cohesive **64px sticky master header**:
  - Official Government of Maharashtra Emblem + Brand Typography (`Swasthya Sangam` + `PS 26133`).
  - Centered live search bar with soft rounded edges (`rounded-xl`) and clear button.
  - Live GPS coordinate pill with status pulse.
  - Multilingual switcher (EN, हिंदी, मराठी, తెలుగు).
  - Accessible font sizers (`A-`, `A`, `A+`).
  - Emergency SOS Beacon trigger.
  - Notification drawer with badge counter.
  - User role profile chip with live active status indicator.

### B. Dashboard Hero & Pastel Quick-Action Cards
- **Hero Greeting & Locality Status Banner**:
  - Dark gradient canvas (`from-slate-900 via-slate-800 to-indigo-950`) with subtle radial illumination.
  - Live GPS status indicator pill (`GPS Active: 14.67°N, 77.61°E`).
  - Welcome greeting with citizen name.
  - Micro-stats cluster: Verified Centers, 24/7 Triage Active, and Direct SOS Beacon button.
- **Airy Quick-Action Cards**:
  - Generous `rounded-2xl` geometry with soft modern elevation (`--card-shadow`) and smooth hover lift (`translate-y-[-2px]`).
  - Curated pastel icon backings:
    - **Find Nearby Healthcare**: Sky Blue (`bg-sky-50 text-sky-600 border-sky-100`)
    - **Check Medicine Stock**: Emerald Green (`bg-emerald-50 text-emerald-600 border-emerald-100`)
    - **Health AI Assistant**: Indigo Purple (`bg-indigo-50 text-indigo-600 border-indigo-100`)
    - **Book OPD Passes**: Amber Gold (`bg-amber-50 text-amber-600 border-amber-100`)

### C. Design Principles & Guidelines
- **Strictly No Emojis**: All visual elements use clean, high-precision SVG vector icons.
- **Whitespace & Elevation**: Minimalist `#f8fafc` canvas with soft shadows instead of cluttered, heavy borders.

---

## 💻 3. Setting Up on a New Laptop

### Step 1: Clone Repository
```bash
git clone https://github.com/shaheed3515/rural-health-navigator.git
cd rural-health-navigator
```

### Step 2: Install Dependencies
```bash
# Install backend dependencies in root
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Run Locally
- **Backend**:
  ```bash
  node server.js
  # Server will run on port 5000 (or configured PORT)
  ```
- **Frontend**:
  ```bash
  cd frontend
  npm run dev
  # Vite will serve at http://localhost:5173/
  ```

---

## 🚀 4. Deployment Pipeline
- **Frontend**: Hosted on **Vercel** connected to `main` branch. Every `git push origin main` triggers an automatic production build and deployment.
- **Backend**: Hosted on **Render** connected to `main` branch. Automatically redeploys on push.
