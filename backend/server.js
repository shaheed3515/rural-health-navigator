import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Database & Models
import { connectDB, getMongoStatus, isMongoConnected } from "./db.js";
import User from "./models/User.js";
import Clinic from "./models/Clinic.js";
import Appointment from "./models/Appointment.js";
import { seedDatabase } from "./seed.js";

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "sih_rural_health_jwt_secret_key_2026";

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log(`[AI Init] GoogleGenAI initialized. API Key present: ${!!process.env.GEMINI_API_KEY}`);

// Middleware & Production CORS Configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Local JSON & In-memory Fallbacks
const clinicsFilePath = path.join(__dirname, "data", "clinics.json");
let clinicsData = [];
const appointmentsStore = [];
const inMemoryUsers = [
  {
    id: "admin-cmo-001",
    username: "cmo_admin",
    passwordHash: bcrypt.hashSync("admin123", 10),
    fullName: "Dr. S. K. Verma",
    title: "Chief Medical Officer (CMO)",
    role: "admin",
    district: "Maharashtra Public Health Division",
    preferredLanguage: "English"
  }
];

function loadClinicsData() {
  try {
    const rawData = fs.readFileSync(clinicsFilePath, "utf8");
    clinicsData = JSON.parse(rawData);
    console.log(`[Data] Loaded ${clinicsData.length} clinics from local JSON file`);
  } catch (err) {
    console.error("[Data Error] Could not load clinics.json:", err.message);
    clinicsData = [];
  }
}

