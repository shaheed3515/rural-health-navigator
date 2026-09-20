const DB_NAME = 'RuralHealthNavigatorDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('patient_profiles')) {
        db.createObjectStore('patient_profiles', { keyPath: 'phone' });
      }
      if (!db.objectStoreNames.contains('health_records')) {
        db.createObjectStore('health_records', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_facilities')) {
        db.createObjectStore('cached_facilities', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_medicines')) {
        db.createObjectStore('cached_medicines', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_registrations')) {
        db.createObjectStore('pending_registrations', { keyPath: 'phone' });
      }
      if (!db.objectStoreNames.contains('pending_appointments')) {
        db.createObjectStore('pending_appointments', { keyPath: 'tokenId' });
      }
      if (!db.objectStoreNames.contains('pending_referrals')) {
        db.createObjectStore('pending_referrals', { keyPath: 'tokenId' });
      }
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbPut(storeName, item) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB Put Error] ${storeName}:`, err);
  }
}

export async function dbGetAll(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB GetAll Error] ${storeName}:`, err);
    return [];
  }
}

export async function dbGet(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB Get Error] ${storeName} key ${key}:`, err);
    return null;
  }
}

export async function dbDelete(storeName, key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB Delete Error] ${storeName} key ${key}:`, err);
  }
}

export async function dbClear(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB Clear Error] ${storeName}:`, err);
  }
}

// Higher-level Offline Storage Helpers
export async function saveLastSyncTime(timestamp = new Date().toLocaleString()) {
  await dbPut('sync_metadata', { key: 'last_sync_time', value: timestamp });
  try {
    localStorage.setItem('health_last_sync_timestamp', timestamp);
  } catch (e) {}
}

export async function getLastSyncTime() {
  const meta = await dbGet('sync_metadata', 'last_sync_time');
  if (meta && meta.value) return meta.value;
  try {
    return localStorage.getItem('health_last_sync_timestamp') || 'Today, 10:42 AM';
  } catch {
    return 'Today, 10:42 AM';
  }
}

export async function cacheFacilitiesInDB(facilities) {
  if (!Array.isArray(facilities)) return;
  for (const f of facilities) {
    if (f && (f.id || f._id)) {
      const item = { ...f, id: String(f.id || f._id), cachedAt: new Date().toLocaleString() };
      await dbPut('cached_facilities', item);
    }
  }
  await saveLastSyncTime();
}

export async function getCachedFacilitiesFromDB() {
  const list = await dbGetAll('cached_facilities');
  return list && list.length > 0 ? list : [];
}

export async function cacheMedicinesInDB(medicines) {
  if (!Array.isArray(medicines)) return;
  for (const m of medicines) {
    if (m && m.id) {
      await dbPut('cached_medicines', { ...m, id: String(m.id), cachedAt: new Date().toLocaleString() });
    }
  }
}

export async function getCachedMedicinesFromDB() {
  return await dbGetAll('cached_medicines');
}

export async function savePendingRegistrationDB(patientData) {
  const item = {
    ...patientData,
    phone: String(patientData.phone).replace(/\D/g, ''),
    status: 'Pending Sync',
    savedAt: new Date().toISOString()
  };
  await dbPut('pending_registrations', item);
  await dbPut('patient_profiles', { ...item, status: 'Offline Profile' });
  return item;
}

export async function savePendingAppointmentDB(appointment) {
  const item = {
    ...appointment,
    status: 'Pending Sync',
    isOfflinePending: true,
    savedAt: new Date().toISOString()
  };
  await dbPut('pending_appointments', item);
  return item;
}

export async function savePendingReferralDB(referral) {
  const item = {
    ...referral,
    status: 'Pending Sync',
    isOfflinePending: true,
    savedAt: new Date().toISOString()
  };
  await dbPut('pending_referrals', item);
  return item;
}

export async function getPendingItemsDB() {
  const regs = await dbGetAll('pending_registrations');
  const apts = await dbGetAll('pending_appointments');
  const refs = await dbGetAll('pending_referrals');
  return {
    registrations: regs || [],
    appointments: apts || [],
    referrals: refs || []
  };
}

export async function clearPendingItemsDB() {
  await dbClear('pending_registrations');
  await dbClear('pending_appointments');
  await dbClear('pending_referrals');
}
