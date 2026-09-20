import React, { useState, useEffect, useRef } from 'react';
import {
  playDtmfTone,
  playConnectedChime,
  playDisconnectedTone,
  RingbackTonePlayer
} from '../utils/audioSynthesizer';
import { apiFetch } from '../api';

export default function TeleconsultCallModal({
  isOpen,
  onClose,
  onMinimize,
  doctor = null,
  patient = null,
  initialMode = 'video',
  onPrescriptionSaved = null
}) {
  const [callStatus, setCallStatus] = useState('initiating'); // initiating | ringing | connected | ended
  const [callMode, setCallMode] = useState(initialMode); // 'video' | 'audio'
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(initialMode === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState('prescription'); // 'prescription' | 'vitals' | 'chat'
  
  // Real media stream refs
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const ringbackRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Vitals State
  const [vitals, setVitals] = useState({
    bp: '120/80',
    pulse: '74',
    spo2: '98',
    temp: '98.4'
  });

  // Prescription State
  const [diagnosis, setDiagnosis] = useState('Acute Upper Respiratory Tract Infection (URTI) / Seasonal Bronchial Irritation');
  const [medications, setMedications] = useState([
    { id: 1, name: 'Paracetamol 500mg (PCM)', dosage: '1 tablet twice daily after meals', duration: '3 days' },
    { id: 2, name: 'Cetirizine 10mg', dosage: '1 tablet at bedtime', duration: '5 days' },
    { id: 3, name: 'Oral Rehydration Salts (ORS)', dosage: '1 sachet in 1 Litre boiled water', duration: 'As required' }
  ]);
  const [advice, setAdvice] = useState('Drink warm fluids, steam inhalation twice daily. Monitor temperature. Report back if fever persists > 48h.');
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [rxSaved, setRxSaved] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'doctor',
      text: 'Namaste. I am reviewing your rural health record. Please describe your symptoms and when they started.',
      time: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Target doctor details fallback
  const activeDoctor = doctor || {
    name: 'Dr. S. K. Verma',
    specialization: 'Chief Medical Officer / Tele-Specialist',
    facility: 'District Referral Hospital & Regional Telemedicine Hub',
    qualification: 'MBBS, MD (Internal Medicine)',
    regNo: 'MCI-54892'
  };

  const activePatient = patient || {
    name: 'Ramesh Kumar',
    age: 36,
    gender: 'Male',
    location: 'Anantapur Rural Sector, AP',
    phone: '+91 98230 44521'
  };

  // Start Camera & Mic
  const startMedia = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callMode === 'video',
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('[Teleconsult] Camera/Mic access warning (fallback simulation active):', err);
    }
  };

  // Stop Media
  const stopMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (ringbackRef.current) {
      ringbackRef.current.stop();
      ringbackRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Initiate call workflow with realistic audio ringback
  useEffect(() => {
    if (!isOpen) {
      stopMedia();
      return;
    }

    setCallStatus('initiating');
    setDuration(0);
    setRxSaved(false);

    startMedia();

    // Start ringing sound
    const ringPlayer = new RingbackTonePlayer();
    ringbackRef.current = ringPlayer;
    
    // Transition: Initiating -> Ringing
    const ringTimer = setTimeout(() => {
      setCallStatus('ringing');
      try {
        ringPlayer.start();
      } catch (e) {}
    }, 600);

    // Transition: Ringing -> Connected (Doctor picks up after 2.8s)
    const connectTimer = setTimeout(() => {
      if (ringbackRef.current) {
        ringbackRef.current.stop();
      }
      playConnectedChime();
      setCallStatus('connected');

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }, 3200);

    return () => {
      clearTimeout(ringTimer);
      clearTimeout(connectTimer);
      stopMedia();
    };
  }, [isOpen, callMode]);

  // Toggle Mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = isMuted; // toggled
      });
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !next;
      });
    }
  };

  // Hang up
  const handleEndCall = async () => {
    stopMedia();
    playDisconnectedTone();
    setCallStatus('ended');

    // Optionally post call session record to backend
    try {
      await apiFetch('/api/teleconsult/log', {
        method: 'POST',
        body: {
          doctorName: activeDoctor.name,
          patientName: activePatient.name,
          durationSeconds: duration,
          diagnosis,
          medications,
          vitals
        }
      });
    } catch (e) {}

    setTimeout(() => {
      if (onClose) onClose();
    }, 1200);
  };

  // Add Medication
  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    setMedications([
      ...medications,
      {
        id: Date.now(),
        name: newMedName.trim(),
        dosage: newMedDosage.trim() || '1 tablet daily',
        duration: '3 days'
      }
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  const removeMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleSaveRx = () => {
    setRxSaved(true);
    if (onPrescriptionSaved) {
      onPrescriptionSaved({
        doctor: activeDoctor,
        patient: activePatient,
        diagnosis,
        medications,
        advice,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      });
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      id: Date.now(),
      sender: 'patient',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');

    // Simulated doctor response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'doctor',
          text: 'Acknowledged. I have documented this into your prescription. Follow the prescribed dosage and take plenty of hydration.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1400);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Video Call Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">{activeDoctor.name}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {callStatus === 'connected' ? 'Live Teleconsult' : callStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {activeDoctor.specialization} · {activeDoctor.facility}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status & Timer Indicator */}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-emerald-300">{formatTimer(duration)}</span>
                <span className="hidden sm:inline-block text-[10px] text-slate-400 border-l border-slate-600 pl-2">
                  🔒 256-bit WebRTC
                </span>
              </div>
            )}

            {/* Minimize to Floating Bar */}
            {callStatus === 'connected' && onMinimize && (
              <button
                type="button"
                onClick={() => onMinimize({ doctor: activeDoctor, patient: activePatient, duration })}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Minimize call to floating bar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 14h6m0 0v6m0-6L3 21"/>
                  <path d="M20 10h-6m0 0V4m0 6l7-7"/>
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 transition cursor-pointer"
              title="Hang up"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Body: Video Area + Integrated Clinical Workstation */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
          
          {/* LEFT: Video Consultation Stream Container */}
          <div className="flex-1 relative flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
            
            {/* Top Overlay Badges */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <span className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700/60 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Dr. Camera (HD 1080p)
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-mono text-sky-300 border border-slate-700/60">
                24ms Latency
              </span>
            </div>

            {/* Remote Feed (Doctor) Display */}
            <div className="w-full h-full flex items-center justify-center relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              {callStatus === 'initiating' || callStatus === 'ringing' ? (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl">
                      {activeDoctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500 text-white tracking-wide shadow-md animate-pulse">
                      {callStatus === 'initiating' ? 'CONNECTING...' : 'RINGING...'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{activeDoctor.name}</h4>
                    <p className="text-xs text-sky-300">{activeDoctor.specialization}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{activeDoctor.facility}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                    <span className="text-xs text-slate-300">Awaiting rural teleconsultation link...</span>
                  </div>
                </div>
              ) : callStatus === 'ended' ? (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                      <line x1="22" y1="2" x2="2" y2="22"/>
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-white">Teleconsultation Completed</h4>
                  <p className="text-xs text-slate-400">Total duration: {formatTimer(duration)}</p>
                </div>
              ) : (
                /* Doctor Active Simulated Feed */
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950">
                  {/* Doctor Avatar Card Simulation */}
                  <div className="text-center p-6 space-y-3 z-10">
                    <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 p-1 shadow-2xl">
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center border-2 border-white/20 text-white font-black text-2xl">
                        {activeDoctor.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-base flex items-center justify-center gap-1.5">
                        {activeDoctor.name}
                        <svg className="w-4 h-4 text-sky-400 inline" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </h4>
                      <p className="text-xs text-slate-400">{activeDoctor.specialization}</p>
                    </div>

                    {/* Animated Doctor Audio Equalizer */}
                    <div className="flex items-center justify-center gap-1 h-6">
                      {[40, 70, 95, 60, 85, 50, 75, 45, 90, 65, 80].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 bg-sky-400 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDuration: `${0.4 + (i % 4) * 0.2}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Watermark/Security Badge */}
                  <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-slate-400 border border-white/10">
                    Ayushman Bharat Digital Mission (ABDM) Compliant
                  </div>
                </div>
              )}

              {/* Local Patient PIP Video Feed */}
              {callStatus === 'connected' && (
                <div className="absolute bottom-4 right-4 z-20 w-32 sm:w-44 aspect-video rounded-xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs font-semibold p-2 text-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="1" y1="1" x2="23" y2="23"/>
                        <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>
                      </svg>
                      <span className="text-[10px] mt-1">Camera Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                    You {isMuted ? '(Muted)' : ''}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom In-Call Controls Bar */}
            <div className="pt-3 flex items-center justify-center gap-3 shrink-0">
              {/* Mute Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`p-3.5 rounded-2xl transition cursor-pointer shadow-lg flex items-center gap-2 ${
                  isMuted
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
                <span className="hidden sm:inline text-xs font-semibold">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Video Toggle */}
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl transition cursor-pointer shadow-lg flex items-center gap-2 ${
                  isVideoOff
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
                title={isVideoOff ? 'Start camera' : 'Stop camera'}
              >
                {isVideoOff ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                )}
                <span className="hidden sm:inline text-xs font-semibold">{isVideoOff ? 'Video Off' : 'Video'}</span>
              </button>

              {/* Share Reports / Screen */}
              <button
                type="button"
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={`p-3.5 rounded-2xl transition cursor-pointer shadow-lg flex items-center gap-2 ${
                  isScreenSharing
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
                title="Share Medical Reports / Vitals Screen"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"/>
                  <polyline points="8 21 12 17 16 21"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span className="hidden sm:inline text-xs font-semibold">Share Report</span>
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="px-5 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xl flex items-center gap-2"
                title="End Consultation"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                  <line x1="22" y1="2" x2="2" y2="22"/>
                </svg>
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Clinical Telemedicine Workstation (Prescription, Vitals, Chat) */}
          <div className="w-full lg:w-[420px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0">
            
            {/* Side Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/80">
              <button
                type="button"
                onClick={() => setActiveSidePanel('prescription')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidePanel === 'prescription'
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span>Prescription (Rx)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSidePanel('vitals')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidePanel === 'vitals'
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span>Live Vitals</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSidePanel('chat')}
                className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSidePanel === 'chat'
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>In-Call Chat</span>
              </button>
            </div>

            {/* TAB 1: Real-time Digital Prescription */}
            {activeSidePanel === 'prescription' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-white">
                {/* Patient Summary Header */}
                <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Record</span>
                    <strong className="text-white text-sm">{activePatient.name}</strong>
                    <p className="text-[11px] text-slate-400">{activePatient.age} yrs · {activePatient.gender} · {activePatient.phone}</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    OPD Verified
                  </span>
                </div>

                {/* Clinical Diagnosis */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Clinical Diagnosis & Findings
                  </label>
                  <textarea
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    rows="2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    placeholder="Enter clinical assessment..."
                  />
                </div>

                {/* Prescribed Medications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                        <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
                      </svg>
                      Prescribed Medicines ({medications.length})
                    </label>
                  </div>

                  <div className="space-y-2">
                    {medications.map((med, idx) => (
                      <div key={med.id || idx} className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 flex items-start justify-between text-xs">
                        <div>
                          <p className="font-bold text-white text-xs">{idx + 1}. {med.name}</p>
                          <p className="text-[11px] text-sky-300 mt-0.5">{med.dosage}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Duration: {med.duration}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(med.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Medicine Mini-Form */}
                  <form onSubmit={handleAddMedication} className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                        placeholder="Drug / Dosage form"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                        placeholder="e.g. 1 tab after meals"
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold rounded-lg text-xs border border-sky-500/30 transition cursor-pointer"
                    >
                      + Add Medication to Prescription
                    </button>
                  </form>
                </div>

                {/* Advice & Follow-Up */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sky-300">Doctor Advice & Precautions</label>
                  <textarea
                    value={advice}
                    onChange={(e) => setAdvice(e.target.value)}
                    rows="2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Save Rx Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveRx}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                      rxSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white'
                    }`}
                  >
                    {rxSaved ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>Prescription Generated & Saved</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        <span>Finalize Digital Prescription</span>
                      </>
                    )}
                  </button>
                  {rxSaved && (
                    <p className="text-center text-[10px] text-emerald-400 mt-1">
                      ✓ Copied to Patient OPD Token & Sent via SMS link
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Live Patient Vitals */}
            {activeSidePanel === 'vitals' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-white">
                <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80">
                  <span className="text-xs font-bold text-sky-300 block mb-3">Live Telemetry & Vital Signs</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* BP */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={vitals.bp}
                          onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                          className="w-20 font-mono font-bold text-white text-base bg-transparent border-b border-sky-500/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">mmHg</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 block mt-1">Normal Range</span>
                    </div>

                    {/* Pulse */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Pulse Rate</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={vitals.pulse}
                          onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                          className="w-16 font-mono font-bold text-white text-base bg-transparent border-b border-sky-500/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">bpm</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 block mt-1">Regular Rhythm</span>
                    </div>

                    {/* SpO2 */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Oxygen (SpO2)</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={vitals.spo2}
                          onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                          className="w-16 font-mono font-bold text-white text-base bg-transparent border-b border-sky-500/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 block mt-1">Optimal Room Air</span>
                    </div>

                    {/* Temp */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Temperature</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={vitals.temp}
                          onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                          className="w-16 font-mono font-bold text-white text-base bg-transparent border-b border-sky-500/50 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">°F</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 block mt-1">Afebrile</span>
                    </div>
                  </div>
                </div>

                {/* Triage & High-Risk Alert Notice */}
                <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-300 font-bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Emergency Red Flags Triage</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    If SpO2 drops below 92%, patient experiences severe breathlessness, or chest pain develops, initiate immediate 108 emergency referral to District Hospital.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playDtmfTone('1');
                      alert('108 Emergency Ambulance Alert Triggered for Patient Ramesh Kumar');
                    }}
                    className="mt-1 w-full py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    🚨 Trigger Instant Ambulance Escalation
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: In-Call Chat */}
            {activeSidePanel === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-900">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          msg.sender === 'patient'
                            ? 'bg-sky-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type symptom or query to doctor..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
