/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioStreamer, AudioPlayer } from './services/audioService';

const SYSTEM_INSTRUCTION = `You are Speedy, Charlotte Quémeras's personal AI assistant. 
You are completely bilingual in English and French. 
You are helpful, professional, and futuristic.
Charlotte is a Master 2 student in International Consumer Marketing at ESCE, currently an apprentice at Rooj by GA.
She has experience in real estate development (GA Smart Building, Coffim), marketing (Agence Oswald Orb), and accounting (Cabinet Fiduciaire du Valois).
She studied at HEC Montréal for a semester and traveled to Canada.
She speaks French (native), English (B2/C1), and Spanish (B1/B2).
She enjoys museums, theater, concerts, cinema, tennis, and dance.

When the conversation starts, always introduce yourself exactly as: "I am Charlotte’s assistant how can i help you ?" (and the French equivalent: "Je suis l'assistant de Charlotte, comment puis-je vous aider ?").

Always respond in the language the user speaks to you, or both if appropriate. Keep responses concise and suitable for voice interaction.`;

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(32).fill(0));
  
  const sessionRef = useRef<any>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const startSession = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      audioPlayerRef.current = new AudioPlayer();
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsListening(true);
            // Start audio capture
            audioStreamerRef.current = new AudioStreamer((base64) => {
              session.sendRealtimeInput({
                media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
              });
            });
            audioStreamerRef.current.start();
            
            // Trigger intro message
            session.sendRealtimeInput({ text: "Hello, please introduce yourself." });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              audioPlayerRef.current?.playChunk(message.serverContent.modelTurn.parts[0].inlineData.data);
              // Update visualizer with some fake but reactive-looking data based on audio presence
              updateVisualizer(true);
            }

            if (message.serverContent?.interrupted) {
              audioPlayerRef.current?.stop();
            }

            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setAiResponse(prev => prev + message.serverContent!.modelTurn!.parts[0].text);
            }
            
            // Handle transcriptions
            const transcription = message.serverContent?.modelTurn?.parts.find(p => p.text)?.text;
            if (transcription) {
               // setAiResponse(transcription);
            }
          },
          onclose: () => {
            stopSession();
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopSession();
          }
        }
      });

      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    audioStreamerRef.current?.stop();
    audioPlayerRef.current?.stop();
    setIsConnected(false);
    setIsListening(false);
    setTranscript("");
    setAiResponse("");
  };

  const updateVisualizer = (isActive: boolean) => {
    if (isActive) {
      setVisualizerData(prev => prev.map(() => Math.random() * 0.8 + 0.2));
    } else {
      setVisualizerData(prev => prev.map(v => v * 0.9));
    }
  };

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / visualizerData.length;
      visualizerData.forEach((val, i) => {
        const height = val * canvas.height;
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, '#10b981'); // Emerald 500
        gradient.addColorStop(0.5, '#34d399'); // Emerald 400
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, height, 4);
        ctx.fill();
        
        // Add glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      });

      // Decay visualizer data
      setVisualizerData(prev => prev.map(v => v * 0.95));
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [visualizerData]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-2xl flex flex-col items-center gap-12"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-4"
          >
            <Sparkles className="w-3 h-3" />
            System Active
          </motion.div>
          <h1 className="text-6xl font-black tracking-tighter italic uppercase">
            Speedy
          </h1>
          <p className="text-emerald-500/60 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2">
            <Languages className="w-4 h-4" />
            Bilingual Assistant
          </p>
        </div>

        {/* Visualizer Container */}
        <div className="relative w-full aspect-[2/1] bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl overflow-hidden group">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="w-full h-full"
          />
          
          <AnimatePresence>
            {!isConnected && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <p className="text-white/40 font-mono text-xs uppercase tracking-[0.2em] mb-6">
                  Ready to initialize
                </p>
                <button
                  onClick={startSession}
                  className="group relative px-8 py-4 bg-emerald-500 text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Initialize Speedy
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Indicators */}
          <div className="absolute bottom-6 left-6 flex gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isConnected ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-white/30'} transition-colors`}>
              {isConnected ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="text-[10px] font-mono uppercase tracking-wider">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Response Area */}
        <div className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {aiResponse && (
              <motion.div
                key="response"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
              >
                <p className="text-emerald-400 font-mono text-[10px] uppercase tracking-widest mb-2">Speedy</p>
                <p className="text-white/90 leading-relaxed text-lg italic serif">
                  {aiResponse}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {isConnected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={stopSession}
            className="px-6 py-3 rounded-full border border-red-500/30 bg-red-500/5 text-red-500 font-mono text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
            Terminate Session
          </motion.button>
        )}
      </motion.div>

      {/* Footer Info */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 text-white/20 font-mono text-[10px] uppercase tracking-[0.3em] whitespace-nowrap">
        Charlotte Quémeras Assistant • Version 2.5 Live
      </footer>
    </div>
  );
}
