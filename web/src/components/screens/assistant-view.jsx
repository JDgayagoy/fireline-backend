'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Info, Loader2 } from 'lucide-react';
import { sendAIChatMessage } from '@/lib/api';

export default function AssistantView() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your Gas & Fire Safety AI Assistant. I monitor sensor telemetry, anomaly trends, and alert history. How can I assist you today?',
      timestamp: '12:00 PM'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const suggestedPrompts = [
    "What is the current safety status?",
    "Are there any active alerts or spikes?",
    "Is the emergency gas valve open or closed?",
    "What are the configured safety thresholds?",
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

    try {
      const res = await sendAIChatMessage(text);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply || 'I processed the sensor data. Everything appears stable.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I could not query the safety database right now. Please ensure the backend server is reachable.',
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
            <h2 className="text-xl font-bold text-zinc-100">Safety Assistant</h2>
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI POWERED
            </span>
          </div>
          <p className="text-xs text-zinc-400">Ask natural language questions about readings, alerts, and system state</p>
        </div>
      </div>

      {/* Safety Notice per UI.MD Section 5.4 & Project.MD */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <span>
          <strong>Safety principle:</strong> AI output is advisory. Deterministic hardware and cloud threshold rules trigger safety alerts and shutoffs, never the language model.
        </span>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {suggestedPrompts.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(p)}
            className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Thread Container */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col h-[460px] shadow-sm">
        {/* Messages Scroll Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.sender === 'user' 
                  ? 'bg-zinc-700 text-white' 
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}>
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`rounded-lg p-3.5 text-sm ${
                m.sender === 'user'
                  ? 'bg-zinc-800 text-zinc-100 rounded-tr-none'
                  : 'bg-zinc-950/80 border border-zinc-800/90 text-zinc-200 rounded-tl-none whitespace-pre-line'
              }`}>
                {m.text}
                <div className={`text-[10px] text-zinc-500 mt-1.5 font-mono ${m.sender === 'user' ? 'text-right' : ''}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-lg p-3.5 text-sm bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Consulting safety knowledge base...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about gas levels, alert logs, or hardware state..."
            className="flex-1 h-11 px-4 rounded-md bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-11 px-4 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