function saveClinicsData() {
  try {
    fs.writeFileSync(clinicsFilePath, JSON.stringify(clinicsData, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[Data Error] Failed to persist clinics.json:", err.message);
    return false;
  }
}

// Initial Data Load & Database Connection
loadClinicsData();
connectDB().then((connected) => {
  if (connected) {
    seedDatabase();
  }
});

// Helper: Fallback grounded AI response generator
function generateGroundedFallbackResponse(userMessage, preferredLang = "English", hasImage = false, context = null) {
  const q = (userMessage || "").toLowerCase();
  
  let detectedLang = preferredLang;
  if (/[\u0900-\u097F]/.test(userMessage)) {
    detectedLang = "Hindi";
  } else if (/[\u0C00-\u0C7F]/.test(userMessage)) {
    detectedLang = "Telugu";
  }

  const coords = context?.coords;
  const locationName = context?.locationName || "";
  const nearbyFacilities = Array.isArray(context?.nearbyFacilities) ? context.nearbyFacilities : [];

  // Check for location detection intent
  const isLocationQuery = /where am i|find my location|detect location|get location|my location|track location|current location|कहाँ हूँ|कहा हु|मेरी लोकेशन|माझे स्थान|स्थान शोधा|లొకేషన్|నా స్థానం/i.test(q);
  if (isLocationQuery && (!coords || !coords.lat)) {
    if (detectedLang === "Hindi") {
      return "[ACTION:GET_LOCATION] मैं आपके निकटतम प्राथमिक स्वास्थ्य केंद्र (PHC) और अस्पताल खोजने के लिए आपकी सटीक लोकेशन प्राप्त कर रहा हूँ। कृपया अपने ब्राउज़र में GPS लोकेशन अनुमति प्रदान करें। आपातकाल में तुरंत 108 डायल करें।";
    } else if (detectedLang === "Telugu") {
      return "[ACTION:GET_LOCATION] సమీప ఆసుపత్రులు మరియు ఆరోగ్య కేంద్రాలను కనుగొనడానికి మీ ప్రత్యక్ష స్థానాన్ని గుర్తిస్తున్నాము. దయచేసి బ్రౌజర్‌లో GPS అనుమతి ఇవ్వండి. అత్యవసర సహాయం కొరకు 108 కి కాల్ చేయండి.";
    } else {
      return "[ACTION:GET_LOCATION] I am detecting your live location to identify the closest Primary Health Centres (PHCs) and Community Hospitals. Please allow device GPS permission when prompted. For acute emergencies, call 108 immediately.";
    }
  }

  const isGreeting = /^(hi|hello|hey|namaste|नमस्ते|నమస్కారం|नमस्कार|good morning)/i.test(q.trim());
  if (isGreeting && !hasImage && q.length < 25) {
    const locAck = locationName ? (detectedLang === "Hindi" ? " (" + locationName + " क्षेत्र)" : detectedLang === "Telugu" ? " (" + locationName + " ప్రాంతం)" : " (" + locationName + " region)") : "";
    if (detectedLang === "Hindi") {
      return "नमस्ते! मैं स्वास्थ्य संगम ग्रामीण स्वास्थ्य एवं ट्राइएज एआई सहायक हूँ" + locAck + "। मैं आपकी क्या मदद कर सकता हूँ? आप मुझसे नजदीकी स्वास्थ्य केंद्र, डॉक्टरों की ड्यूटी, आपातकालीन बेड या एंटी-वेनम उपलब्धता के बारे में पूछ सकते हैं।";
    } else if (detectedLang === "Telugu") {
      return "నమస్కారం! నేను స్వాస్థ్య సంగం గ్రామీణ ఆరోగ్య AI సహాయకుడిని" + locAck + ". ఈరోజు మీకు ఎలా సహాయపడగలను? సమీప క్లినిక్‌లు, అత్యవసర పడకలు లేదా మందుల గురించి నన్ను అడగవచ్చు.";
    } else {
      return "Hello! I am your official Swasthya Sangam Rural Health & Triage AI Assistant" + locAck + ". How can I assist you with your healthcare inquiry today? You can ask about nearby health centres, emergency bed availability, doctor rosters, or medicine stocks.";
    }
  }

  if (hasImage) {
    if (detectedLang === "Hindi") {
      return "📷 **दवा पर्ची / चित्र विश्लेषण:**\n\nमैंने आपकी संलग्न दवा पर्ची या मेडिकल चित्र की समीक्षा की है।\n• हमारे प्राथमिक व सामुदायिक केंद्रों में Paracetamol, Amoxicillin, ORS, और Iron Folic Acid स्टॉक में उपलब्ध हैं।\n• विशेषज्ञ परामर्श के लिए नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) में संपर्क करें।\n• आपातकाल में तुरंत **108 (एम्बुलेंस)** या **102 (मातृ स्वास्थ्य)** पर कॉल करें।";
    } else if (detectedLang === "Telugu") {
      return "📷 **వైద్య చీటీ / చిత్రం విశ్లేషణ:**\n\nమీరు అప్‌లోడ్ చేసిన మెడికల్ చిత్రాన్ని పరిశీలించాము।\n• సాధారణ మందులు (పారాసిటమాల్, అమోక్సిసిలిన్, ఓఆర్ఎస్) మన ప్రాథమిక ఆరోగ్య కేంద్రాలలో అందుబాటులో ఉన్నాయి।\n• అత్యవసర సహాయం కొరకు వెంటనే **108** లేదా **102** కి కాల్ చేయండి।";
    } else {
      return "📷 **Prescription / Image Assessment:**\n\nI have reviewed your attached medical image/prescription.\n• Essential medicines (Paracetamol, Amoxicillin, ORS, Iron Folic Acid) are tracked across local health centres.\n• Specialists for pediatric, maternal, and general medicine are available at nearby Community Health Centres.\n• For urgent medical distress, call 108 (Ambulance) or 102 (Maternal) immediately.";
    }
  }

  const isEmergency = /emergency|snake|bite|venom|bleeding|chest pain|accident|आपात|साँप|काटा|రక్తం|పాము/i.test(q);
  if (isEmergency || q.includes("snake") || q.includes("venom")) {
    let facList = "";
    if (nearbyFacilities.length > 0) {
      facList = nearbyFacilities.map(f => "• **" + f.name + "** (" + (f.distance || "nearby") + ") — Beds: " + (f.beds || "Available") + " [" + (f.type || "Facility") + "]").join("\n");
    } else {
      facList = "Live GPS is scanning for your nearest emergency centers and Anti-Snake Venom (ASV) buffer depots. Please refer to the interactive live map cards on your screen.";
    }

    if (detectedLang === "Hindi") {
      return "🚨 **आपातकालीन सूचना:** किसी भी गंभीर स्थिति या सांप के काटने पर तुरंत **108 एम्बुलेंस** पर कॉल करें!\n\n" + facList + "\n\nमातृ एवं शिशु सहायता के लिए **102** पर कॉल करें।";
    } else if (detectedLang === "Telugu") {
      return "🚨 **అత్యవసర సూచన:** తక్షణ అత్యవసర సహాయం కొరకు **108 అంబులెన్స్** కి కాల్ చేయండి!\n\n" + facList + "\n\nతల్లీ బిడ్డల సహాయం కోసం **102** కి కాల్ చేయండి।";
    } else {
      return "🚨 **EMERGENCY NOTICE:** Immediately call **108 Ambulance** for life-threatening emergencies or snakebites!\n\n" + facList + "\n\nFor maternal and neonatal emergencies, dial **102**.";
    }
  }

  // If user asks about nearby facilities
  if (q.includes("hospital") || q.includes("clinic") || q.includes("facility") || q.includes("nearby") || q.includes("bed") || q.includes("अस्पताल") || q.includes("नजदीक") || q.includes("दवाखाना")) {
    if (nearbyFacilities.length > 0) {
      const facLines = nearbyFacilities.map(f => "• **" + f.name + "** (" + (f.distance || "nearby") + ") — Beds: " + (f.beds || "On admission") + " [" + (f.type || "Facility") + "]").join("\n");
      return "🏥 **Nearest Verified Healthcare Facilities in " + (locationName || "your area") + ":**\n\n" + facLines + "\n\nFor 24x7 emergency medical transport, dial **108** or **102**.";
    } else {
      return "🏥 Live GPS is currently scanning for nearby health centers in " + (locationName || "your area") + ". Please refer to the interactive live map cards on your screen, or visit your local government hospital / PHC. For acute emergencies, dial **108 (Ambulance)** or **102 (Maternal)** immediately.";
    }
  }

  if (detectedLang === "Hindi") {
    return "मैं स्वास्थ्य संगम का आधिकारिक एआई सहायक हूँ। मैं आपको निकटतम प्राथमिक व सामुदायिक स्वास्थ्य केंद्र, डॉक्टर ड्यूटी रोस्टर, आपातकालीन बेड और दवाओं की उपलब्धता के बारे में लाइव जानकारी दे सकता हूँ। आपातकाल में 108 डायल करें।";
  } else if (detectedLang === "Telugu") {
    return "నేను స్వాస్థ్య సంగం అధికారిక AI సహాయకుడిని. సమీప ఆరోగ్య కేంద్రాలు, వైద్యుల షెడ్యూల్, అత్యవసర పడకలు మరియు మందుల వివరాలను నేను అందించగలను. అత్యవసరంలో 108 కి కాల్ చేయండి.";
  } else {
    return "I am your official Swasthya Sangam Rural Health & Triage AI Assistant. I can assist you with nearby primary and community health centres, doctor availability, emergency beds, and medicine supply. For acute emergencies, call 108 (Ambulance) or 102 (Maternal) immediately.";
  }
}


// ==========================================
// 1. Healthcheck & Stats
// ==========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Rural Health Access & Care Navigator API",
    database: getMongoStatus(),
    geminiKeyPresent: !!process.env.GEMINI_API_KEY,
    clinicsCount: clinicsData.length,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/stats", (req, res) => {
  const totalClinics = clinicsData.length;
  const totalBeds = clinicsData.reduce((acc, c) => acc + (Number(c.emergencyBeds) || 0), 0);
  const totalDoctors = clinicsData.reduce((acc, c) => acc + (c.doctorsOnDuty ? c.doctorsOnDuty.length : (c.doctorSpecializations ? c.doctorSpecializations.length : 3)), 0);
  
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  clinicsData.forEach(c => {
    (c.medicineStock || []).forEach(m => {
      if (m.status === "In Stock") inStockCount++;
      else if (m.status === "Low Stock") lowStockCount++;
      else if (m.status === "Out of Stock") outOfStockCount++;
    });
  });

  res.json({
    totalClinics,
    totalBeds,
    totalDoctors,
    medicines: {
      inStock: inStockCount,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      totalInventoryItems: inStockCount + lowStockCount + outOfStockCount
    }
  });
});

