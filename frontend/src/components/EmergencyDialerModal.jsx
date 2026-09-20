import React, { useState, useEffect, useRef } from 'react';
import {
  playDtmfTone,
  playConnectedChime,
  playDisconnectedTone,
  RingbackTonePlayer
} from '../utils/audioSynthesizer';

const EMERGENCY_SERVICES = [
  {
    number: '108',
    name: 'National Emergency Ambulance',
    dept: 'Immediate Life-Threatening & Trauma Dispatch',
    color: 'from-rose-600 to-red-700',
    badge: 'Trauma & ICU',
    dispatcherPrompt: '108 Emergency Control Center. We have received your live GPS telemetry. Ambulance Unit 108-AP is dispatched to your location.'
  },
  {
    number: '104',
    name: 'State Health Advice Helpline',
    dept: '24x7 Tele-Doctor & Symptom Guidance',
    color: 'from-sky-600 to-blue-700',
    badge: 'Medical Advice',
    dispatcherPrompt: '104 Medical Information Officer on line. How may I assist you with clinical guidance today?'
  },
  {
    number: '102',
    name: 'Janani Shishu Suraksha (JSSK)',
    dept: 'Maternal, Neonatal & Infant Hospital Transport',
    color: 'from-emerald-600 to-teal-700',
    badge: 'Maternal Transport',
    dispatcherPrompt: '102 Janani Shishu Helpline. Connecting you with the nearest maternal rapid response ambulance.'
  },
  {
    number: '112',
    name: 'Unified National Emergency (ERSS)',
    dept: 'Police, Fire, Disaster & Medical Integrated Support',
    color: 'from-amber-600 to-orange-700',
    badge: 'All-Hazards ERSS',
    dispatcherPrompt: '112 Emergency Response System. Police, Fire, and Medical coordination is active.'
  }
];

