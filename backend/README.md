# 🏥 Swasthya Sangam — Backend API & Microservices

This is the backend server and REST API for **Swasthya Sangam: Rural Health Access & Care Navigator**, built with **Node.js**, **Express 5**, **MongoDB / Mongoose**, and **Google GenAI (Gemini)**.

---

## 🛠️ Key Technologies & Features

- **Express 5**: Fast, modern HTTP server with async error handling and CORS support.
- **Google GenAI SDK (`@google/genai`)**: Integration with Gemini multimodal models for symptom triage and prescription image analysis.
- **Dual-Storage Resilience**: Full MongoDB Atlas persistence with seamless automatic fallback to `backend/data/clinics.json` and in-memory stores when offline or unconfigured.
- **OpenStreetMap GIS Gateway**: Backend proxy (`/api/facilities/nearby`) querying OSM Nominatim and Overpass GIS without browser CORS restrictions, backed by a dynamic local proximity hierarchy (<15 km).
- **Golden Hour Bystander SOS Dispatcher**: In-memory beacon broadcaster alerting nearby citizen volunteers under India's Section 134A Good Samaritan Law.
- **JWT & Role Authentication**: Secure token generation with bcrypt password hashing for CMO administrators (`cmo_admin`).

---

## 📂 Backend Directory Structure

```plaintext
backend/
├── package.json               # Express 5, Mongoose, Google GenAI dependencies
├── render.yaml                # Render cloud deployment blueprint
├── server.js                  # Main server entry point & all API routes
├── db.js                      # MongoDB connection & fallback mode detection
├── seed.js                    # Database seed script for initial facilities & CMO user
├── data/
│   └── clinics.json           # Offline fallback database of rural healthcare facilities
└── models/
    ├── Appointment.js         # Mongoose schema for OPD appointments & tokens
    ├── Clinic.js              # Mongoose schema for clinics, beds & doctor rosters
    └── User.js                # Mongoose schema for patients and administrators
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend` folder:

```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rural_health_db
```

> **Note:** If `MONGODB_URI` is omitted or unavailable, the backend automatically operates in **Local JSON / In-Memory Fallback Mode** without any crash.

---

## ⚡ Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed Initial Database (Optional)**:
   ```bash
   node seed.js
   ```

3. **Start Server**:
   ```bash
   # Development mode with hot-reload or direct execution:
   npm run dev
   # or
   npm start
   ```
   The API will listen on `http://localhost:5000`.

---

## 📡 Key API Routes

- `GET /api/health` — System status, DB mode, and Gemini key check
- `GET /api/stats` — Summary of facilities, beds, doctors, and medicines
- `POST /api/auth/register-patient` — Patient login / registration via phone
- `POST /api/auth/login-admin` — CMO Administrator login (`cmo_admin` / `admin123`)
- `GET /api/facilities` — Filter facilities by district, specialization, medicine, or search
- `GET /api/facilities/nearby` — Live OpenStreetMap GIS proximity search
- `PUT /api/facilities/:facilityId/doctors/:doctorId/status` — Real-time doctor duty toggle
- `PUT /api/stock` — Medicine stock and inventory updates
- `POST /api/sos/broadcast` — Golden Hour bystander emergency beacon
- `POST /api/appointments` — OPD consultation token generation
- `POST /api/chat` — Gemini multimodal medical triage and prescription scanner

---

## 🚀 Cloud Deployment

The backend includes a `render.yaml` specification designed for 1-click deployment on **Render Web Services**.