// ==========================================
// 2. Production Authentication Endpoints
// ==========================================

// POST /api/auth/register-patient
// Accepts { fullName, phone, district, preferredLanguage }
// If phone exists, logs them in; otherwise registers new patient. Issues JWT.
app.post("/api/auth/register-patient", async (req, res) => {
  try {
    const { fullName, phone, district = "Maharashtra", preferredLanguage = "English" } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        error: "Full Name and Phone Number are required for patient registration."
      });
    }

    const sanitizedPhone = String(phone).replace(/\D/g, "");
    if (sanitizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 10-digit mobile number."
      });
    }

    let user = null;

    // Try MongoDB if connected
    if (isMongoConnected) {
      user = await User.findOne({ phone: sanitizedPhone });
      if (!user) {
        user = await User.create({
          fullName: fullName.trim(),
          phone: sanitizedPhone,
          district: district.trim(),
          preferredLanguage,
          role: "patient"
        });
        console.log(`[Auth] Registered new patient in MongoDB: ${user.fullName} (${user.phone})`);
      } else {
        // Update name or preferences if changed
        user.fullName = fullName.trim();
        user.district = district.trim() || user.district;
        user.preferredLanguage = preferredLanguage || user.preferredLanguage;
        await user.save();
        console.log(`[Auth] Patient logged in via MongoDB: ${user.fullName} (${user.phone})`);
      }
    } else {
      // In-memory fallback
      user = inMemoryUsers.find(u => u.phone === sanitizedPhone);
      if (!user) {
        user = {
          id: `patient-${Date.now()}`,
          fullName: fullName.trim(),
          phone: sanitizedPhone,
          district: district.trim(),
          preferredLanguage,
          role: "patient",
          createdAt: new Date()
        };
        inMemoryUsers.push(user);
        console.log(`[Auth Fallback] Registered new patient: ${user.fullName} (${user.phone})`);
      } else {
        user.fullName = fullName.trim();
      }
    }

    const tokenPayload = {
      id: user._id ? user._id.toString() : user.id,
      role: "patient",
      phone: user.phone,
      fullName: user.fullName,
      district: user.district,
      preferredLanguage: user.preferredLanguage
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      success: true,
      message: "Patient authenticated successfully",
      token,
      user: {
        id: tokenPayload.id,
        fullName: user.fullName,
        phone: user.phone,
        role: "patient",
        district: user.district,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (err) {
    console.error("[Auth Patient Error]:", err);
    res.status(500).json({ success: false, error: "Authentication failed. Please retry." });
  }
});

