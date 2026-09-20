import { apiFetch } from '../api';
import {
  getPendingItemsDB,
  clearPendingItemsDB,
  saveLastSyncTime
} from './offlineStorage';

export async function processAutomaticSync() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, isOffline: true, message: 'Currently offline. Sync deferred.' };
  }

  try {
    const pending = await getPendingItemsDB();
    const hasRegistrations = pending.registrations && pending.registrations.length > 0;
    const hasAppointments = pending.appointments && pending.appointments.length > 0;
    const hasReferrals = pending.referrals && pending.referrals.length > 0;

    if (!hasRegistrations && !hasAppointments && !hasReferrals) {
      return { success: true, count: 0, message: 'All items are up to date.' };
    }

    const payload = {
      registrations: pending.registrations || [],
      appointments: [...(pending.appointments || []), ...(pending.referrals || [])]
    };

    const res = await apiFetch('/api/sync/offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      await clearPendingItemsDB();
      const nowStr = new Date().toLocaleString();
      await saveLastSyncTime(nowStr);

      return {
        success: true,
        count: (data.syncedAppointments || 0) + (data.syncedRegistrations || 0),
        syncedAppointments: data.syncedAppointments || 0,
        syncedRegistrations: data.syncedRegistrations || 0,
        lastSyncTimestamp: nowStr,
        message: 'All pending offline records synchronized successfully!'
      };
    } else {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[Sync Engine Retry Warning]:', err.message);
    return {
      success: false,
      error: 'Synchronization deferred. Retrying when network connection stabilizes.',
      status: 'Failed - Retry Pending'
    };
  }
}
