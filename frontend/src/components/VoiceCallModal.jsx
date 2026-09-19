import React, { useState, useEffect, useRef } from 'react';

export default function VoiceCallModal({
  isOpen,
  onClose,
  language = 'English',
  userLocation,
  onTriggerSos,
  showToast
}) {
  const [callState, setCallState] = useState('dialing'); // 'dialing' | 'connected' | 'ended'
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [emergencyCountdown, setEmergencyCountdown] = useState(null);
  const [emergencyDetected, setEmergencyDetected] = useState(false);

  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Dual-frequency telecom ringtone synthesizer using Web Audio API
  const playRingTone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = 440; // US/Standard dial tone component
      osc2.frequency.value = 480;
      gain.gain.value = 0.08;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
        } catch (e) {}
      }, 1200);
    } catch (e) {
      console.warn('Ring tone error:', e);
    }
  };

  // Speak text via SpeechSynthesis
  const speakAiResponse = (text) => {
    if (!synthRef.current || !isSpeakerOn) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      English: 'en-IN',
      Hindi: 'hi-IN',
      Marathi: 'mr-IN',
      Telugu: 'te-IN'
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Emergency keywords detector
  const checkEmergencyKeywords = (text) => {
    const lower = text.toLowerCase();
    const keywords = [
      'snakebite', 'snake', 'saap', 'chaava', 'सर्प', 'सांप', 'विष', 'पाము',
      'chest pain', 'heart', 'dil', 'छाती', 'हार्ट', 'గుండె', 'heart attack',
      'labor', 'delivery', 'pregnant', 'pregnancy', 'prasav', 'प्रसूती', 'प्रसव', 'కాన్పు',
      'unconscious', 'behosh', 'faint', 'बेहोश', 'अचेत', 'స్పృహ',
      'bleeding', 'blood', 'khoon', 'रक्त', 'खून', 'రక్తం',
      'poison', 'zeher', 'विष', 'విషం',
      'accident', 'trauma', 'chot', 'अपघात', 'हादसा', 'ప్రమాదం'
    ];

    const isMatch = keywords.some((k) => lower.includes(k));
    if (isMatch && !emergencyDetected) {
      setEmergencyDetected(true);
      const emergencyWarning =
        language === 'Hindi'
          ? 'गंभीर आपातकाल पहचाना गया! 108 एम्बुलेंस नियंत्रण कक्ष से कॉल मर्ज की जा रही है।'
          : language === 'Marathi'
          ? 'तातडीची आपत्कालीन परिस्थिती! 108 रुग्णवाहिका नियंत्रण कक्षाशी कॉल जोडला जात आहे.'
          : language === 'Telugu'
          ? 'తీవ్రమైన అత్యవసర పరిస్థితి గుర్తించబడింది! 108 అంబులెన్స్‌తో కాల్ అనుసంధానించబడుతోంది.'
          : 'CRITICAL EMERGENCY DETECTED! Merging call with 108 Ambulance Dispatch Control.';

      setTranscript((prev) => [
        ...prev,
        { sender: 'system', text: emergencyWarning, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      speakAiResponse(emergencyWarning);

      // Start 5 second countdown to auto-merge
      setEmergencyCountdown(5);
      countdownIntervalRef.current = setInterval(() => {
        setEmergencyCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            trigger108Merge();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Trigger 108 emergency merge
  const trigger108Merge = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setEmergencyCountdown(0);
    if (onTriggerSos) onTriggerSos();
    if (showToast) {
      showToast('108 Ambulance Dispatch line merged! Live GPS broadcasted.', 'warning');
    }
    // Open tel dialer in new context
    try {
      window.location.href = 'tel:108';
    } catch (e) {}
  };

  // Setup speech recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      const langMap = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Marathi: 'mr-IN',
        Telugu: 'te-IN'
      };
      recognition.lang = langMap[language] || 'en-IN';

      recognition.onstart = () => setIsUserSpeaking(false);
      recognition.onaudiostart = () => setIsUserSpeaking(true);
      recognition.onaudioend = () => setIsUserSpeaking(false);

      recognition.onresult = (event) => {
        const lastIndex = event.results.length - 1;
        const speechText = event.results[lastIndex][0].transcript.trim();
        if (!speechText) return;

        // Add user speech to transcript
        const userEntry = {
          sender: 'user',
          text: speechText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setTranscript((prev) => [...prev, userEntry]);

        // Check for acute emergency
        checkEmergencyKeywords(speechText);

        // Generate clinical doctor reply
        setTimeout(() => {
          generateDoctorReply(speechText);
        }, 600);
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsUserSpeaking(false);
      };

      recognition.onend = () => {
        if (callState === 'connected') {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition setup error:', e);
    }
  };

  // Generate Doctor Response
  const generateDoctorReply = (userText) => {
    let reply = '';
    const lower = userText.toLowerCase();

    if (lower.includes('snake') || lower.includes('saap') || lower.includes('सर्प')) {
      reply =
        language === 'Hindi'
          ? 'शांत रहें। मरीज को बिल्कुल हिलाएं नहीं और घाव पर चीरा या तंग पट्टी न बांधें। नजदीकी प्राथमिक स्वास्थ्य केंद्र में 14 वायल एंटी-वेनम तैयार है। एम्बुलेंस भेजी जा रही है।'
          : language === 'Marathi'
          ? 'शांत राहा. रुग्णाला हालचाल करू देऊ नका आणि जखम कापू नका. जवळच्या प्राथमिक आरोग्य केंद्रात अँटी-व्हेनम उपलब्ध आहे. रुग्णवाहिका पाठवली जात आहे.'
          : language === 'Telugu'
          ? 'శాంతంగా ఉండండి. రోగిని కదల్చవద్దు. సమీప ప్రాథమిక ఆరోగ్య కేంద్రంలో 14 యాంటీ-వీనమ్ యూనిట్లు సిద్ధంగా ఉన్నాయి. అంబులెన్స్ బయలుదేరింది.'
          : 'Stay calm. Keep the patient completely still. Do not tie a tight tourniquet. 14 vials of Anti-Snake Venom are ready at the nearest PHC. Ambulance is dispatched.';
    } else if (lower.includes('chest') || lower.includes('heart') || lower.includes('छाती') || lower.includes('गुండె')) {
      reply =
        language === 'Hindi'
          ? 'मरीज को तुरंत आरामदायक स्थिति में बैठाएं और तंग कपड़े ढीले करें। नजदीकी सामुदायिक स्वास्थ्य केंद्र के आपातकालीन कक्ष को सूचित कर दिया गया है।'
          : language === 'Marathi'
          ? 'रुग्णाला तातडीने आरामदायक स्थितीत बसवा. जवळच्या ग्रामीण रुग्णालयातील आपत्कालीन कक्षाला अलर्ट पाठवला आहे.'
          : language === 'Telugu'
          ? 'రోగిని తక్షణమే సౌకర్యవంతంగా కూర్చోబెట్టండి. సమీప కమ్యూనిటీ హెల్త్ సెంటర్ ఎమర్జెన్సీ విభాగాన్ని అప్రమత్తం చేశాము.'
          : 'Sit the patient down in a comfortable position and loosen tight clothing. Nearest Community Health Centre emergency trauma desk has been alerted.';
    } else if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('ताप') || lower.includes('జ్వరం')) {
      reply =
        language === 'Hindi'
          ? 'बुखार के लिए पैरासिटामोल 500mg लें और ओआरएस घोल पिएं। आज ओपीडी में जनरल मेडिसिन डॉक्टर उपलब्ध हैं, आप टोकन बुक कर सकते हैं।'
          : language === 'Marathi'
          ? 'तापासाठी पॅरासिटामॉल ५००mg घ्या आणि भरपूर पाणी प्या. आज ओपीडीमध्ये जनरल मेडिसिन डॉक्टर उपस्थित आहेत.'
          : language === 'Telugu'
          ? 'జ్వరానికి పారాసిటమాల్ 500mg తీసుకోండి మరియు ద్రవపదార్థాలు తాగండి. నేడు జనరల్ మెడిసిన్ డాక్టర్ అందుబాటులో ఉన్నారు.'
          : 'Take Paracetamol 500mg and maintain hydration with ORS. General Medicine specialist is on duty today at your local PHC; you can reserve an OPD token.';
    } else {
      reply =
        language === 'Hindi'
          ? `मैंने आपकी समस्या समझी। हमारे प्राथमिक स्वास्थ्य केंद्र में 24/7 आपातकालीन ट्राइएज डेस्क सक्रिय है। क्या मरीज को सांस लेने में कठिनाई या तेज दर्द है?`
          : language === 'Marathi'
          ? `मी तुमचे लक्षणे नोंदवली आहेत. आपल्या प्राथमिक आरोग्य केंद्रात २४/७ ट्रायज डेस्क सुरू आहे. रुग्णाला श्वास घेण्यास त्रास होत आहे का?`
          : language === 'Telugu'
          ? `నేను మీ సమస్యను నమోదు చేసుకున్నాను. మన ఆరోగ్య కేంద్రంలో 24/7 ట్రియాజ్ డెస్క్ పనిచేస్తోంది. రోగికి శ్వాస తీసుకోవడంలో ఇబ్బంది ఉందా?`
          : `I have logged your symptoms. Your local Primary Health Centre has a 24/7 triage desk active. Is the patient experiencing acute pain or shortness of breath?`;
    }

    const doctorEntry = {
      sender: 'doctor',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTranscript((prev) => [...prev, doctorEntry]);
    speakAiResponse(reply);
  };

  // Lifecycle: Connect Call
  useEffect(() => {
    if (!isOpen) {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (synthRef.current) synthRef.current.cancel();
      setCallState('dialing');
      setCallDuration(0);
      setTranscript([]);
      setEmergencyDetected(false);
      setEmergencyCountdown(null);
      return;
    }

    // Play ringing tone
    playRingTone();
    ringIntervalRef.current = setInterval(playRingTone, 3000);

    // Auto-connect after 3.2 seconds
    const connectTimer = setTimeout(() => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      setCallState('connected');

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Initial Greeting
      const initialGreeting =
        language === 'Hindi'
          ? 'नमस्ते! मैं डॉ. संगम, वरिष्ठ चिकित्सा अधिकारी बोल रहा हूँ। घबराइए नहीं, बताइए क्या समस्या है?'
          : language === 'Marathi'
          ? 'नमस्कार! मी डॉ. संगम, वरिष्ठ वैद्यकीय अधिकारी बोलतोय. काळजी करू नका, काय त्रास होतोय ते सांगा?'
          : language === 'Telugu'
          ? 'నమస్కారం! నేను డాక్టర్ సంగం, సీనియర్ మెడికల్ ఆఫీసర్. దయచేసి కంగారు పడకండి, మీ సమస్య ఏమిటో చెప్పండి?'
          : 'Hello! This is Dr. Sangam, Senior AI Medical Officer. Please stay calm and tell me your symptoms.';

      setTranscript([
        {
          sender: 'doctor',
          text: initialGreeting,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      speakAiResponse(initialGreeting);

      // Start listening to user voice
      startListening();
    }, 3200);

    return () => {
      clearTimeout(connectTimer);
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [isOpen, language]);

  if (!isOpen) return null;

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Call Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0284c7] to-[#1d68bd] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-lg shadow-inner">
                👨‍⚕️
              </div>
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#1d68bd] ${callState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">Dr. Sangam</h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-sky-100">
                  AI Medical Officer
                </span>
              </div>
              <div className="text-xs text-sky-100 font-medium">
                {callState === 'dialing' ? 'Connecting to rural triage line...' : `In Call • ${formatDuration(callDuration)}`}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-sky-100 bg-white/10 px-2.5 py-1 rounded-xl border border-white/20">
              {language}
            </span>
          </div>
        </div>

        {/* Emergency Alert Ribbon (if critical symptom detected) */}
        {emergencyDetected && (
          <div className="p-3 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between gap-2 text-xs font-bold animate-pulse shrink-0">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                Critical Emergency Detected! {emergencyCountdown > 0 ? `Merging 108 in ${emergencyCountdown}s...` : '108 Dispatch Active'}
              </span>
            </div>
            <button
              onClick={trigger108Merge}
              className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-black shadow-sm hover:bg-red-50 cursor-pointer"
            >
              Merge 108 Now
            </button>
          </div>
        )}

        {/* Audio Wave Visualizer & Dialing State */}
        <div className="py-6 px-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center text-center shrink-0">
          {callState === 'dialing' ? (
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-[#e0edfd] border-4 border-[#bfdbfe] flex items-center justify-center text-[#1d68bd] mx-auto animate-bounce">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-600">Ringing Dr. Sangam (AI Triage Desk)...</p>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-1.5 h-10">
                {[...Array(16)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isAiSpeaking
                        ? 'bg-[#1d68bd] animate-pulse'
                        : isUserSpeaking
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-slate-300'
                    }`}
                    style={{
                      height: isAiSpeaking || isUserSpeaking ? `${Math.max(8, Math.sin((i + callDuration) * 0.8) * 32 + 10)}px` : '6px'
                    }}
                  ></span>
                ))}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                {isAiSpeaking ? (
                  <span className="text-[#1d68bd] font-bold">Dr. Sangam is speaking...</span>
                ) : isUserSpeaking ? (
                  <span className="text-emerald-600 font-bold">Listening to you... Speak freely</span>
                ) : (
                  <span>Speak into your microphone in {language}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[36vh] bg-white">
          {transcript.length === 0 ? (
            <div className="text-center text-slate-400 text-xs py-8 space-y-1">
              <p>Connecting to secure triage line...</p>
              <p className="text-[10px] text-slate-400">Speak your health concern or emergency naturally.</p>
            </div>
          ) : (
            transcript.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'
                }`}
              >
                {msg.sender === 'system' ? (
                  <div className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold my-1 text-center">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#1d68bd] text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-70 mb-0.5">
                      {msg.sender === 'user' ? 'You' : 'Dr. Sangam'} • {msg.time}
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Call Controls Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-around shrink-0">
          {/* Mute Toggle */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (recognitionRef.current) {
                if (!isMuted) {
                  recognitionRef.current.stop();
                } else {
                  recognitionRef.current.start();
                }
              }
            }}
            className={`p-3 rounded-2xl border transition flex flex-col items-center gap-1 cursor-pointer ${
              isMuted ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMuted ? (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              )}
            </svg>
            <span className="text-[10px] font-bold">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Speaker Toggle */}
          <button
            onClick={() => {
              setIsSpeakerOn(!isSpeakerOn);
              if (synthRef.current && isSpeakerOn) {
                synthRef.current.cancel();
              }
            }}
            className={`p-3 rounded-2xl border transition flex flex-col items-center gap-1 cursor-pointer ${
              !isSpeakerOn ? 'bg-slate-200 border-slate-300 text-slate-500' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {isSpeakerOn ? (
                <>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              ) : (
                <line x1="23" y1="9" x2="17" y2="15" />
              )}
            </svg>
            <span className="text-[10px] font-bold">{isSpeakerOn ? 'Speaker' : 'Off'}</span>
          </button>

          {/* Direct 108 Merge Trigger */}
          <button
            onClick={trigger108Merge}
            className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition flex flex-col items-center gap-1 cursor-pointer"
            title="Bridge 108 Ambulance Dispatch"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-red-600">
              <circle cx="12" cy="12" r="2" />
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
            </svg>
            <span className="text-[10px] font-black text-red-700">Merge 108</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              if (synthRef.current) synthRef.current.cancel();
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {}
              }
              onClose();
              if (showToast) showToast('Call ended. Triage consultation recorded.', 'info');
            }}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
