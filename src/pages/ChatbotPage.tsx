import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/db/database';
import { Send, Mic, Sprout, Cloud, Bug, Droplets, TrendingUp, PawPrint, Landmark, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/utils';
import { useAuthStore } from '@/stores/authStore';
import { chatWithGemini } from '@/services/geminiService';
import { queueCloudChange } from '@/services/cloudSyncService';

const LANGUAGE_NAMES = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu',
  'Kannada', 'Malayalam', 'Punjabi', 'Bengali', 'Odia'
];

const CATEGORIES = [
  { id: 'crop', icon: Sprout, label: 'Crop' },
  { id: 'weather', icon: Cloud, label: 'Weather' },
  { id: 'disease', icon: Bug, label: 'Disease' },
  { id: 'irrigation', icon: Droplets, label: 'Irrigation' },
  { id: 'market', icon: TrendingUp, label: 'Market' },
  { id: 'animal', icon: PawPrint, label: 'Animal' },
  { id: 'loan', icon: Landmark, label: 'Loan' },
  { id: 'insect', icon: Bug, label: 'Insect' }
];

const PRELOADED_QUERIES = [
  'What is the water requirement for paddy at tillering stage?',
  'Tell me about Brown Spot disease in rice',
  'What government schemes are available for farmers?',
  'How to protect wheat from rust?'
];

export default function ChatbotPage() {
  const { user, activeProfile } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (db.chatMessages) {
          const history = user?.id ? await db.chatMessages.where('userId').equals(user.id).toArray() : [];
          setMessages(history);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadMessages();
  }, [user?.id]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending) return;

    if (!user?.id) return;
    const userMsg = { userId: user.id, role: 'user', content: text, timestamp: new Date().toISOString(), language } as any;
    setInput('');
    setIsSending(true);

    try {
      if (db.chatMessages) {
        userMsg.id = await db.chatMessages.add(userMsg);
        await queueCloudChange(user.id, 'chatMessages', 'create', userMsg);
        setMessages(prev => [...prev, userMsg]);
      }
      const aiRespText = await chatWithGemini(text.trim(), messages.slice(-16), language, {
        name: activeProfile?.name || user.name,
        location: user.location,
        state: user.state,
        profileType: activeProfile?.type,
      });
      const aiMsg = { userId: user.id, role: 'assistant', content: aiRespText, timestamp: new Date().toISOString(), language } as any;
      if (db.chatMessages) {
        aiMsg.id = await db.chatMessages.add(aiMsg);
        await queueCloudChange(user.id, 'chatMessages', 'create', aiMsg);
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (e) {
      console.error(e);
      const detail = e instanceof Error ? e.message : 'Unknown Gemini error.';
      const errorMsg = {
        userId: user.id,
        role: 'assistant',
        content: `Gemini is unavailable: ${detail}`,
        timestamp: new Date().toISOString(),
        language,
      } as any;
      setMessages(prev => [...prev, errorMsg]);
      if (db.chatMessages) await db.chatMessages.add(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const clearHistory = async () => {
    try {
      if (db.chatMessages) {
        if (user?.id) {
          const existingMessages = await db.chatMessages.where('userId').equals(user.id).toArray();
          for (const message of existingMessages) {
            if (message.id) await queueCloudChange(user.id, 'chatMessages', 'delete', { id: message.id });
          }
          await db.chatMessages.where('userId').equals(user.id).delete();
        }
      }
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser.');
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-white border-b p-4 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
          <MessageSquare /> AI Agri Advisor
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            title="Clear History"
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={20} />
          </button>
          <select
            className="p-2 border rounded-lg bg-gray-50 text-sm font-medium"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGE_NAMES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="p-3 bg-white border-b flex gap-2 overflow-x-auto no-scrollbar shrink-0">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => handleSend(`Tell me about ${c.label.toLowerCase()}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-green-100"
          >
            <c.icon size={16} /> {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-10 space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sprout size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-700">How can I help you farm better today?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {PRELOADED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="p-3 text-sm text-left bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:shadow-sm transition"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl p-4 shadow-sm",
              msg.role === 'user' ? "bg-green-600 text-white rounded-br-none" : "bg-white border border-gray-100 rounded-bl-none text-gray-800"
            )}>
              <p>{msg.content}</p>
              <p className={cn("text-[10px] mt-2 text-right opacity-70")}>
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-gray-100 bg-white p-4 text-sm text-gray-500 shadow-sm">
              <Loader2 size={18} className="animate-spin" /> Gemini is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <button
            onClick={startVoiceInput}
            className={cn("p-3 rounded-xl transition", isListening ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
          >
            <Mic size={24} />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder={`Ask in ${language}...`}
            className="flex-1 p-3 bg-gray-50 border rounded-xl outline-none focus:border-green-400 transition"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isSending || !input.trim()}
            className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