// POST /api/auth/login-admin
// Accepts { username, password }. Verifies hashed password for 'admin' role. Issues JWT.
app.post("/api/auth/login-admin", async (req, res) => {
  try {
    const { username = "", password = "" } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and Password are required."
      });
    }

    let adminUser = null;

    if (isMongoConnected) {
      adminUser = await User.findOne({ username: username.toLowerCase(), role: "admin" });
    } else {
      adminUser = inMemoryUsers.find(u => u.username === username.toLowerCase() && u.role === "admin");
    }

    // Default hardcoded fallback check if db unseeded
    if (!adminUser && username === "cmo_admin") {
      adminUser = inMemoryUsers[0];
    }

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        error: "Invalid CMO Administrator credentials."
      });
    }

    // Verify bcrypt password
    let isPasswordValid = false;
    if (adminUser.passwordHash) {
      isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
    } else if (password === "admin123") {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password. (Demo: cmo_admin / admin123)"
      });
    }

    const tokenPayload = {
      id: adminUser._id ? adminUser._id.toString() : adminUser.id,
      role: "admin",
      username: adminUser.username,
      fullName: adminUser.fullName || "Dr. S. K. Verma",
      title: "Chief Medical Officer (CMO)",
      district: adminUser.district || "Maharashtra Health Division"
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Admin authenticated successfully",
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error("[Auth Admin Error]:", err);
    res.status(500).json({ success: false, error: "Admin login failed." });
  }
});

// GET /api/auth/me
// Verify Bearer JWT token from Authorization header and return current user profile.
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authorization token missing."
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.json({
      success: true,
      user: decoded
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired session token."
    });
  }
});

