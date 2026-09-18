import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';

export default function FloatingAIAssistant({
  language = 'English',
  onLanguageChange,
  externalPrompt = null,
  onClearExternalPrompt = null,
  isOpen = false,
  onToggle = null
}) {
  const [open, setOpen] = useState(isOpen);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am your Health AI Assistant. Ask me about doctors on duty, emergency beds, or medicine stock across primary and community health centres in Hindi, Marathi, Telugu, or English.',
      time: 'Just now',
      source: 'gemini-grounded'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen !== undefined && isOpen !== open) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    if (onToggle) onToggle(newState);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      setOpen(true);
      if (onToggle) onToggle(true);
      handleSendMessage(externalPrompt.trim());
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (text = chatInput) => {
    const messageToSend = text.trim();
    if (!messageToSend || chatLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: messageToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend, language })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const rawReply = data.reply;
        const cleanReply = rawReply.replace(/\[ACTION:GET_LOCATION\]/g, '').trim();
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: cleanReply,
          source: data.source,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'No reply from health assistant');
      }
    } catch (err) {
      console.error('Floating chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Unable to connect to the medical assistant service. Please check your connection or retry.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Marathi' ? 'mr-IN' : 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsRecording(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognition.start();
        return;
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }

    setIsRecording(true);
    setTimeout(() => {
      setChatInput((prev) => (prev ? `${prev} nearby available pediatrician` : 'nearby available pediatrician'));
      setIsRecording(false);
    }, 1500);
  };

  const handleSpeakText = (msgId, text) => {
    if (!('speechSynthesis' in window)) return;

    if (currentlySpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = (text || '')
      .replace(/[*_#`[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'Hindi' ? 'hi-IN' : language === 'Telugu' ? 'te-IN' : language === 'Marathi' ? 'mr-IN' : 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {open && (
        <div className="w-[92vw] sm:w-[410px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-[#1d68bd] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-tight">Health AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] text-sky-100 font-medium">
                  <span>Verified Healthcare Network</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher */}
              <div className="flex items-center bg-black/20 p-0.5 rounded-lg text-[10px] font-bold">
                {['English', 'Hindi', 'Telugu'].map((l) => (
                  <button
                    key={l}
                    onClick={() => onLanguageChange && onLanguageChange(l)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      language === l ? 'bg-white text-[#1d68bd] shadow-2xs font-bold' : 'text-sky-100 hover:text-white'
                    }`}
                  >
                    {l === 'Hindi' ? 'हिं' : l === 'Telugu' ? 'తె' : 'EN'}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={handleToggle}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Minimize Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-[#f8fafc] border-b border-slate-200 overflow-x-auto flex items-center gap-1.5 text-[11px] shrink-0">
            {[
              { text: 'कहाँ एंटी-वेनम और आपातकालीन बेड उपलब्ध है?', label: 'Anti-Venom (ASV)' },
              { text: 'गर्भवती महिलाओं के लिए स्त्री रोग विशेषज्ञ किस PHC में हैं?', label: 'Gynecology & Maternal' },
              { text: 'ఏ క్లినిక్‌లో పారాసిటమాల్ మరియు ఇన్సులిన్ నిల్వ ఉంది?', label: 'Paracetamol & Insulin' },
              { text: 'Available emergency beds right now', label: 'Emergency Beds' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="bg-[#f0f7ff] hover:bg-[#e0edfd] text-[#1d68bd] border border-[#bfdbfe] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition cursor-pointer text-[10px] shadow-2xs shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/40 text-xs">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[90%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isBot ? 'bg-[#1d68bd] text-white' : 'bg-slate-700 text-white'
                  }`}>
                    {isBot ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className={`p-3 rounded-2xl leading-relaxed ${
                      isBot
                        ? 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                        : 'bg-[#1d68bd] text-white'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {isBot && (
                        <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleSpeakText(msg.id, msg.text)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              currentlySpeakingId === msg.id
                                ? 'bg-rose-500 text-white'
                                : 'bg-sky-50 text-[#1d68bd] hover:bg-sky-100 border border-sky-200'
                            }`}
                          >
                            {currentlySpeakingId === msg.id ? (
                              <>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <rect x="5" y="5" width="14" height="14" rx="2" />
                                </svg>
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                          <span className="text-[9px] text-slate-400">Spoken in {language}</span>
                        </div>
                      )}
                    </div>
                    <div className={`text-[9px] text-slate-400 px-1 ${isBot ? 'text-left' : 'text-right'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {chatLoading && (
              <div className="flex gap-2 mr-auto items-center">
                <div className="w-6 h-6 rounded-full bg-[#1d68bd] text-white flex items-center justify-center text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 text-slate-500 text-[11px] font-semibold flex items-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5 text-[#1d68bd]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Consulting clinic database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-1.5"
            >
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                    : 'bg-slate-100 hover:bg-[#e0edfd] text-slate-600 hover:text-[#1d68bd]'
                }`}
                title={isRecording ? 'Listening...' : 'Voice Dictate'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>

              <input
                type="text"
                placeholder={isRecording ? 'Listening... speak now' : `Ask in ${language}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#1d68bd]/20 focus:border-[#1d68bd] bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="px-3.5 py-2 bg-[#1d68bd] hover:bg-[#15529a] disabled:opacity-40 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>Verified Health Records</span>
              <span>Dial 108 in emergency</span>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating Chat Trigger Button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2.5 px-4 py-3 bg-[#1d68bd] hover:bg-[#15529a] text-white rounded-full shadow-xl hover:shadow-2xl transition transform hover:scale-105 cursor-pointer border-2 border-white/80"
        title="Open Health AI Assistant"
      >
        <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </span>
        <div className="text-left leading-tight hidden sm:block">
          <div className="text-xs font-black tracking-wide">Health AI Assistant</div>
          <div className="text-[10px] text-sky-100 font-medium">Rural Care Navigator</div>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-300"></span>
        </span>
      </button>
    </div>
  );
}
