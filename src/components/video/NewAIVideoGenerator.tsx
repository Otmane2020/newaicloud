import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VideoExporter } from "@/lib/VideoRenderer";
import { Volume2, VolumeX, Play, Pause, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ========= SLIDES VISUELS =========
const SLIDES = [
  { text: "NewAI — the AI that boosts Shopify SEO automatically.", img: "/lovable-uploads/newai-logo.png" },
  { text: "3x Faster workflow — +50% Traffic — Save 10h Weekly.", img: "/lovable-uploads/newai-logo.png" },
  { text: "Visible everywhere: Google Search • Shopping • Discover", img: "/lovable-uploads/newai-logo.png" },
  { text: "Auto-SEO: Meta Tags, Descriptions, ALT Vision, Smart Tagging", img: "/lovable-uploads/newai-logo.png" },
  { text: "Before → After Vision AI +68% conversion", img: "/lovable-uploads/newai-logo.png" },
  { text: "Google Shopping XML Feed • GTIN/EAN validated • 0 errors", img: "/lovable-uploads/newai-logo.png" },
  { text: "AI Blog • Product Pages • HTML SEO Content", img: "/lovable-uploads/newai-logo.png" },
  { text: "Real Growth: 200 → 10K monthly impressions", img: "/lovable-uploads/newai-logo.png" },
  { text: "Pricing: Starter 9.99 • Pro 39 • Enterprise 139", img: "/lovable-uploads/newai-logo.png" },
  { text: "Try it FREE today — No Credit Card", img: "/lovable-uploads/newai-logo.png" }
];

// ========= SOUS-TITRES STYLE =========
const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    className="absolute bottom-6 text-center w-full text-white font-bold text-xl px-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <span className="bg-black/60 px-3 py-2 rounded-lg text-yellow-300 tracking-wide">
      {children}
    </span>
  </motion.div>
);

// ========= TTS via Edge Function =========
async function speak(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  try {
    const { data, error } = await supabase.functions.invoke('robot-tts', {
      body: { text }
    });

    if (error) {
      console.error('TTS error:', error);
      return;
    }

    if (data?.audio) {
      // Convert base64 to blob
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.volume = 1;
      audioRef.current = audio;
      audio.play();
    }
  } catch (err) {
    console.error('Speech error:', err);
  }
}

export default function NewAIVideoGenerator() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto narration
  useEffect(() => {
    if (!isPlaying || isMuted) return;
    speak(SLIDES[currentSlide].text, audioRef);
  }, [currentSlide, isPlaying, isMuted]);

  // Auto slide advancement
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlide(s => (s + 1 >= SLIDES.length ? 0 : s + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Stop audio when muted or paused
  useEffect(() => {
    if (isMuted && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isMuted]);

  // Video export
  const generateVideo = () => {
    VideoExporter("#video-capture", SLIDES.length * 4);
  };

  const toggleMute = () => {
    setIsMuted(m => !m);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div
        id="video-capture"
        className="relative w-[400px] aspect-[9/16] rounded-3xl overflow-hidden bg-gradient-to-b from-violet-900 to-black"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            {/* Background gradient animation */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-purple-600/20 to-fuchsia-600/30"
              animate={{
                background: [
                  "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(147,51,234,0.2) 50%, rgba(217,70,239,0.3) 100%)",
                  "linear-gradient(135deg, rgba(217,70,239,0.3) 0%, rgba(124,58,237,0.2) 50%, rgba(147,51,234,0.3) 100%)",
                  "linear-gradient(135deg, rgba(147,51,234,0.3) 0%, rgba(217,70,239,0.2) 50%, rgba(124,58,237,0.3) 100%)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            {/* IMAGE */}
            <motion.img
              src={SLIDES[currentSlide].img}
              className="w-32 h-32 object-contain z-10"
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            {/* SOUS-TITRE */}
            <Subtitle>{SLIDES[currentSlide].text}</Subtitle>
          </motion.div>
        </AnimatePresence>

        {/* Slide indicator */}
        <div className="absolute top-4 left-4 flex gap-1">
          {SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentSlide ? 'bg-yellow-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* CONTROLS */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
            onClick={() => setIsPlaying(p => !p)}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            onClick={generateVideo}
          >
            <Download size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <motion.div
            className="h-full bg-yellow-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 4, ease: "linear" }}
            key={currentSlide}
          />
        </div>
      </div>
    </div>
  );
}
