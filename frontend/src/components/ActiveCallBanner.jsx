import React, { useState, useEffect } from 'react';

export default function ActiveCallBanner({
  activeCall,
  onMaximize,
  onEndCall
}) {
  const [seconds, setSeconds] = useState(activeCall?.duration || 0);

  useEffect(() => {
    if (!activeCall) return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const title = activeCall.doctor?.name || activeCall.serviceName || 'Active Healthcare Consultation';
  const subtitle = activeCall.doctor?.specialization || 'Live WebRTC Audio/Video Connection';

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-sky-500/40 rounded-3xl p-3 shadow-2xl flex items-center gap-3.5 max-w-md">
        
        {/* Pulsing Call Avatar */}
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Call Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
              {title}
            </h4>
            <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {formatTimer(seconds)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
            {subtitle}
          </p>
        </div>

        {/* Maximize & End Buttons */}
        <div className="flex items-center gap-2 border-l border-slate-700/80 pl-3">
          <button
            type="button"
            onClick={() => onMaximize(activeCall)}
            className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer"
            title="Expand to Full Video Call"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={onEndCall}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
            title="End Call"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
              <line x1="22" y1="2" x2="2" y2="22"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
