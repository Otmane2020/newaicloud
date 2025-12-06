/**
 🔥 NEWAI VIDEO ADS - ULTRA VISUAL 3D EDITION
 - Maximum photos, minimum text
 - 3D rotating phone mockups
 - Google Shopping/Search/Discover visuals
 - Premium transitions
**/

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import {
  GlitchText,
  ParticleExplosion,
  SpeedLines,
  ZoomPunch,
  FloatingElement,
  NeonText,
  MorphingGradient,
  CTAPulse,
} from "@/components/video3d/ViralEffects";

import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";
import shopifyLogo from "@/assets/shopify-logo.svg";

/* ---------------- PRODUCT IMAGES ---------------- */
const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=300&fit=crop",
];

/* ---------------- TTS NARRATIONS ---------------- */
const TTS = [
  "NewAI — Boost your Shopify SEO automatically with AI.",
  "Connect Google Shopping, Search, and Discover in one click.",
  "Transform your product images with Vision AI staging.",
  "Get zero errors on Google Merchant Center feeds.",
  "AI generates landing pages, blog articles, and SEO content.",
  "Start your free trial now — no credit card required.",
];

const WAIT_FOR_AUDIO = true;
const FALLBACK_TIMER = 5000;

/* ---------------- 3D ROTATING PHONE MOCKUP ---------------- */
const RotatingPhoneMockup = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    className="relative"
    initial={{ rotateY: -30, rotateX: 10, scale: 0.8 }}
    animate={{ 
      rotateY: [30, -30, 30],
      rotateX: [5, -5, 5],
      scale: 1
    }}
    transition={{ 
      rotateY: { duration: 8, repeat: Infinity, ease: "easeInOut" },
      rotateX: { duration: 6, repeat: Infinity, ease: "easeInOut" },
      scale: { duration: 0.8, delay }
    }}
    style={{ transformStyle: "preserve-3d", perspective: 1000 }}
  >
    {children}
  </motion.div>
);

/* ---------------- SLIDE 1: INTRO WITH LOGOS ---------------- */
const SlideIntro = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 overflow-hidden">
    <MorphingGradient />
    <ParticleExplosion trigger count={40} />
    
    {/* Floating product images */}
    <div className="absolute inset-0 pointer-events-none">
      {PRODUCT_IMAGES.slice(0, 4).map((img, i) => (
        <FloatingElement key={i} delay={i * 0.3} amp={20}>
          <motion.img
            src={img}
            alt=""
            className="absolute w-16 h-16 rounded-xl object-cover shadow-2xl"
            style={{
              top: `${15 + i * 20}%`,
              left: i % 2 === 0 ? "8%" : "75%",
              filter: "brightness(1.1) saturate(1.2)"
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.9, scale: 1 }}
            transition={{ delay: i * 0.2 }}
          />
        </FloatingElement>
      ))}
    </div>

    {/* Main Logo */}
    <ZoomPunch delay={0.2}>
      <motion.div 
        className="relative z-10"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <GlitchText className="text-5xl font-black text-white drop-shadow-2xl">
          NewAI
        </GlitchText>
      </motion.div>
    </ZoomPunch>

    {/* Platform logos */}
    <motion.div 
      className="flex gap-4 mt-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {[
        { color: "#4285F4", label: "G" },
        { color: "#34A853", label: "S" },
        { color: "#1877F2", label: "f" },
        { color: "#E4405F", label: "IG" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl"
          style={{ background: item.color }}
          animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
        >
          {item.label}
        </motion.div>
      ))}
    </motion.div>
  </div>
);