export default function EmergencyDialerModal({
  isOpen,
  onClose,
  initialNumber = '108',
  userLocation = { lat: 14.6742, lng: 77.6072, city: 'Anantapur' }
}) {
  const [dialedNumber, setDialedNumber] = useState(initialNumber);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'connected' | 'ended'
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [ambulanceDispatched, setAmbulanceDispatched] = useState(false);
  const [ambulanceEta, setAmbulanceEta] = useState(8);
  const [dispatcherLog, setDispatcherLog] = useState([]);

  const ringbackRef = useRef(null);
  const timerRef = useRef(null);
  const etaTimerRef = useRef(null);

  useEffect(() => {
    if (initialNumber) {
      setDialedNumber(initialNumber);
    }
  }, [initialNumber]);

  // Clean up
  const stopAllAudio = () => {
    if (ringbackRef.current) {
      ringbackRef.current.stop();
      ringbackRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (etaTimerRef.current) {
      clearInterval(etaTimerRef.current);
      etaTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopAllAudio();
      setCallState('idle');
      setDuration(0);
      setAmbulanceDispatched(false);
      setDispatcherLog([]);
    }
  }, [isOpen]);

  // Press Keypad Key
  const handleKeyPress = (key) => {
    playDtmfTone(key);
    if (callState === 'idle') {
      setDialedNumber(prev => (prev.length < 12 ? prev + key : prev));
    }
  };

  // Backspace
  const handleBackspace = () => {
    if (callState === 'idle') {
      setDialedNumber(prev => prev.slice(0, -1));
    }
  };

  // Quick Service Click
  const handleSelectService = (num) => {
    playDtmfTone('5');
    setDialedNumber(num);
    if (callState === 'idle') {
      startEmergencyCall(num);
    }
  };

  // Speak Dispatcher Text using SpeechSynthesis API
  const speakDispatcher = (text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  };

  // Start Call
  const startEmergencyCall = (overrideNumber = null) => {
    const numberToCall = overrideNumber || dialedNumber;
    if (!numberToCall) return;

    setCallState('calling');
    setDuration(0);
    setDispatcherLog([
      { sender: 'system', text: `Initiating high-priority VoIP call to Emergency Hotline ${numberToCall}...` },
      { sender: 'system', text: `Transmitting real-time GPS coordinates (${userLocation.lat?.toFixed(4)}° N, ${userLocation.lng?.toFixed(4)}° E) to Emergency Dispatcher CAD...` }
    ]);

    // Ringing
    const ringPlayer = new RingbackTonePlayer();
    ringbackRef.current = ringPlayer;
    ringPlayer.start();

    // Connect after 2.6 seconds
    setTimeout(() => {
      if (ringbackRef.current) {
        ringbackRef.current.stop();
      }
      playConnectedChime();
      setCallState('connected');

      // Matching service prompt
      const service = EMERGENCY_SERVICES.find(s => s.number === numberToCall);
      const prompt = service
        ? service.dispatcherPrompt
        : `Government Health Helpline ${numberToCall} Dispatcher on line. How can we assist with your emergency?`;

      setDispatcherLog(prev => [
        ...prev,
        { sender: 'dispatcher', text: prompt, time: 'Just now' }
      ]);

      speakDispatcher(prompt);

      // Start call timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // If 108, trigger ambulance dispatch animation
      if (numberToCall === '108' || numberToCall === '102') {
        setAmbulanceDispatched(true);
        setAmbulanceEta(8);
        etaTimerRef.current = setInterval(() => {
          setAmbulanceEta(prev => (prev > 1 ? prev - 1 : 1));
        }, 12000);
      }
    }, 2600);
  };

  // End Call
  const handleEndCall = () => {
    stopAllAudio();
    playDisconnectedTone();
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      if (onClose) onClose();
    }, 1200);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentService = EMERGENCY_SERVICES.find(s => s.number === dialedNumber);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-red-700 via-rose-700 to-sky-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-sm">
              🚨
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-snug">Emergency VoIP Dispatcher</h3>
              <p className="text-[11px] text-white/80">
                National Medical & Tele-Assistance Rapid Lines
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={callState === 'connected' || callState === 'calling' ? handleEndCall : onClose}
            className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Quick Emergency Service Buttons */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 grid grid-cols-4 gap-2">
          {EMERGENCY_SERVICES.map(svc => (
            <button
              key={svc.number}
              type="button"
              onClick={() => handleSelectService(svc.number)}
              disabled={callState === 'connected' || callState === 'calling'}
              className={`p-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                dialedNumber === svc.number
                  ? 'bg-red-600/30 border-red-500 text-white shadow-md'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-sm font-black text-rose-400">{svc.number}</span>
              <span className="text-[9px] font-semibold truncate max-w-[70px] mt-0.5">{svc.badge}</span>
            </button>
          ))}
        </div>

        {/* Active Call / Dialpad Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-between min-h-[360px]">
          
          {callState === 'idle' ? (
            /* IDLE DIALPAD VIEW */
            <div className="w-full max-w-xs flex flex-col items-center space-y-4">
              
              {/* Dialed Number Display */}
              <div className="w-full text-center py-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-black tracking-wider text-white">
                    {dialedNumber || 'Dial Helpline'}
                  </span>
                  {dialedNumber && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
                    >
                      ⌫
                    </button>
                  )}
                </div>
                {currentService && (
                  <p className="text-xs text-rose-400 font-bold mt-1 animate-in fade-in">
                    {currentService.name}
                  </p>
                )}
              </div>

              {/* 12-Key DTMF Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="w-full aspect-square rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-xl font-bold font-mono text-white flex flex-col items-center justify-center transition cursor-pointer shadow-md"
                  >
                    <span>{key}</span>
                  </button>
                ))}
              </div>

              {/* Dial Button */}
              <button
                type="button"
                onClick={() => startEmergencyCall()}
                disabled={!dialedNumber}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 transition cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>Call Emergency Service</span>
              </button>
            </div>
          ) : (
            /* ACTIVE / CONNECTED / CALLING VIEW */
            <div className="w-full flex flex-col items-center space-y-4">
              
              {/* Call Status Avatar */}
              <div className="relative pt-2">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-700 flex items-center justify-center text-4xl shadow-2xl">
                  🚨
                </div>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-500 text-white shadow-md animate-pulse">
                  {callState === 'calling' ? 'Ringing Hotline...' : 'Live Connected'}
                </span>
              </div>

              {/* Number & Service Info */}
              <div className="text-center">
                <h4 className="text-2xl font-black text-white font-mono">{dialedNumber}</h4>
                <p className="text-xs font-bold text-rose-400 mt-0.5">
                  {currentService ? currentService.name : 'Health Dispatcher Line'}
                </p>
                {callState === 'connected' && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-mono text-xs font-bold text-emerald-300">{formatTimer(duration)}</span>
                  </div>
                )}
              </div>

              {/* Live Ambulance Dispatch ETA Banner (If 108) */}
              {ambulanceDispatched && (
                <div className="w-full bg-rose-950/40 border border-rose-800/80 rounded-2xl p-3.5 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
                      Ambulance 108-AP En Route
                    </span>
                    <span className="font-black text-emerald-400 font-mono">ETA: ~{ambulanceEta} mins</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-emerald-500 h-full transition-all duration-1000"
                      style={{ width: `${Math.max(15, 100 - ambulanceEta * 10)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Live GPS Telemetry auto-shared with Paramedic Driver Unit.
                  </p>
                </div>
              )}

              {/* Dispatcher Transcript Box */}
              <div className="w-full bg-slate-950/80 rounded-2xl p-3 border border-slate-800 max-h-36 overflow-y-auto space-y-2 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Emergency CAD Dispatch Log
                </div>
                {dispatcherLog.map((log, idx) => (
                  <div key={idx} className={`text-xs ${log.sender === 'system' ? 'text-sky-300 font-mono text-[11px]' : 'text-slate-100 font-medium'}`}>
                    {log.sender === 'dispatcher' ? <strong className="text-rose-400">Dispatcher: </strong> : null}
                    {log.text}
                  </div>
                ))}
              </div>

              {/* In-Call Action Bar */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-2xl transition cursor-pointer border ${
                    isMuted ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`p-3.5 rounded-2xl transition cursor-pointer border ${
                    isSpeakerOn ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                  title="Speakerphone"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-xl cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                    <line x1="22" y1="2" x2="2" y2="22"/>
                  </svg>
                  <span>Hang Up</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Location Telemetry Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>GPS Broadcast: <strong className="text-white">{userLocation.lat?.toFixed(4)}° N, {userLocation.lng?.toFixed(4)}° E</strong></span>
          </div>
          <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/30">
            Cadastral Sync Active
          </span>
        </div>
      </div>
    </div>
  );
}
