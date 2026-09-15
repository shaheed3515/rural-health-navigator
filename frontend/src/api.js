/**
 * Centralized API client for Rural Health Access & Care Navigator
 * Supports both local development (Vite proxy) and multi-host cloud deployment (Vercel + Render)
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "health_auth_token";
const USER_KEY = "health_auth_user";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAuth(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Storage error:", e);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Enhanced fetch wrapper that attaches base URL and authorization headers
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    ...options.headers,
  };

  const token = getStoredToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Auto set Content-Type to application/json if sending an object that isn't FormData
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

// Authentication API Helpers
export async function registerPatient(patientData) {
  const res = await apiFetch("/api/auth/register-patient", {
    method: "POST",
    body: patientData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Patient registration failed");
  if (data.token) setStoredAuth(data.token, data.user);
  return data;
}

export async function loginAdmin(credentials) {
  const res = await apiFetch("/api/auth/login-admin", {
    method: "POST",
    body: credentials,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Admin login failed");
  if (data.token) setStoredAuth(data.token, data.user);
  return data;
}

export async function verifyCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await apiFetch("/api/auth/me");
    if (!res.ok) {
      clearStoredAuth();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch (err) {
    console.warn("Auth verification error:", err);
    return null;
  }
}

export async function fetchMyAppointments(phone) {
  const query = phone ? `?phone=${encodeURIComponent(phone)}` : "";
  const res = await apiFetch(`/api/appointments/my${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch appointments");
  return data.appointments || [];
}
