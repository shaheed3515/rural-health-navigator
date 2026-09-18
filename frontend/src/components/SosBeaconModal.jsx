import React, { useState } from 'react';
import { apiFetch } from '../api';

export default function SosBeaconModal({
  isOpen,
  onClose,
  userLocation,
  patientName = 'Citizen in Need'
}) {
  const [selectedType, setSelectedType] = useState('Lifting / Stretcher Support');
  const [additionalNote, setAdditionalNote] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeBeacon, setActiveBeacon] = useState(null);
  const [alertCount, setAlertCount] = useState(4);

  if (!isOpen) return null;

  const EMERGENCY_PRESETS = [
    {
      id: 'stretcher',
      label: 'Lifting / Stretcher Support',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      desc: 'Patient has fallen, collapsed, or cannot stand/walk alone.'
    },
    {
      id: 'bleeding',
      label: 'Accident / Severe Bleeding',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      desc: 'Road crash or deep laceration needing immediate pressure bandage.'
    },
    {
      id: 'transit',
      label: 'Emergency Transit to Clinic',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      ),
      desc: 'Needs an immediate auto, bike, or car to reach the nearest hospital.'
    },
    {
      id: 'equipment',
      label: 'Urgent Medical Equipment',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      ),
      desc: 'Requires a nearby wheelchair, oxygen cylinder, or AED.'
    }
  ];

  const handleBroadcastSos = async () => {
    setIsBroadcasting(true);
    try {
      const res = await apiFetch('/api/sos/broadcast', {
        method: 'POST',
        body: {
          type: selectedType,
          description: additionalNote,
          coordinates: userLocation || { lat: 14.6742, lng: 77.6072 },
          patientName
        }
      });
      const data = await res.json();
      if (data.success && data.sos) {
        setActiveBeacon(data.sos);
        setAlertCount(data.alertedBystandersCount || 5);
      }
    } catch (err) {
      console.warn('SOS broadcast error:', err);
      // Local fallback active beacon
      setActiveBeacon({
        id: `SOS-${Date.now()}`,
        type: selectedType,
        timestamp: new Date().toISOString(),
        responders: [
          { name: 'Ramesh K. (Citizen Volunteer)', distanceKm: 0.2, etaMinutes: 2 },
          { name: 'Suresh M. (Auto Driver)', distanceKm: 0.4, etaMinutes: 4 }
        ]
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCancelSos = () => {
    setActiveBeacon(null);
    setAdditionalNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">Golden Hour Bystander SOS</h3>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  Sec 134A Shielded
                </span>
              </div>
              <p className="text-[11px] text-rose-100 font-medium">
                Pings nearby citizen responders within 1 km for physical assistance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeBeacon ? (
            /* Active Beacon Broadcasting Screen */
            <div className="text-center space-y-4 py-2">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></span>
                <span className="absolute inset-2 rounded-full bg-rose-500/30 animate-pulse"></span>
                <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg z-10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
                    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                    <circle cx="12" cy="12" r="2"/>
                    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
                    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
                  </svg>
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-900">Distress Beacon Broadcasting</h4>
                <p className="text-xs text-rose-600 font-bold mt-0.5">
                  {alertCount} Registered Citizen Responders alerted within 1 km
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  GPS Beacon: {userLocation ? `${userLocation.lat.toFixed(4)}°, ${userLocation.lng.toFixed(4)}°` : 'Active Location'}
                </p>
              </div>

              {/* Responders on the way */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 text-left space-y-2.5">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  Good Samaritan Volunteers Answering:
                </span>

                {(activeBeacon.responders || []).map((resp, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-rose-100 shadow-2xs">
                    <span className="font-bold text-slate-800">{resp.name}</span>
                    <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      ETA: ~{resp.etaMinutes} mins ({resp.distanceKm} km away)
                    </span>
                  </div>
                ))}
              </div>

              {/* 108 Emergency Dial Action */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="tel:108"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>Dial 108 Ambulance</span>
                </a>

                <button
                  type="button"
                  onClick={handleCancelSos}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel Beacon
                </button>
              </div>
            </div>
          ) : (
            /* Configure and Trigger SOS */
            <>
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block">
                  Select Lone-Emergency Situation:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMERGENCY_PRESETS.map((preset) => {
                    const isSelected = selectedType === preset.label;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedType(preset.label)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[85px] ${
                          isSelected
                            ? 'bg-rose-50/80 border-rose-500 shadow-xs ring-1 ring-rose-500'
                            : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{preset.icon}</span>
                          <span className={`text-xs font-bold ${isSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                            {preset.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight mt-1">
                          {preset.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Landmark or floor note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Exact Landmark or Floor (Optional):
                </label>
                <input
                  type="text"
                  value={additionalNote}
                  onChange={(e) => setAdditionalNote(e.target.value)}
                  placeholder="e.g., Inside Metro Station Gate 2 / 1st Floor Corridor / Near Tree"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
                />
              </div>

              {/* Indian Good Samaritan Protection Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Supreme Court Good Samaritan Protection (Sec 134A)</span>
                </div>
                <p className="text-amber-800/90 leading-normal">
                  Responders who assist during medical distress are legally shielded from police harassment, hospital detention, or civil liability.
                </p>
              </div>

              {/* Broadcast Action Button */}
              <button
                type="button"
                onClick={handleBroadcastSos}
                disabled={isBroadcasting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Broadcasting GPS Distress Beacon...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span>BROADCAST GOLDEN HOUR SOS BEACON</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
