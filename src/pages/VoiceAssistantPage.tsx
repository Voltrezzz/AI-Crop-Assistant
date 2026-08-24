import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils';
import { Mic, MicOff, Globe, Loader2, Volume2, MessageSquare, Terminal, HelpCircle } from 'lucide-react';
import { LANGUAGE_NAMES } from '@/types';

type VoiceState = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

const COMMANDS = [
  { text: 'Show crop health', path: '/dashboard', icon: '🌱' },
  { text: 'Scan my crop', path: '/analyzer', icon: '📷' },
  { text: 'Show weather', path: '/weather', icon: '🌤️' },
  { text: 'Check disease risk', path: '/risk', icon: '⚠️' },
  { text: 'Show my fields', path: '/fields', icon: '🗺️' },
  { text: 'Open chat', path: '/chatbot', icon: '💬' },
  { text: 'Calculate water', path: '/irrigation', icon: '💧' },
  { text: 'Show my animals', path: '/animals', icon: '🐄' },
  { text: 'Check loans', path: '/loans', icon: '💰' },
  { text: 'Find fertilizer shop', path: '/shops', icon: '🏪' },
  { text: 'Market prices', path: '/market', icon: '📈' },
  { text: 'Insect bite', path: '/insect-bite', icon: '🐜' },
  { text: 'Show farm overview', path: '/land', icon: '🚜' },
  { text: 'Generate report', path: '/reports', icon: '📊' }
];

export default function VoiceAssistantPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [language, setLanguage] = useState<keyof typeof LANGUAGE_NAMES>('en');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [supported, setSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          setTranscript(event.results[i][0].transcript);
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
        processCommand(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    };

    recognition.onend = () => {
      if (state === 'listening') {
        setState('processing');
      }
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      // Map basic languages to BCP-47 codes if needed, simple approach for now
      recognitionRef.current.lang = language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
    }
  }, [language]);

  const toggleListening = () => {
    if (!supported) return;
    
    if (state === 'listening') {
      recognitionRef.current?.stop();
      setState('processing');
    } else {
      setTranscript('');
      setResponse('');
      setState('listening');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const processCommand = (text: string) => {
    setState('processing');
    const lowerText = text.toLowerCase();
    
    setTimeout(() => {
      let matched = false;
      for (const cmd of COMMANDS) {
        if (lowerText.includes(cmd.text.toLowerCase()) || 
           (cmd.text === 'Water irrigation' && lowerText.includes('water')) ||
           (cmd.text === 'Calculate water' && lowerText.includes('irrigation'))) {
          setResponse(`Navigating to ${cmd.text}...`);
          setState('responding');
          matched = true;
          setTimeout(() => {
            navigate(cmd.path);
          }, 1500);
          break;
        }
      }

      if (!matched) {
        setResponse("I'm sorry, I didn't catch a recognized command. Try looking at the supported commands below.");
        setState('responding');
        setTimeout(() => setState('idle'), 4000);
      }
    }, 1000);
  };

  const handleManualCommand = (cmd: typeof COMMANDS[0]) => {
    setTranscript(cmd.text);
    processCommand(cmd.text);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col h-full min-h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Volume2 className="text-green-600" /> Voice Assistant
          </h1>
          <p className="text-gray-600 text-sm">Control CropSense AI with your voice</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
          <Globe size={16} className="text-gray-500" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent text-sm font-medium outline-none text-gray-700"
          >
            {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 mb-8">
        
        <div className="relative flex items-center justify-center">
          {/* Animated Background Rings */}
          {state === 'listening' && (
            <>
              <div className="absolute w-40 h-40 bg-green-400 rounded-full animate-ping opacity-20"></div>
              <div className="absolute w-48 h-48 bg-green-300 rounded-full animate-pulse opacity-20" style={{ animationDuration: '2s' }}></div>
            </>
          )}
          
          <button
            onClick={toggleListening}
            disabled={!supported && state !== 'idle'}
            className={cn(
              "relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
              state === 'idle' ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105" :
              state === 'listening' ? "bg-red-500 hover:bg-red-600 text-white scale-110" :
              state === 'processing' ? "bg-blue-500 text-white" :
              state === 'responding' ? "bg-emerald-500 text-white" :
              "bg-gray-400 text-white"
            )}
          >
            {state === 'processing' ? <Loader2 className="w-12 h-12 animate-spin" /> : 
             state === 'listening' ? <Mic className="w-12 h-12 animate-bounce" /> :
             <Mic className="w-12 h-12" />}
          </button>
        </div>

        <div className="text-center space-y-4 w-full max-w-md h-32">
          {state === 'idle' && (
            <p className="text-lg text-gray-500 font-medium">Tap the mic and start speaking...</p>
          )}
          {state === 'listening' && (
            <p className="text-xl text-green-600 font-bold animate-pulse">Listening...</p>
          )}
          {transcript && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-800 text-lg italic">"{transcript}"</p>
            </div>
          )}
          {response && (
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-inner flex gap-3 text-left">
              <MessageSquare className="text-green-600 mt-1 shrink-0" />
              <p className="text-green-900 font-medium">{response}</p>
            </div>
          )}
          {!supported && state === 'idle' && (
            <p className="text-red-500 text-sm bg-red-50 p-2 rounded">Speech Recognition is not supported in your browser. Please use the buttons below.</p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-auto">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
          <Terminal size={16} /> Supported Commands
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleManualCommand(cmd)}
              disabled={state !== 'idle' && !supported}
              className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors text-left text-sm font-medium text-gray-700 hover:text-green-700"
            >
              <span className="text-xl">{cmd.icon}</span>
              <span>{cmd.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