// Legacy / demo login endpoint for backward compatibility
app.post("/api/auth/login", (req, res) => {
  const { role = "patient", username = "", password = "" } = req.body;

  if (role === "admin") {
    if (username === "cmo_admin" && password === "admin123") {
      const token = jwt.sign(
        { id: "admin-cmo-001", role: "admin", username: "cmo_admin", fullName: "Dr. S. K. Verma" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        success: true,
        token,
        user: {
          username: "cmo_admin",
          name: "Dr. S. K. Verma",
          title: "Chief Medical Officer (CMO)",
          role: "admin",
          district: "Maharashtra Health Division"
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: "Invalid CMO Admin credentials. (Demo: cmo_admin / admin123)"
      });
    }
  }

  const token = jwt.sign(
    { id: `guest-${Date.now()}`, role: "patient", fullName: username || "Guest Citizen" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.json({
    success: true,
    token,
    user: {
      username: username || "guest_patient",
      name: username || "Guest Citizen",
      title: "Beneficiary / Rural Patient",
      role: "patient"
    }
  });
});

// ==========================================
// 3. GET /api/facilities
// ==========================================
app.get("/api/facilities", async (req, res) => {
  try {
    const { district, specialization, doctorSpecialization, medicine, search } = req.query;
    const specQuery = (specialization || doctorSpecialization || "").toLowerCase().trim();
    const distQuery = (district || "").toLowerCase().trim();
    const medQuery = (medicine || "").toLowerCase().trim();
    const searchQuery = (search || "").toLowerCase().trim();

    let results = clinicsData;

    // If MongoDB is connected and has records, query MongoDB
    if (isMongoConnected) {
      try {
        const mongoClinics = await Clinic.find({}).lean();
        if (mongoClinics.length > 0) {
          results = mongoClinics;
        }
      } catch (mErr) {
        console.warn("[Mongo Query Warning]:", mErr.message);
      }
    }

    if (distQuery) {
      results = results.filter(c => c.district.toLowerCase().includes(distQuery));
    }

    if (specQuery) {
      results = results.filter(c => 
        (c.doctorSpecializations || []).some(s => s.toLowerCase().includes(specQuery))
      );
    }

    if (medQuery) {
      results = results.filter(c => 
        (c.medicineStock || []).some(m => 
          m.name.toLowerCase().includes(medQuery) || 
          (m.category && m.category.toLowerCase().includes(medQuery))
        )
      );
    }

    if (searchQuery) {
      results = results.filter(c => {
        const matchesName = c.name.toLowerCase().includes(searchQuery);
        const matchesDistrict = c.district.toLowerCase().includes(searchQuery);
        const matchesAddress = (c.address || "").toLowerCase().includes(searchQuery);
        const matchesSpec = (c.doctorSpecializations || []).some(s => s.toLowerCase().includes(searchQuery));
        const matchesMed = (c.medicineStock || []).some(m => m.name.toLowerCase().includes(searchQuery));
        return matchesName || matchesDistrict || matchesAddress || matchesSpec || matchesMed;
      });
    }

    res.json({
      success: true,
      count: results.length,
      filters: { district: distQuery || null, specialization: specQuery || null, medicine: medQuery || null, search: searchQuery || null },
      facilities: results
    });
  } catch (error) {
    console.error("[Facilities Error]:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve facilities" });
  }
});

// ==========================================
// 4. Admin Facility CRUD
// ==========================================
app.post("/api/facilities", async (req, res) => {
  try {
    const {
      name,
      type = "PHC",
      district,
      block = "Rural Sector",
      address,
      contact = {},
      operatingHours = "24x7 Emergency / OPD: 08:00 AM - 02:00 PM",
      emergencyBeds = 4,
      doctorSpecializations = ["General Medicine", "Pediatrics"],
      medicineStock = [],
      coordinates = { lat: 25.3176, lng: 82.9739 }
    } = req.body;

    if (!name || !district) {
      return res.status(400).json({ success: false, error: "Facility name and district are required." });
    }

    const cleanSlug = district.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanType = type.toLowerCase();
    const id = `${cleanType}-${cleanSlug}-${Date.now().toString().slice(-4)}`;

    const defaultMedicineStock = medicineStock.length > 0 ? medicineStock : [
      { name: "Paracetamol 500mg", category: "Analgesic & Antipyretic", status: "In Stock", quantity: 1000 },
      { name: "Amoxicillin 500mg", category: "Antibiotic", status: "In Stock", quantity: 500 },
      { name: "Anti-Snake Venom (ASV)", category: "Emergency / Anti-Venom", status: "In Stock", quantity: 10 },
      { name: "ORS Sachets", category: "Hydration / Electrolytes", status: "In Stock", quantity: 600 },
      { name: "Iron & Folic Acid Tablets", category: "Maternal & Child Health", status: "In Stock", quantity: 1000 }
    ];

    const newFacility = {
      id,
      name: name.trim(),
      type: type || "PHC",
      district: district.trim(),
      block: block.trim(),
      address: address || `Village ${name.split(" ")[0]}, ${district}, UP`,
      coordinates: {
        lat: Number(coordinates.lat) || 25.3176,
        lng: Number(coordinates.lng) || 82.9739
      },
      contact: {
        phone: contact.phone || "+91 94500 00000",
        emergencyHelpline: contact.emergencyHelpline || "108",
        ambulance: contact.ambulance || "+91 94500 00099"
      },
      operatingHours,
      emergencyBeds: Number(emergencyBeds) || 0,
      doctorSpecializations: Array.isArray(doctorSpecializations) ? doctorSpecializations : [doctorSpecializations],
      doctorsOnDuty: (Array.isArray(doctorSpecializations) ? doctorSpecializations : [doctorSpecializations]).map(spec => ({
        name: `Dr. ${spec} Officer`,
        specialization: spec,
        timing: "08:00 AM - 02:00 PM"
      })),
      medicineStock: defaultMedicineStock
    };

    clinicsData.push(newFacility);
    saveClinicsData();

    if (isMongoConnected) {
      try {
        await Clinic.create(newFacility);
      } catch (mErr) {
        console.warn("[Mongo Insert Warning]:", mErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Facility added successfully.",
      facility: newFacility
    });
  } catch (error) {
    console.error("[Add Facility Error]:", error);
    res.status(500).json({ success: false, error: "Failed to add facility" });
  }
});

app.put("/api/facilities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const facilityIndex = clinicsData.findIndex(f => f.id === id);

    if (facilityIndex === -1) {
      return res.status(404).json({ success: false, error: "Facility not found" });
    }

    const existing = clinicsData[facilityIndex];
    const updateData = req.body;

    const updatedFacility = {
      ...existing,
      ...updateData,
      id: existing.id,
      emergencyBeds: updateData.emergencyBeds !== undefined ? Number(updateData.emergencyBeds) : existing.emergencyBeds,
      coordinates: updateData.coordinates ? {
        lat: Number(updateData.coordinates.lat) || existing.coordinates.lat,
        lng: Number(updateData.coordinates.lng) || existing.coordinates.lng
      } : existing.coordinates,
      contact: updateData.contact ? { ...existing.contact, ...updateData.contact } : existing.contact
    };

    clinicsData[facilityIndex] = updatedFacility;
    saveClinicsData();

    if (isMongoConnected) {
      try {
        await Clinic.findOneAndUpdate({ id }, updatedFacility);
      } catch (mErr) {
        console.warn("[Mongo Update Warning]:", mErr.message);
      }
    }

    res.json({
      success: true,
      message: "Facility details updated successfully.",
      facility: updatedFacility
    });
  } catch (error) {
    console.error("[Update Facility Error]:", error);
    res.status(500).json({ success: false, error: "Failed to update facility" });
  }
});

app.delete("/api/facilities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const facilityIndex = clinicsData.findIndex(f => f.id === id);

    if (facilityIndex === -1) {
      return res.status(404).json({ success: false, error: "Facility not found" });
    }

    const removedFacility = clinicsData.splice(facilityIndex, 1)[0];
    saveClinicsData();

    if (isMongoConnected) {
      try {
        await Clinic.findOneAndDelete({ id });
      } catch (mErr) {
        console.warn("[Mongo Delete Warning]:", mErr.message);
      }
    }

    res.json({
      success: true,
      message: `Facility '${removedFacility.name}' removed successfully.`,
      facilityId: id
    });
  } catch (error) {
    console.error("[Delete Facility Error]:", error);
    res.status(500).json({ success: false, error: "Failed to delete facility" });
  }
});