/* ---------------- SLIDE 2: GOOGLE SHOPPING PHONES ---------------- */
const SlideGooglePhones = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 overflow-hidden">
    <SpeedLines direction="horizontal" />
    
    <div className="relative flex items-end justify-center gap-2 scale-90">
      {/* Left Phone - Search */}
      <RotatingPhoneMockup delay={0}>
        <motion.div 
          className="w-28 bg-white rounded-2xl shadow-2xl overflow-hidden transform -rotate-12"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gray-100 h-4 flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="p-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 mb-2">
              <svg viewBox="0 0 24 24" className="w-3 h-3">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <img src={PRODUCT_IMAGES[0]} alt="" className="w-full h-20 object-cover rounded-lg mb-1" />
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-2 h-2 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
          </div>
        </motion.div>
      </RotatingPhoneMockup>

      {/* Center Phone - Shopping (Main) */}
      <RotatingPhoneMockup delay={0.1}>
        <motion.div 
          className="w-36 bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-gray-100 h-5 flex items-center justify-center">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="p-3 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1 bg-blue-50 rounded-full px-2 py-1">
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-xs font-medium text-gray-700">Shopping</span>
              </div>
            </div>
            <img src={PRODUCT_IMAGES[1]} alt="" className="w-full h-28 object-cover rounded-xl mb-2" />
            <div className="grid grid-cols-2 gap-2">
              <img src={PRODUCT_IMAGES[3]} alt="" className="w-full h-14 object-cover rounded-lg" />
              <img src={PRODUCT_IMAGES[4]} alt="" className="w-full h-14 object-cover rounded-lg" />
            </div>
          </div>
        </motion.div>
      </RotatingPhoneMockup>

      {/* Right Phone - Discover */}
      <RotatingPhoneMockup delay={0.2}>
        <motion.div 
          className="w-28 bg-white rounded-2xl shadow-2xl overflow-hidden transform rotate-12"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-gray-100 h-4 flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="p-2">
            <div className="flex items-center gap-1 mb-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-[6px] text-white font-bold">D</span>
              </div>
              <span className="text-[8px] font-medium">Discover</span>
            </div>
            <img src={PRODUCT_IMAGES[2]} alt="" className="w-full h-24 object-cover rounded-lg mb-1" />
            <img src={PRODUCT_IMAGES[5]} alt="" className="w-full h-16 object-cover rounded-lg" />
          </div>
        </motion.div>
      </RotatingPhoneMockup>
    </div>
  </div>
);

/* ---------------- SLIDE 3: BEFORE/AFTER TRANSFORMATION ---------------- */
const SlideBeforeAfter = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 overflow-hidden">
    <ParticleExplosion trigger count={30} />
    
    <div className="relative flex gap-4 items-center px-4">
      {/* Before */}
      <motion.div
        className="relative"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.img
          src={sofaWhiteBackground}
          alt="Before"
          className="w-32 h-32 object-cover rounded-2xl shadow-xl"
          animate={{ scale: [1, 0.95, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ✗
        </motion.div>
      </motion.div>

      {/* Arrow */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, x: [0, 5, 0] }}
        transition={{ scale: { delay: 0.4 }, x: { duration: 1, repeat: Infinity } }}
        className="text-4xl"
      >
        ➜
      </motion.div>

      {/* After */}
      <motion.div
        className="relative"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.img
          src={sofaWithBackground}
          alt="After"
          className="w-32 h-32 object-cover rounded-2xl shadow-2xl ring-4 ring-green-400/50"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          ✓
        </motion.div>
        <motion.div
          className="absolute -top-3 -left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-bold"
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          +68%
        </motion.div>
      </motion.div>
    </div>
  </div>
);

/* ---------------- SLIDE 4: PRODUCT GALLERY 3D ---------------- */
const SlideProductGallery = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-600 via-rose-700 to-red-800 overflow-hidden">
    <SpeedLines direction="vertical" />
    
    <div className="relative" style={{ perspective: 1000 }}>
      {PRODUCT_IMAGES.map((img, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            transformStyle: "preserve-3d",
          }}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: (i % 3 - 1) * 60,
            y: Math.floor(i / 3) * 80 - 40,
          }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            rotateY: [0, 15, -15, 0],
            rotateX: [0, -10, 10, 0],
            z: [0, 30, 0],
          }}
          transition={{ 
            opacity: { delay: i * 0.1 },
            scale: { delay: i * 0.1 },
            rotateY: { duration: 4, delay: i * 0.2, repeat: Infinity },
            rotateX: { duration: 3, delay: i * 0.2, repeat: Infinity },
            z: { duration: 2, delay: i * 0.2, repeat: Infinity },
          }}
        >
          <img
            src={img}
            alt=""
            className="w-24 h-24 object-cover rounded-xl shadow-2xl"
            style={{ 
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          />
        </motion.div>
      ))}
    </div>
  </div>
);

