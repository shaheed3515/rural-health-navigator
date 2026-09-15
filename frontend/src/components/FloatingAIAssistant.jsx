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
      text: 'Hello! I am your Health AI Assistant. Ask me about doctors on duty, emergency beds, or medicine stock across UP PHCs & CHCs in Hindi, Telugu, or English.',
      time: 'Just now',
      source: 'gemini-grounded'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
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
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply,
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
          text: '⚠️ Unable to connect to the medical assistant service. Please check your connection or retry.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {open && (
        <div className="w-[92vw] sm:w-[410px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-tight">Health AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[10px] text-emerald-100/80">District PHC Network Verified</div>
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
                      language === l ? 'bg-white text-emerald-900 shadow-2xs' : 'text-emerald-100 hover:text-white'
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
          <div className="p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex items-center gap-1.5 text-[11px] shrink-0">
            {[
              { text: 'कहाँ एंटी-वेनम और आपातकालीन बेड उपलब्ध है?', label: '🐍 Anti-Venom' },
              { text: 'गर्भवती महिलाओं के लिए स्त्री रोग विशेषज्ञ किस PHC में हैं?', label: '🤰 Gynecologist' },
              { text: 'ఏ క్లినిక్‌లో పారాసిటమాల్ మరియు ఇన్సులిన్ నిల్వ ఉంది?', label: '💊 Paracetamol/Insulin' },
              { text: 'Available emergency beds right now', label: '🛏️ Beds' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 whitespace-nowrap font-medium transition cursor-pointer text-[10px] shadow-2xs shrink-0"
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
                    isBot ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                  }`}>
                    {isBot ? '🤖' : '👤'}
                  </div>

                  <div className="space-y-0.5">
                    <div className={`p-3 rounded-2xl leading-relaxed ${
                      isBot
                        ? 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                        : 'bg-emerald-700 text-white'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
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
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                  🤖
                </div>
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 text-slate-500 text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:0.2s]">●</span>
                  <span className="animate-pulse [animation-delay:0.4s]">●</span>
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
              <input
                type="text"
                placeholder={`Ask health question in ${language}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition cursor-pointer"
              >
                ➤
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>Grounded in UP PHCs</span>
              <span>🚨 Dial 108 in emergency</span>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Floating Chat Trigger Button */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full shadow-xl hover:shadow-2xl transition transform hover:scale-105 cursor-pointer border-2 border-white/80"
        title="Open Health AI Assistant"
      >
        <span className="text-xl">🤖</span>
        <div className="text-left leading-tight hidden sm:block">
          <div className="text-xs font-black tracking-wide">Health AI Assistant</div>
          <div className="text-[10px] text-emerald-100 font-medium">Rural Care Navigator</div>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
        </span>
      </button>
    </div>
  );
}