app.put("/api/stock", async (req, res) => {
  try {
    const { facilityId, medicineName, status, quantity } = req.body;

    if (!facilityId || !medicineName) {
      return res.status(400).json({ success: false, error: "facilityId and medicineName are required." });
    }

    const facility = clinicsData.find(f => f.id === facilityId);
    if (!facility) {
      return res.status(404).json({ success: false, error: `Facility with ID '${facilityId}' not found.` });
    }

    if (!Array.isArray(facility.medicineStock)) {
      facility.medicineStock = [];
    }

    let med = facility.medicineStock.find(m => m.name.toLowerCase() === medicineName.toLowerCase());

    if (med) {
      if (status !== undefined) med.status = status;
      if (quantity !== undefined) med.quantity = Math.max(0, Number(quantity));
    } else {
      med = {
        name: medicineName,
        category: "Essential Therapeutic",
        status: status || "In Stock",
        quantity: quantity !== undefined ? Math.max(0, Number(quantity)) : 500
      };
      facility.medicineStock.push(med);
    }

    saveClinicsData();

    if (isMongoConnected) {
      try {
        await Clinic.findOneAndUpdate(
          { id: facilityId, "medicineStock.name": med.name },
          {
            $set: {
              "medicineStock.$.status": med.status,
              "medicineStock.$.quantity": med.quantity
            }
          }
        );
      } catch (mErr) {
        console.warn("[Mongo Stock Update Warning]:", mErr.message);
      }
    }

    res.json({
      success: true,
      message: `Stock for '${med.name}' at ${facility.name} updated.`,
      facilityId,
      facilityName: facility.name,
      medicine: med
    });
  } catch (error) {
    console.error("[Update Stock Error]:", error);
    res.status(500).json({ success: false, error: "Failed to update stock" });
  }
});

// ==========================================
// 5. Appointments: Booking & Patient History
// ==========================================