/* ---------------- SLIDE 5: SEO GRAPH VISUAL ---------------- */
const SlideSEOGraph = () => {
  const points = [
    { x: 40, y: 140 },
    { x: 80, y: 120 },
    { x: 120, y: 80 },
    { x: 160, y: 50 },
    { x: 200, y: 30 },
    { x: 240, y: 15 },
  ];
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 overflow-hidden">
      <ParticleExplosion trigger count={25} />
      
      <motion.div 
        className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-4 shadow-2xl"
        initial={{ scale: 0, rotateY: -30 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <svg viewBox="0 0 280 160" className="w-64 h-40">
          {/* Grid */}
          <line x1="40" y1="140" x2="250" y2="140" stroke="white" strokeOpacity="0.3" />
          <line x1="40" y1="80" x2="250" y2="80" stroke="white" strokeOpacity="0.2" strokeDasharray="4" />
          <line x1="40" y1="20" x2="250" y2="20" stroke="white" strokeOpacity="0.2" strokeDasharray="4" />
          
          {/* Gradient area */}
          <defs>
            <linearGradient id="graphGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <motion.path
            d={`M40,140 ${points.map(p => `L${p.x},${p.y}`).join(' ')} L240,140 Z`}
            fill="url(#graphGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
          
          {/* Line */}
          <motion.path
            d={`M${points.map(p => `${p.x},${p.y}`).join(' L')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          
          {/* Points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="6"
              fill="#22c55e"
              stroke="white"
              strokeWidth="3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.15 }}
            />
          ))}
        </svg>
        
        <motion.div
          className="absolute -top-4 -right-4 bg-green-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          +500%
        </motion.div>
      </motion.div>
    </div>
  );
};

/* ---------------- SLIDE 6: CTA FINALE ---------------- */
const SlideCTA = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 overflow-hidden">
    <MorphingGradient />
    <ParticleExplosion trigger count={50} />
    <SpeedLines direction="horizontal" />
    
    <ZoomPunch>
      <motion.div
        className="text-center"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <NeonText color="#00ff88" className="text-4xl font-black mb-4">
          NewAI
        </NeonText>
        
        <CTAPulse>
          <motion.div
            className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl"
            whileHover={{ scale: 1.05 }}
          >
            FREE TRIAL
          </motion.div>
        </CTAPulse>
      </motion.div>
    </ZoomPunch>
    
    {/* Floating products around CTA */}
    {PRODUCT_IMAGES.slice(0, 4).map((img, i) => (
      <motion.img
        key={i}
        src={img}
        alt=""
        className="absolute w-16 h-16 rounded-full object-cover shadow-xl"
        style={{
          top: `${20 + (i * 20)}%`,
          left: i % 2 === 0 ? "10%" : "80%",
        }}
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }}
      />
    ))}
  </div>
);

/* ---------------- SLIDES CONFIG ---------------- */
const SLIDES = [
  SlideIntro,
  SlideGooglePhones,
  SlideBeforeAfter,
  SlideProductGallery,
  SlideSEOGraph,
  SlideCTA,
];

/* ---------------- MAIN COMPONENT ---------------- */
export default function AnimationAds() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const slideTimer = useRef<NodeJS.Timeout>();
  const currentVoice = useRef<AbortController | null>(null);

  const playNarration = async (i: number) => {
    if (muted) return nextSlide(FALLBACK_TIMER);

    try {
      setLoadingAudio(true);
      currentVoice.current?.abort();
      const ctrl = new AbortController();
      currentVoice.current = ctrl;

      const { data, error } = await supabase.functions.invoke("robot-tts", {
        body: { text: TTS[i] },
      });

      if (error || !data?.audio) return nextSlide(FALLBACK_TIMER);

      if (audio.current) {
        audio.current.pause();
      }

      const url = "data:audio/mp3;base64," + data.audio;
      const a = new Audio(url);
      a.volume = 1;
      audio.current = a;
      await a.play();

      a.onended = () => WAIT_FOR_AUDIO && nextSlide();
      setLoadingAudio(false);

      if (!WAIT_FOR_AUDIO) nextSlide(FALLBACK_TIMER);
    } catch {
      nextSlide(FALLBACK_TIMER);
    }
  };

  const nextSlide = (delay = 0) => {
    clearTimeout(slideTimer.current);
    slideTimer.current = setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, delay);
  };

  useEffect(() => {
    if (!playing) return;
    clearTimeout(slideTimer.current);
    playNarration(index);
    return () => clearTimeout(slideTimer.current);
  }, [index, playing]);

  const toggleMute = () => {
    setMuted((v) => {
      if (audio.current) audio.current.pause();
      return !v;
    });
  };

  const SlideComponent = SLIDES[index];

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.2, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 15 }}
            transition={{ duration: 0.7, type: "spring" }}
            className="absolute inset-0"
          >
            <SlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="absolute bottom-6 w-full flex justify-center gap-2 z-40">
          {SLIDES.map((_, i) => (
            <motion.div
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full cursor-pointer transition-all ${
                i === index ? "w-6 bg-white" : "w-2 bg-white/40"
              }`}
              whileHover={{ scale: 1.3 }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-40">
          <motion.button
            onClick={toggleMute}
            className="bg-white/20 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </motion.button>
          <motion.button
            onClick={() => setPlaying((p) => !p)}
            className="bg-white/20 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </motion.button>
        </div>

        {loadingAudio && (
          <motion.div
            className="absolute top-4 left-4 w-3 h-3 rounded-full bg-green-400 z-40"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        )}

        {/* Slide Counter */}
        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm text-white px-3 py-1 rounded-full z-40 text-xs font-bold">
          {index + 1}/{SLIDES.length}
        </div>
      </div>
    </div>
  );
}
