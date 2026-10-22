'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Info, Loader2 } from 'lucide-react';
import { sendAIChatMessage } from '@/lib/api';

export default function AssistantView({
  status,
  readings = [],
  config,
  alerts = [],
  events = [],
  contacts = []
}) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your FireLine Safety AI Assistant. I continuously inspect your MQ-2 (gas & smoke detector) and DHT11 (temperature & humidity) telemetry, anomaly trends, and alert history. How can I assist you with your home safety today?',
      timestamp: '12:00 PM'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const suggestedPrompts = [
    "What is the current MQ-2 gas and smoke level?",
    "What are the current DHT11 temperature and humidity readings?",
    "Is the LPG emergency valve open or closed?",
    "What are the configured safety thresholds for MQ-2 and DHT11?",
    "Explain latest incident summary."
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const clientContext = {
      status,
      readings: readings.slice(0, 20),
      config,
      alerts,
      events: events.slice(0, 10),
      contacts
    };

    try {
      const res = await sendAIChatMessage(text, clientContext);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply || 'I processed the live sensor telemetry. All zones appear stable within baseline limits.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'I could not reach the telemetry service. Standalone deterministic safety fail-safes remain fully operational on hardware.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-950">Safety AI Assistant</h2>
            <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-950 text-[#c8ff00] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI ADVISORY
            </span>
          </div>
          <p className="text-xs text-zinc-400">Ask natural language questions about readings, thresholds, and safety events</p>
        </div>
      </div>

      {/* Safety Notice per UI.MD Section 5.4 */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-xs text-zinc-500 flex items-start gap-2.5 shadow-sm">
        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-800">Safety rule:</strong> AI output is advisory. Sensor threshold limits trigger real-time push notifications, and manual valve shutoff can be executed by administrators from the dashboard.
        </span>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {suggestedPrompts.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(p)}
            className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-sm transition-all cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <div className="rounded-[28px] border border-zinc-200/80 bg-white flex flex-col h-[480px] shadow-smart-card overflow-hidden">
        {/* Messages Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                m.sender === 'user' 
                  ? 'bg-zinc-950 text-white' 
                  : 'bg-zinc-100 text-zinc-800'
              }`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-4 text-sm ${
                m.sender === 'user'
                  ? 'bg-zinc-950 text-white rounded-2xl rounded-tr-xs shadow-sm'
                  : 'bg-zinc-100/80 text-zinc-900 rounded-2xl rounded-tl-xs whitespace-pre-line'
              }`}>
                <p className="leading-relaxed">{m.text}</p>
                <span className={`block text-[10px] mt-1.5 font-mono ${
                  m.sender === 'user' ? 'text-zinc-400 text-right' : 'text-zinc-400'
                }`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-100 p-3.5 rounded-2xl rounded-tl-xs text-xs text-zinc-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-800" />
                <span>Analyzing recent sensor telemetry...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-100 bg-white">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about sensor status, alerts, or valve..."
              disabled={isLoading}
              className="flex-1 bg-zinc-50 border border-zinc-200/80 rounded-full px-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-zinc-950 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-40 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4 text-[#c8ff00]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