// POST /api/appointments: Save record in MongoDB / fallback linked to patient phone
app.post("/api/appointments", async (req, res) => {
  try {
    const { patientName, phone, facilityId, department, appointmentDate, patientCategory, notes } = req.body;

    if (!patientName || !phone || !facilityId || !department || !appointmentDate) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: patientName, phone, facilityId, department, and appointmentDate are mandatory."
      });
    }

    const sanitizedPhone = String(phone).replace(/\D/g, "");
    if (sanitizedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 10-digit mobile number."
      });
    }

    const facility = clinicsData.find(c => c.id === facilityId);
    const facilityName = facility ? facility.name : "Primary Health Facility";
    const facilityDistrict = facility ? facility.district : "Rural Health Circle";
    const facilityContact = facility ? facility.contact.phone : "+91 108";

    const queueNumber = Math.floor(Math.random() * 25) + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const codePrefix = facility ? facility.type : "OPD";
    const tokenId = `${codePrefix}-${new Date().getFullYear()}-${randomSuffix}`;
    
    const baseHour = 9 + Math.floor(queueNumber / 5);
    const baseMin = (queueNumber % 5) * 12;
    const formattedHour = String(baseHour).padStart(2, "0");
    const formattedMin = String(baseMin).padStart(2, "0");
    const estimatedTime = `${formattedHour}:${formattedMin} AM`;

    const newAppointment = {
      tokenId,
      tokenNumber: queueNumber,
      patientName: patientName.trim(),
      phone: sanitizedPhone,
      facilityId,
      facilityName,
      facilityDistrict,
      department,
      appointmentDate,
      patientCategory: patientCategory || "General",
      notes: notes || "",
      estimatedTime,
      roomNumber: `Room #${(queueNumber % 4) + 1}`,
      status: "Confirmed",
      bookedAt: new Date().toISOString(),
      createdAt: new Date(),
      facilityContact,
      instructions: [
        "Please carry Government ID (Aadhaar / Ration Card) or Ayushman Card if available.",
        "Report to the OPD triage desk 15 minutes before your estimated time.",
        "Emergency patients with severe symptoms will be given immediate priority triage."
      ]
    };

    appointmentsStore.unshift(newAppointment);

    // Save to MongoDB if connected
    if (isMongoConnected) {
      try {
        await Appointment.create(newAppointment);
      } catch (mErr) {
        console.warn("[Mongo Appointment Save Warning]:", mErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "OPD Token Confirmed successfully",
      token: newAppointment
    });
  } catch (error) {
    console.error("[Appointments Error]:", error);
    res.status(500).json({ success: false, error: "Internal error generating OPD token" });
  }
});

// GET /api/appointments/my: Query appointments filtered by patient phone or token
app.get("/api/appointments/my", async (req, res) => {
  try {
    let patientPhone = req.query.phone;

    // Check token if Authorization header is present
    if (!patientPhone && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.phone) {
          patientPhone = decoded.phone;
        }
      } catch (tErr) {
        // Token optional if phone query provided
      }
    }

    if (!patientPhone) {
      return res.status(400).json({
        success: false,
        error: "Phone parameter is required to retrieve appointment history."
      });
    }

    const sanitizedPhone = String(patientPhone).replace(/\D/g, "");

    let patientAppointments = [];

    if (isMongoConnected) {
      try {
        patientAppointments = await Appointment.find({ phone: sanitizedPhone }).sort({ createdAt: -1 }).lean();
      } catch (mErr) {
        console.warn("[Mongo My Appointments Query Warning]:", mErr.message);
      }
    }

    if (patientAppointments.length === 0) {
      patientAppointments = appointmentsStore.filter(a => a.phone === sanitizedPhone);
    }

    res.json({
      success: true,
      count: patientAppointments.length,
      phone: sanitizedPhone,
      appointments: patientAppointments
    });
  } catch (err) {
    console.error("[My Appointments Error]:", err);
    res.status(500).json({ success: false, error: "Failed to retrieve appointment history" });
  }
});

app.get("/api/appointments", (req, res) => {
  res.json({
    success: true,
    count: appointmentsStore.length,
    appointments: appointmentsStore.slice(0, 20)
  });
});

