import React from 'react';

export function OfflineBanner({ isOnline, offlineQueueCount, lastSyncTime, onSyncClick, syncing }) {
  return (
    <div className={`w-full py-1.5 px-4 text-xs font-semibold flex items-center justify-between transition-colors border-b ${
      isOnline
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-amber-50 text-amber-900 border-amber-300'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
        <span>
          {isOnline ? (
            <><strong>🟢 Online</strong> • Data synchronized with health grid</>
          ) : (
            <><strong>🟠 Offline Mode</strong> • Limited connectivity. Your changes will sync automatically when back online.</>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[11px]">
        {offlineQueueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold border border-amber-300">
            {offlineQueueCount} Pending Sync
          </span>
        )}
        <span className="hidden sm:inline text-slate-500">
          Last Sync: <strong>{lastSyncTime || 'Today, 10:42 AM'}</strong>
        </span>
        {offlineQueueCount > 0 && isOnline && (
          <button
            type="button"
            onClick={onSyncClick}
            disabled={syncing}
            className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardOfflineWidget({ isOnline, offlineQueueCount, lastSyncTime, onSyncClick, syncing }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Connectivity & Offline Sync Status
        </h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}>
          {isOnline ? '🟢 Online' : '🟠 Offline Mode'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Connection</div>
          <div className="font-bold text-slate-800 mt-0.5">{isOnline ? '🟢 Online' : '🟠 Offline Grid'}</div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Pending Sync</div>
          <div className={`font-bold mt-0.5 ${offlineQueueCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {offlineQueueCount} records
          </div>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="text-[10px] uppercase font-bold text-slate-400">Last Sync</div>
          <div className="font-bold text-slate-800 mt-0.5 truncate" title={lastSyncTime}>
            {lastSyncTime || 'Today, 10:42 AM'}
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-snug">
          You are currently offline. Your patient registrations, appointment bookings, and referral updates are saved locally in IndexedDB and will sync automatically when internet connectivity returns.
        </div>
      )}

      {isOnline && offlineQueueCount > 0 && (
        <button
          type="button"
          onClick={onSyncClick}
          disabled={syncing}
          className="w-full py-2 bg-[#1d68bd] hover:bg-[#15529a] text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
        >
          {syncing ? 'Synchronizing records...' : `Synchronize ${offlineQueueCount} Pending Offline Records`}
        </button>
      )}
    </div>
  );
}
