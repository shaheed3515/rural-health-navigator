import React, { useState } from 'react';
import { apiFetch } from '../api';

export default function DoctorRosterModal({
  isOpen,
  onClose,
  facility,
  onBookToken,
  onRosterUpdated,
  isAdmin = false
}) {
  const [updatingDocId, setUpdatingDocId] = useState(null);
  const [localRoster, setLocalRoster] = useState(facility?.doctorRoster || facility?.doctorsOnDuty || []);

  // Sync roster when facility changes
  React.useEffect(() => {
    setLocalRoster(facility?.doctorRoster || facility?.doctorsOnDuty || []);
  }, [facility]);

  if (!isOpen || !facility) return null;

  const handleStatusChange = async (doctorId, newStatus) => {
    setUpdatingDocId(doctorId);
    try {
      const res = await apiFetch(`/api/facilities/${facility.id || facility._id}/doctors/${doctorId}/status`, {
        method: 'PUT',
        body: { dutyStatus: newStatus }
      });
      const data = await res.json();
      if (data.success && data.doctor) {
        const updated = localRoster.map((d) => (d.id === doctorId ? { ...d, ...data.doctor } : d));
        setLocalRoster(updated);
        if (onRosterUpdated) onRosterUpdated(facility.id, updated);
      }
    } catch (err) {
      console.error('Failed to update doctor status:', err);
    } finally {
      setUpdatingDocId(null);
    }
  };

  const onDutyCount = localRoster.filter(d => (d.dutyStatus || 'ON_DUTY') === 'ON_DUTY').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1d68bd] to-[#15529a] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                {facility.type || 'HOSPITAL / CHC'}
              </span>
              <span className="bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                {onDutyCount} Doctors Available Now
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold leading-snug">{facility.name}</h2>
            <p className="text-xs text-sky-100 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
              </svg>
              {facility.address || facility.district}
            </p>
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

        {/* Doctor Roster List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 divide-y divide-slate-100 flex-1">
          <div className="flex items-center justify-between pb-1 text-xs text-slate-500 font-semibold">
            <span>Verified Shift & OPD Schedule</span>
            <span>Real-time OPD Token Queue</span>
          </div>

          {localRoster.map((doc, idx) => {
            const status = doc.dutyStatus || (idx === 0 ? 'ON_DUTY' : 'IN_OT');
            const isOnDuty = status === 'ON_DUTY';
            const isInOT = status === 'IN_OT';

            return (
              <div key={doc.id || idx} className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#e0edfd] border border-[#bfdbfe] text-[#1d68bd] flex items-center justify-center font-bold text-sm shrink-0">
                    {doc.name ? doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase() : 'DR'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                      {/* Status Badge */}
                      {isOnDuty ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          On Duty Now
                        </span>
                      ) : isInOT ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          In Emergency / OT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          Off Duty Today
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#1d68bd] font-semibold mt-0.5">
                      {doc.specialization} <span className="text-slate-400 font-normal">· {doc.qualification || 'MBBS'}</span>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {doc.roomNo || `OPD Room ${101 + idx}`}
                      </span>
                      <span>Timing: {doc.timing || '08:30 AM - 02:00 PM'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Tokens + Action / Clerk Toggle */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-14 sm:pl-0">
                  {isOnDuty ? (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Queue: <span className="text-[#1d68bd]">{doc.tokensCount || 10}</span> ahead
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ~{doc.estimatedWaitMins || 20} min wait
                      </span>
                    </div>
                  ) : isInOT ? (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      Avail in ~45 min
                    </span>
                  ) : null}

                  {/* CMO / Clerk Status Switcher OR Book Token */}
                  {isAdmin ? (
                    <select
                      value={status}
                      disabled={updatingDocId === doc.id}
                      onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                      className="text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg p-1.5 text-slate-700 cursor-pointer"
                    >
                      <option value="ON_DUTY">Active - On Duty</option>
                      <option value="IN_OT">Active - In OT / Emergency</option>
                      <option value="OFF_DUTY">Off Duty / Off Shift</option>
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onBookToken) onBookToken(facility, doc);
                      }}
                      disabled={!isOnDuty}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                        isOnDuty
                          ? 'bg-[#1d68bd] hover:bg-[#15529a] text-white'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Book Token
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d68bd" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>OPD Reception: <strong className="text-slate-800">{facility.contact?.phone || 'Dial 108'}</strong></span>
          </div>

          <a
            href={`tel:${facility.contact?.phone || '108'}`}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
          >
            Call Desk
          </a>
        </div>
      </div>
    </div>
  );
}