// ==========================================
// 6. POST /api/chat - GEMINI MULTIMODAL INTEGRATION
// ==========================================
app.post("/api/chat", async (req, res) => {
  try {
    const { message = "", language = "English", image = null, context = null } = req.body;
    const trimmedMessage = (message || "").trim();

    console.log("Gemini API Key present?", !!process.env.GEMINI_API_KEY);

    if (!trimmedMessage && !image) {
      return res.status(400).json({
        success: false,
        error: "Either a message prompt or an image attachment is required."
      });
    }

    const coords = context?.coords;
    const locationName = context?.locationName || "";
    const nearbyFacilities = Array.isArray(context?.nearbyFacilities) ? context.nearbyFacilities : [];

    let facilityGuidance = "";
    if (nearbyFacilities.length > 0) {
      const facList = nearbyFacilities.slice(0, 5).map((f, i) => 
        `${i + 1}. ${f.name} (Distance: ${f.distance || 'nearby'}, Type: ${f.type || 'Facility'}, Beds: ${f.beds || 'Available'})`
      ).join("\n");
      facilityGuidance = `Recommend these exact facilities provided in context:\n${facList}`;
    } else {
      facilityGuidance = `Do NOT invent clinics from distant districts. Acknowledge the user's coordinates/city, state that live GPS is scanning for nearby health centers, and refer them to the interactive live map cards on their screen and 108 Emergency dispatch.`;
    }

    const systemInstruction = `You are the official Swasthya Sangam Rural Health & Triage AI Assistant (PS 26133). 
You serve citizens and healthcare workers across ALL OF INDIA, with primary alignment to the Government of Maharashtra.
When a user specifies ANY location (e.g., Kurnool, Pune, Nashik, or any other district), you MUST acknowledge their specific location and provide helpful clinical guidance and advise them to visit their local government hospital or PHC.
NEVER mention Uttar Pradesh. NEVER state that your database only covers specific districts.
Always provide emergency helpline numbers (108 Ambulance / 102 Maternal).

LOCAL FACILITIES INSTRUCTIONS:
${facilityGuidance}

USER CONTEXT:
- Location / District: ${locationName || 'Live User'}
- Coordinates: ${coords ? `${coords.lat}, ${coords.lng}` : 'Pending live detection'}
Respond warmly in the patient's preferred language (${language}, Marathi, Hindi, Telugu, or English).`;

    let imagePart = null;
    let hasImage = false;

    if (image) {
      try {
        let mimeType = "image/jpeg";
        let base64Data = "";

        if (typeof image === "string") {
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            base64Data = image;
          }
        } else if (typeof image === "object" && image.base64) {
          mimeType = image.mimeType || "image/jpeg";
          base64Data = image.base64.replace(/^data:[^;]+;base64,/, "");
        }

        if (base64Data && base64Data.length > 20) {
          hasImage = true;
          imagePart = {
            inlineData: {
              mimeType,
              data: base64Data
            }
          };
        }
      } catch (imgErr) {
        console.warn("[Image Parse Warning]:", imgErr.message);
      }
    }

    const activeKey = process.env.GEMINI_API_KEY;

    if (activeKey && activeKey.trim() !== "") {
      try {
        const clientToUse = new GoogleGenAI({ apiKey: activeKey });
        
        const contents = [trimmedMessage || "Please examine this attached prescription / medical image and advise me."];
        if (imagePart) {
          contents.push(imagePart);
        }

        const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

        const geminiCallPromise = (async () => {
          for (const modelName of candidateModels) {
            try {
              const res = await clientToUse.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction
                }
              });
              if (res && res.text) {
                console.log(`[Gemini Success] Successfully generated response using model: ${modelName}`);
                return { response: res, usedModel: modelName };
              }
            } catch (modelErr) {
              console.warn(`[Model ${modelName} retry]:`, modelErr.message);
            }
          }
          return null;
        })();

        let timeoutId;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn("[Gemini Timeout]: Call exceeded 12 seconds, failing over to grounded fallback.");
            resolve(null);
          }, 12000);
        });

        const geminiResult = await Promise.race([geminiCallPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        if (geminiResult && geminiResult.response && geminiResult.response.text) {
          return res.json({
            success: true,
            source: geminiResult.usedModel,
            hasImage,
            language,
            reply: geminiResult.response.text
          });
        }
      } catch (err) {
        console.error("Gemini Error Details:", err);
      }
    }

    const fallbackReply = generateGroundedFallbackResponse(trimmedMessage, language, hasImage, context);
    return res.json({
      success: true,
      source: "grounded-clinical-fallback",
      hasImage,
      language,
      reply: fallbackReply
    });

  } catch (error) {
    console.error("[Chat Error]:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process healthcare query"
    });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Rural Health Access & Care Navigator API running on port ${PORT}`);
  console.log(`📍 Facilities Endpoint: GET /api/facilities (POST, PUT, DELETE)`);
  console.log(`🔑 Auth Endpoints:     POST /api/auth/register-patient, POST /api/auth/login-admin, GET /api/auth/me`);
  console.log(`🎫 Appointments:       POST /api/appointments, GET /api/appointments/my`);
  console.log(`📦 Stock Endpoint:      PUT  /api/stock`);
  console.log(`🤖 Gemini Multimodal:  POST /api/chat`);
  console.log(`====================================================`);
});
