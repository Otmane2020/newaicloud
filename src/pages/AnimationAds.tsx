import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Star, Check, Target, Sparkles, Download, Film, Rocket, TrendingUp, Zap, ShoppingCart, Package, BarChart3, LineChart, Search, Eye, Image, ArrowUp, ChevronRight, Globe, Smartphone, Award, Shield, Camera, Wand2, ArrowRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";

// Import components
import { SEOScoreCircle } from "@/components/video3d/SEOScoreCircle";
import { BeforeAfterSplit } from "@/components/video3d/BeforeAfterSplit";
import { LandingPageMockup } from "@/components/video3d/LandingPageMockup";
import { ImageEnhancement } from "@/components/video3d/ImageEnhancement";
import { GooglePhoneMockups3D } from "@/components/video3d/GooglePhoneMockups3D";
import { 
  GlitchText, 
  ParticleExplosion, 
  SpeedLines, 
  ZoomPunch,
  FloatingElement,
  NeonText,
  Rotating3D
} from "@/components/video3d/ViralEffects";

// Import real assets
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";
import shopifyLogo from "@/assets/shopify-logo.svg";

// ========= PRE-GENERATED AUDIO (stored base64 - no API calls) =========
// Audio is pre-generated and stored to avoid ElevenLabs API calls
const PRELOADED_AUDIO_URLS = [
  // Slide 0: Hook
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-0.mp3",
  // Slide 1: Stats  
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-1.mp3",
  // Slide 2: Products
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-2.mp3",
  // Slide 3: Google
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-3.mp3",
  // Slide 4: SEO Score
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-4.mp3",
  // Slide 5: Before/After SEO
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-5.mp3",
  // Slide 6: Vision AI
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-6.mp3",
  // Slide 7: Landing Page
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-7.mp3",
  // Slide 8: Image Enhancement
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-8.mp3",
  // Slide 9: Google Shopping
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-9.mp3",
  // Slide 10: CTA
  "https://nekqqlhrjgmyudmmewas.supabase.co/storage/v1/object/public/audio-cache/animationads/slide-10.mp3",
];

// Audio cache - loaded from storage URLs
const audioCache: Map<number, HTMLAudioElement> = new Map();
let audioPreloadPromise: Promise<void> | null = null;

// Slide backgrounds alternating white/blue
const SLIDE_BACKGROUNDS = [
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 0 - blue
  "bg-gradient-to-br from-white via-slate-50 to-blue-100",     // 1 - white
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 2 - blue
  "bg-gradient-to-br from-white via-slate-50 to-blue-100",     // 3 - white
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 4 - blue
  "bg-gradient-to-br from-white via-slate-50 to-blue-100",     // 5 - white
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 6 - blue
  "bg-gradient-to-br from-white via-slate-50 to-blue-100",     // 7 - white
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 8 - blue
  "bg-gradient-to-br from-white via-slate-50 to-blue-100",     // 9 - white
  "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900", // 10 - blue (CTA)
];

// Text colors based on background
const getTextColor = (slideIndex: number) => slideIndex % 2 === 0 ? "text-white" : "text-blue-900";

// Google Logo SVG
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Facebook Logo
const FacebookLogo = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Instagram Logo
const InstagramLogo = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="instaGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFDC80"/>
        <stop offset="50%" stopColor="#F56040"/>
        <stop offset="100%" stopColor="#833AB4"/>
      </linearGradient>
    </defs>
    <path fill="url(#instaGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// Counter Animation
const AnimatedCounter = ({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1200;
    const steps = 25;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{count}{suffix}</span>;
};

// Floating Particles
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full bg-white/30"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          x: [0, Math.random() * 20 - 10, 0],
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </div>
);

// 3D Cube Flip Transition - smooth cinematic rotation
const slideTransition3D = {
  initial: { 
    opacity: 0, 
    rotateY: 90, 
    rotateX: 15,
    scale: 0.8, 
    x: 100,
    z: -200
  },
  animate: { 
    opacity: 1, 
    rotateY: 0, 
    rotateX: 0,
    scale: 1, 
    x: 0,
    z: 0
  },
  exit: { 
    opacity: 0, 
    rotateY: -90, 
    rotateX: -15,
    scale: 0.8, 
    x: -100,
    z: -200
  }
};

// ========= SLIDE 1: INTRO =========
const SlideIntro = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[0]}`}>
    <FloatingParticles />
    <ParticleExplosion trigger={true} count={25} />
    
    {/* Central Glow */}
    <motion.div
      className="absolute w-64 h-64 bg-blue-400/30 rounded-full blur-3xl"
      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3, repeat: Infinity }}
    />

    {/* 3D Logo */}
    <motion.div
      className="relative z-10 mb-6"
      initial={{ scale: 0, rotateY: -180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
    >
      <motion.div 
        className="absolute inset-0 blur-3xl bg-white/50 rounded-full scale-150"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <Rotating3D duration={8}>
        <motion.div className="relative w-28 h-28 rounded-3xl bg-white flex items-center justify-center shadow-2xl">
          <span className="text-blue-600 text-5xl font-black">N</span>
        </motion.div>
      </Rotating3D>
    </motion.div>

    <ZoomPunch delay={0.3}>
      <GlitchText className="text-5xl font-black text-white text-center drop-shadow-lg">
        NewAI
      </GlitchText>
    </ZoomPunch>

    <motion.p
      className="text-xl text-white/90 text-center mb-8 font-semibold"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      <NeonText color="#3b82f6">AI-Powered E-commerce</NeonText>
    </motion.p>

    {/* 3D Integration Logos */}
    <motion.div
      className="flex items-center gap-3 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      style={{ perspective: 800 }}
    >
      {[
        { logo: <img src={shopifyLogo} alt="Shopify" className="w-9 h-9" />, delay: 0.7 },
        { logo: <GoogleLogo />, delay: 0.8 },
        { logo: <FacebookLogo />, delay: 0.9 },
        { logo: <InstagramLogo />, delay: 1 },
      ].map((item, i) => (
        <FloatingElement key={i} delay={i * 0.2} amp={5}>
          <motion.div
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl"
            initial={{ scale: 0, rotateY: 90 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ delay: item.delay, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.1, rotateY: 15 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {item.logo}
          </motion.div>
        </FloatingElement>
      ))}
    </motion.div>
  </motion.div>
);

// ========= SLIDE 2: STATS =========
const SlideStats = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[1]}`}>
    <SpeedLines />
    
    <ZoomPunch>
      <GlitchText className="text-3xl font-black text-blue-900 text-center mb-8 drop-shadow-sm">
        <span className="text-blue-600">Real</span> Results
      </GlitchText>
    </ZoomPunch>

    <div className="grid grid-cols-2 gap-4 w-full max-w-xs z-10" style={{ perspective: 1000 }}>
      {[
        { value: 3, suffix: "x", label: "Faster", color: "from-emerald-400 to-teal-500" },
        { value: 50, suffix: "%", label: "More Traffic", color: "from-yellow-400 to-orange-500" },
        { value: 10, suffix: "h+", label: "Saved Weekly", color: "from-pink-400 to-rose-500" },
        { value: 10, prefix: "Top ", label: "Google", color: "from-blue-400 to-indigo-500" },
      ].map((stat, i) => (
        <motion.div
          key={i}
          className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-center shadow-xl`}
          initial={{ scale: 0, rotateX: 90 }}
          animate={{ scale: 1, rotateX: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 150 }}
          style={{ transformStyle: "preserve-3d" }}
          whileHover={{ scale: 1.05, rotateY: 10 }}
        >
          <motion.div 
            className="text-4xl font-black text-white drop-shadow-lg"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
          >
            <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
          </motion.div>
          <div className="text-sm text-white/90 font-bold mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// ========= SLIDE 3: GOOGLE MOCKUPS - 3D Phone with Search/Shopping/Discover =========
const SlideGoogleMockups = () => {
  return (
    <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${SLIDE_BACKGROUNDS[2]} overflow-hidden`}>
      {/* Floating icons background */}
      {[Rocket, TrendingUp, Zap, Star, Award].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-white/10"
          style={{ 
            left: `${10 + i * 20}%`, 
            top: `${15 + (i % 3) * 25}%`,
          }}
          animate={{ 
            y: [0, -15, 0], 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
        >
          <Icon size={20 + i * 4} />
        </motion.div>
      ))}

      {/* Header */}
      <ZoomPunch>
        <div className="flex items-center gap-2 mb-2 z-10">
          <GoogleLogo />
          <GlitchText className="text-2xl font-black text-white">
            Dominate Google
          </GlitchText>
        </div>
      </ZoomPunch>
      
      <motion.p
        className="text-white/80 text-sm text-center mb-4 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Search • Shopping • Discover
      </motion.p>

      {/* 3D Phone Mockups Component */}
      <motion.div 
        className="z-10"
        initial={{ scale: 0.8, opacity: 0, rotateY: -30 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 80, delay: 0.2 }}
      >
        <GooglePhoneMockups3D autoRotate={true} />
      </motion.div>
    </motion.div>
  );
};

// ========= SLIDE 4: SEARCH CONSOLE - 3D Growth Dashboard =========
const SlideSearchConsole = () => {
  const [showStats, setShowStats] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[3]} overflow-hidden`}>
      {/* Floating decorative icons */}
      {[LineChart, TrendingUp, Search, Eye, ArrowUp, BarChart3].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-blue-300/30"
          style={{ 
            left: `${5 + i * 15}%`, 
            top: `${10 + (i % 4) * 20}%`,
          }}
          animate={{ 
            y: [0, -20, 0], 
            x: [0, 10, 0],
            rotate: [0, 15, -15, 0],
          }}
          transition={{ duration: 4 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        >
          <Icon size={20 + i * 4} />
        </motion.div>
      ))}

      {/* Header */}
      <ZoomPunch>
        <div className="flex items-center gap-2 mb-4 z-10">
          <Search className="w-8 h-8 text-blue-600" />
          <GlitchText className="text-2xl font-black text-blue-900">
            Search Console
          </GlitchText>
        </div>
      </ZoomPunch>

      {/* 3D Dual Cards */}
      <div className="relative w-full h-72 z-10" style={{ perspective: 1500 }}>
        {/* Before Card */}
        <motion.div
          className="absolute left-2 top-8 w-40 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 shadow-2xl"
          initial={{ opacity: 0, rotateY: -45, x: -50, scale: 0.7 }}
          animate={{ opacity: 1, rotateY: -20, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 80, delay: 0.3 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 30px 60px -15px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-xs font-bold">BEFORE</span>
          </div>
          <div className="text-4xl font-black text-white mb-1">~200</div>
          <div className="text-white/70 text-xs">clicks/month</div>
          <motion.div 
            className="mt-3 flex gap-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {[20, 30, 25, 35, 28].map((h, i) => (
              <div 
                key={i} 
                className="w-4 bg-white/30 rounded-sm"
                style={{ height: h }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* After Card */}
        <motion.div
          className="absolute right-2 top-4 w-44 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 shadow-2xl z-10"
          initial={{ opacity: 0, rotateY: 45, x: 50, scale: 0.7 }}
          animate={{ opacity: showStats ? 1 : 0, rotateY: showStats ? 15 : 45, x: 0, scale: showStats ? 1.05 : 0.7 }}
          transition={{ type: "spring", stiffness: 80 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-5 h-5 text-white" />
            <span className="text-yellow-300 text-xs font-bold">AFTER AI</span>
          </div>
          <div className="text-5xl font-black text-white mb-1">10K+</div>
          <div className="text-white/80 text-xs">clicks/month</div>
          <motion.div 
            className="mt-3 flex gap-1 items-end"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {[30, 45, 55, 70, 90].map((h, i) => (
              <motion.div 
                key={i} 
                className="w-5 bg-white/50 rounded-sm"
                initial={{ height: 20 }}
                animate={{ height: h }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Growth arrow */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: showStats ? 1 : 0, rotate: 0 }}
          transition={{ delay: 1.2, type: "spring" }}
        >
          <div className="bg-yellow-400 rounded-full p-3 shadow-lg">
            <ArrowUp className="w-8 h-8 text-gray-900" />
          </div>
        </motion.div>
      </div>

      {/* Bottom stats row */}
      <motion.div 
        className="flex gap-3 mt-4 z-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {[
          { icon: TrendingUp, label: "+5000%", color: "bg-green-500" },
          { icon: Eye, label: "1M Views", color: "bg-blue-500" },
          { icon: Award, label: "Top 3", color: "bg-yellow-500" },
        ].map(({ icon: Icon, label, color }, i) => (
          <motion.div
            key={i}
            className={`${color} text-white text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-lg`}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          >
            <Icon className="w-3 h-3" />
            {label}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

// ========= SLIDE 5: SEO BEFORE/AFTER - Full Screen 3D Score =========
const SlideSEOBeforeAfter = () => {
  const [showAfter, setShowAfter] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowAfter(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[4]} overflow-hidden`}>
      {/* Floating decorative icons */}
      {[Target, Zap, Sparkles, Image, ChevronRight, Smartphone].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-white/10"
          style={{ 
            left: `${8 + i * 14}%`, 
            top: `${12 + (i % 3) * 28}%`,
          }}
          animate={{ 
            y: [0, -15, 0], 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.25 }}
        >
          <Icon size={18 + i * 5} />
        </motion.div>
      ))}

      {/* Header */}
      <ZoomPunch>
        <div className="flex items-center gap-2 mb-6 z-10">
          <Target className="w-8 h-8 text-white" />
          <GlitchText className="text-2xl font-black text-white">
            SEO Score
          </GlitchText>
        </div>
      </ZoomPunch>

      {/* 3D Comparison */}
      <div className="relative w-full flex justify-center gap-4 z-10" style={{ perspective: 1200 }}>
        {/* Before Score */}
        <motion.div
          className="w-36 bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-5 shadow-2xl"
          initial={{ opacity: 0, rotateY: -30, x: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotateY: -10, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 80, delay: 0.3 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 30px 60px -15px rgba(0,0,0,0.4)" }}
        >
          <div className="text-white/70 text-xs font-bold mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-400 rounded-full" />
            BEFORE
          </div>
          
          {/* Circular Score */}
          <div className="relative w-24 h-24 mx-auto mb-3">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <motion.circle 
                cx="48" cy="48" r="42" fill="none" stroke="#ef4444" strokeWidth="8"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * 0.23) }}
                transition={{ duration: 1.5, delay: 0.5 }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-white">23%</span>
            </div>
          </div>

          <div className="space-y-1">
            {["Missing meta", "No alt text", "Slow load"].map((issue, i) => (
              <div key={i} className="flex items-center gap-1 text-white/70 text-xs">
                <span className="text-red-400">✗</span> {issue}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Arrow */}
        <motion.div
          className="flex items-center"
          initial={{ scale: 0 }}
          animate={{ scale: showAfter ? 1 : 0 }}
          transition={{ delay: 1.2, type: "spring" }}
        >
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Rocket className="w-8 h-8 text-yellow-300" />
          </motion.div>
        </motion.div>

        {/* After Score */}
        <motion.div
          className="w-40 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-5 shadow-2xl"
          initial={{ opacity: 0, rotateY: 30, x: 30, scale: 0.8 }}
          animate={{ 
            opacity: showAfter ? 1 : 0, 
            rotateY: showAfter ? 10 : 30, 
            x: 0, 
            scale: showAfter ? 1.05 : 0.8 
          }}
          transition={{ type: "spring", stiffness: 80 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.5)" }}
        >
          <div className="text-yellow-300 text-xs font-bold mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AFTER AI
          </div>
          
          {/* Circular Score */}
          <div className="relative w-28 h-28 mx-auto mb-3">
            <svg className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <motion.circle 
                cx="56" cy="56" r="48" fill="none" stroke="#22c55e" strokeWidth="10"
                strokeDasharray={301}
                initial={{ strokeDashoffset: 301 }}
                animate={{ strokeDashoffset: showAfter ? 301 - (301 * 0.91) : 301 }}
                transition={{ duration: 2, delay: 1.5 }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span 
                className="text-4xl font-black text-white"
                animate={showAfter ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, delay: 2.5 }}
              >
                91%
              </motion.span>
            </div>
          </div>

          <div className="space-y-1">
            {["AI meta tags", "Vision alt text", "Optimized"].map((fix, i) => (
              <motion.div 
                key={i} 
                className="flex items-center gap-1 text-white text-xs"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: showAfter ? 1 : 0, x: 0 }}
                transition={{ delay: 2 + i * 0.2 }}
              >
                <Check className="w-3 h-3 text-yellow-300" /> {fix}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom improvement badge */}
      <motion.div
        className="mt-6 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-3 z-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.5 }}
      >
        <TrendingUp className="w-6 h-6 text-yellow-300" />
        <span className="text-white font-black text-lg">+68% Improvement</span>
      </motion.div>

      {/* Bottom icons */}
      <motion.div 
        className="absolute bottom-6 flex gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[Zap, Shield, Award].map((Icon, i) => (
          <motion.div
            key={i}
            className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          >
            <Icon className="w-5 h-5 text-white/80" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

// ========= SLIDE 6: SEO SCORE (Original) =========
const SlideSEOScore = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[5]}`}>
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-2xl font-black text-blue-900 text-center mb-2">
        <GlitchText>SEO Score</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-lg text-blue-700 text-center mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <span className="text-red-500">34%</span> → <span className="text-green-500">95%</span>
    </motion.p>

    <motion.div
      initial={{ scale: 0, rotateY: -180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ delay: 0.5, type: "spring" }}
      style={{ perspective: 1000 }}
    >
      <SEOScoreCircle startScore={34} endScore={95} duration={2} />
    </motion.div>

    <motion.div
      className="mt-6 bg-blue-100 backdrop-blur-sm rounded-xl px-6 py-3"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.2 }}
    >
      <p className="text-blue-900 font-bold text-center">
        ✨ <NeonText color="#22c55e">Fully Automated</NeonText> ✨
      </p>
    </motion.div>
  </motion.div>
);

// ========= SLIDE 5: BEFORE/AFTER - 3D Tilted Phones with Zoom Animation =========
const SlideBeforeAfter = () => {
  const [showAfter, setShowAfter] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowAfter(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${SLIDE_BACKGROUNDS[6]} overflow-hidden`}>
      {/* Background glow effects */}
      <motion.div
        className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-[100px]"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      {/* Floating decorative elements */}
      {[Image, Sparkles, Eye, Camera, Wand2].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute text-white/10"
          style={{ 
            left: `${5 + i * 20}%`, 
            top: `${8 + (i % 3) * 28}%`,
          }}
          animate={{ 
            y: [0, -15, 0], 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.15 }}
        >
          <Icon size={18 + i * 4} />
        </motion.div>
      ))}

      {/* Header */}
      <ZoomPunch>
        <div className="flex items-center gap-2 mb-1 z-10">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Eye className="w-6 h-6 text-white" />
          </motion.div>
          <GlitchText className="text-xl font-black text-white">
            See the Difference
          </GlitchText>
        </div>
      </ZoomPunch>
      
      <motion.p
        className="text-sm text-white/80 text-center mb-2 z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <NeonText color="#60a5fa">Vision AI Enhancement</NeonText>
      </motion.p>

      {/* Conversion Badge */}
      <motion.div
        className="mb-3 z-20"
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        <motion.div 
          className="bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-1.5 rounded-full shadow-2xl border border-white/30"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-white font-black text-base">+68% Conversions 🚀</span>
        </motion.div>
      </motion.div>

      {/* 3D Tilted Phones - Strong inclination left/right with zoom */}
      <div className="relative w-full flex justify-center items-center z-10" style={{ perspective: 2000 }}>
        
        {/* Before Phone - Tilted LEFT with zoom animation */}
        <motion.div
          className="relative"
          initial={{ x: -200, rotateY: -90, rotateZ: -20, scale: 0.3, opacity: 0 }}
          animate={{ 
            x: showAfter ? -20 : 0, 
            rotateY: -25, 
            rotateZ: -8,
            rotateX: 5,
            scale: showAfter ? [0.85, 0.9, 0.85] : 1, 
            opacity: 1 
          }}
          transition={{ 
            type: "spring", 
            stiffness: 50, 
            damping: 12, 
            delay: 0.1,
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
        >
          {/* Red glow behind */}
          <motion.div
            className="absolute inset-0 rounded-[28px] blur-3xl bg-red-500/40 -z-10"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          
          {/* Phone Frame */}
          <div className="relative w-32 bg-gradient-to-b from-gray-700 to-gray-900 rounded-[24px] p-1.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-gray-600">
            {/* Notch */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-black rounded-full z-20" />
            
            {/* Screen */}
            <div className="bg-white rounded-[20px] overflow-hidden">
              <div className="bg-red-500 text-white text-[10px] font-bold py-1 text-center mt-2.5">
                ✕ BEFORE
              </div>
              
              <div className="relative h-40 bg-gray-100">
                <img 
                  src={sofaWhiteBackground} 
                  className="w-full h-full object-cover grayscale opacity-75" 
                  alt="Before"
                />
                <div className="absolute inset-0 bg-black/25" />
                
                {/* Sad overlay */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="bg-red-500/90 rounded-full p-2 shadow-lg">
                    <span className="text-white text-lg">😔</span>
                  </div>
                </motion.div>
              </div>
              
              <div className="p-1.5 text-center text-[9px] text-gray-500 font-medium">
                Plain • Low Quality
              </div>
            </div>
          </div>
        </motion.div>

        {/* Arrow in center - pulsing */}
        <motion.div
          className="mx-2 z-30"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: showAfter ? 1 : 0, opacity: showAfter ? 1 : 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
        >
          <motion.div
            animate={{ 
              x: [0, 10, 0], 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <div className="w-9 h-9 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-xl">
              <ArrowRight className="w-5 h-5 text-gray-900" />
            </div>
          </motion.div>
        </motion.div>

        {/* After Phone - Tilted RIGHT with zoom animation (bigger, emphasized) */}
        <motion.div
          className="relative"
          initial={{ x: 200, rotateY: 90, rotateZ: 20, scale: 0.3, opacity: 0 }}
          animate={{ 
            x: showAfter ? 20 : 0, 
            rotateY: 20, 
            rotateZ: 6,
            rotateX: -3,
            scale: showAfter ? [1.05, 1.15, 1.05] : 0.9, 
            opacity: showAfter ? 1 : 0.5 
          }}
          transition={{ 
            type: "spring", 
            stiffness: 50, 
            damping: 12,
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
          }}
          style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
        >
          {/* Blue/cyan glow behind - more intense */}
          <motion.div
            className="absolute inset-0 rounded-[32px] blur-[40px] bg-gradient-to-r from-blue-400 to-cyan-400 -z-10"
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Phone Frame - slightly larger */}
          <div className="relative w-36 bg-gradient-to-b from-gray-600 to-gray-900 rounded-[28px] p-2 shadow-[0_30px_80px_-20px_rgba(59,130,246,0.6)] border-2 border-blue-400/60">
            {/* Notch */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20" />
            
            {/* Screen */}
            <div className="bg-white rounded-[22px] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] font-bold py-1.5 text-center mt-3">
                ✨ AFTER AI
              </div>
              
              <div className="relative h-44">
                <motion.img 
                  src={sofaWithBackground} 
                  className="w-full h-full object-cover" 
                  alt="After"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                {/* Shine sweep effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  animate={{ x: ["-150%", "250%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                />
                
                {/* Success checkmark */}
                <motion.div
                  className="absolute top-2 right-2"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: showAfter ? 1 : 0, rotate: 0 }}
                  transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                >
                  <div className="bg-green-500 rounded-full p-1.5 shadow-lg border-2 border-white">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                </motion.div>
              </div>
              
              <div className="p-1.5 text-center text-[9px] font-bold text-blue-600">
                AI Background • Pro Quality
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom stats badges */}
      <motion.div 
        className="flex gap-2 mt-3 z-10"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        {[
          { icon: Image, label: "HD", color: "bg-blue-500" },
          { icon: Sparkles, label: "AI", color: "bg-purple-500" },
          { icon: TrendingUp, label: "+68%", color: "bg-green-500" },
        ].map(({ icon: Icon, label, color }, i) => (
          <motion.div
            key={i}
            className={`${color} text-white text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 shadow-lg`}
            animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          >
            <Icon className="w-3 h-3" />
            {label}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

// ========= SLIDE 6: LANDING PAGE =========
const SlideLandingPage = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${SLIDE_BACKGROUNDS[7]}`}>
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-xl font-black text-blue-900 text-center mb-2">
        <GlitchText>AI Landing Pages</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-sm text-blue-700 text-center mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Generated in seconds
    </motion.p>

    <motion.div
      initial={{ scale: 0.7, rotateY: -20 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ type: "spring" }}
      style={{ perspective: 1000 }}
    >
      <LandingPageMockup 
        productTitle="Premium Velvet Sofa"
        productPrice="$1,299"
      />
    </motion.div>
  </motion.div>
);

// ========= SLIDE 7: IMAGE ENHANCEMENT =========
const SlideImageEnhancement = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${SLIDE_BACKGROUNDS[8]}`}>
    <SpeedLines />
    
    <ZoomPunch>
      <h2 className="text-xl font-black text-white text-center mb-2">
        <GlitchText>Vision AI</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-sm text-white/80 text-center mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Image Treatment & Optimization
    </motion.p>

    <motion.div
      initial={{ scale: 0.8, rotateX: -20 }}
      animate={{ scale: 1, rotateX: 0 }}
      transition={{ type: "spring" }}
      style={{ perspective: 1000 }}
    >
      <ImageEnhancement />
    </motion.div>
  </motion.div>
);

// ========= SLIDE 8: GOOGLE SHOPPING =========
const SlideGoogleShopping = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[9]}`}>
    <FloatingParticles />
    
    <motion.div
      className="mb-6"
      initial={{ scale: 0, rotateY: -180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ type: "spring" }}
      style={{ perspective: 1000 }}
    >
      <Rotating3D duration={6}>
        <motion.div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <GoogleLogo />
        </motion.div>
      </Rotating3D>
    </motion.div>

    <ZoomPunch>
      <h2 className="text-2xl font-black text-blue-900 text-center mb-6">
        Google Shopping <span className="text-blue-600">Ready</span>
      </h2>
    </ZoomPunch>

    <div className="space-y-3 w-full max-w-xs">
      {[
        { icon: <Check className="w-5 h-5" />, label: "XML Feed Auto", desc: "Generated automatically" },
        { icon: <Target className="w-5 h-5" />, label: "Google Categories", desc: "Smart mapping" },
        { icon: <Sparkles className="w-5 h-5" />, label: "GTIN/EAN", desc: "Full validation" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="bg-blue-100 backdrop-blur-md rounded-xl p-4 flex items-center gap-4"
          initial={{ x: i % 2 === 0 ? -100 : 100, opacity: 0, rotateY: i % 2 === 0 ? -30 : 30 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
            {item.icon}
          </div>
          <div>
            <p className="text-blue-900 font-bold">{item.label}</p>
            <p className="text-blue-600 text-sm">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div
      className="mt-6 flex gap-3"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">0 Errors</span>
      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">100% GMC Ready</span>
    </motion.div>
  </motion.div>
);

// ========= SLIDE 9: CTA =========
const SlideCTA = () => (
  <motion.div className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${SLIDE_BACKGROUNDS[10]}`}>
    <FloatingParticles />
    <ParticleExplosion trigger={true} count={30} />
    
    {/* 3D Logo */}
    <motion.div
      className="mb-6"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring" }}
    >
      <motion.div
        className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl"
        animate={{
          boxShadow: [
            "0 0 30px rgba(255,255,255,0.3)",
            "0 0 60px rgba(168,85,247,0.8)",
            "0 0 30px rgba(255,255,255,0.3)",
          ],
          rotateY: [0, 360],
        }}
        transition={{ 
          boxShadow: { duration: 2, repeat: Infinity },
          rotateY: { duration: 8, repeat: Infinity, ease: "linear" }
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <span className="text-blue-600 text-5xl font-black">N</span>
      </motion.div>
    </motion.div>

    <ZoomPunch>
      <GlitchText className="text-3xl font-black text-white text-center mb-4">
        Start Free Today
      </GlitchText>
    </ZoomPunch>

    <motion.div
      className="mb-6"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
    >
      <motion.button
        className="bg-white text-blue-600 font-black text-xl px-8 py-4 rounded-2xl shadow-2xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: [
            "0 0 20px rgba(59,130,246,0.5)",
            "0 0 50px rgba(59,130,246,0.9)",
            "0 0 20px rgba(59,130,246,0.5)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🚀 Free Trial
      </motion.button>
    </motion.div>

    <motion.p
      className="text-white/80 text-center mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      No credit card required
    </motion.p>

    {/* Stats */}
    <motion.div
      className="flex gap-6"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.9 }}
    >
      {[
        { value: "10K+", label: "Products", color: "text-yellow-300" },
        { value: "500+", label: "Sellers", color: "text-green-400" },
        { value: "95%", label: "Satisfaction", color: "text-pink-400" },
      ].map((stat, i) => (
        <FloatingElement key={i} delay={i * 0.2} amp={3}>
          <div className="text-center">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-white/70 text-xs">{stat.label}</p>
          </div>
        </FloatingElement>
      ))}
    </motion.div>
  </motion.div>
);

// All slides
const slides = [SlideIntro, SlideStats, SlideGoogleMockups, SlideSearchConsole, SlideSEOBeforeAfter, SlideSEOScore, SlideBeforeAfter, SlideLandingPage, SlideImageEnhancement, SlideGoogleShopping, SlideCTA];
const SLIDE_DURATION = 5000; // Increased for seamless audio - no cuts between slides

export default function AnimationAds() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);

  // Load audio ONLY from pre-stored cache - NO ElevenLabs API calls
  useEffect(() => {
    const preloadAllAudio = async () => {
      if (audioPreloadPromise) return;
      
      setIsLoadingAudio(true);
      
      audioPreloadPromise = (async () => {
        // Load audio from storage only - no fallback to API
        for (let index = 0; index < PRELOADED_AUDIO_URLS.length; index++) {
          if (audioCache.has(index)) continue;
          
          try {
            const audioUrl = PRELOADED_AUDIO_URLS[index];
            const audio = new Audio(audioUrl);
            audio.volume = 0.8;
            audio.preload = 'auto';
            
            // Wait for audio to be loaded with timeout
            await Promise.race([
              new Promise<void>((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => resolve(), { once: true });
                audio.addEventListener('error', () => reject(new Error(`Audio not found in storage`)), { once: true });
                audio.load();
              }),
              new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            audioCache.set(index, audio);
            console.log(`✓ Audio ${index + 1}/${PRELOADED_AUDIO_URLS.length} loaded from storage`);
          } catch (err) {
            // Audio not available in storage - skip silently (no API calls)
            console.log(`⚠ Audio ${index} not available in storage, skipping`);
          }
        }
      })();
      
      await audioPreloadPromise;
      setIsLoadingAudio(false);
      setAudioReady(true);
    };
    
    preloadAllAudio();
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Play voice narration when slide changes - SEAMLESS continuous audio
  useEffect(() => {
    if (isMuted || !audioReady) return;
    
    const playNarration = async () => {
      // Fade out current audio smoothly instead of abrupt stop
      if (audioRef.current) {
        const currentAudio = audioRef.current;
        // Quick fade out over 200ms
        const fadeInterval = setInterval(() => {
          if (currentAudio.volume > 0.1) {
            currentAudio.volume = Math.max(0, currentAudio.volume - 0.2);
          } else {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            clearInterval(fadeInterval);
          }
        }, 40);
      }
      
      // Small delay for smooth transition between narrations
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Get cached audio
      const cachedAudio = audioCache.get(currentSlide);
      if (cachedAudio) {
        // Clone the audio to allow replay
        const audio = cachedAudio.cloneNode(true) as HTMLAudioElement;
        audio.volume = 0; // Start at 0 for fade in
        audioRef.current = audio;
        
        try {
          await audio.play();
          // Fade in smoothly
          const fadeInInterval = setInterval(() => {
            if (audio.volume < 0.8) {
              audio.volume = Math.min(0.8, audio.volume + 0.2);
            } else {
              clearInterval(fadeInInterval);
            }
          }, 40);
        } catch (err) {
          console.error('Playback error:', err);
        }
      }
    };
    
    playNarration();
    
    return () => {
      // Don't abruptly stop - let fade handle it
    };
  }, [currentSlide, isMuted, audioReady]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleExportVideo = async () => {
    if (!containerRef.current) return;
    
    setIsExporting(true);
    setIsPlaying(false);
    toast.info("Recording video... Please wait");

    try {
      const container = containerRef.current;
      
      // Use getDisplayMedia for screen capture of the container area
      // Or fallback to canvas recording
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // Set canvas size (9:16 aspect ratio)
      canvas.width = 1080;
      canvas.height = 1920;
      
      const stream = canvas.captureStream(30);
      
      // Check for supported mime types
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : MediaRecorder.isTypeSupported('video/webm') 
          ? 'video/webm'
          : 'video/mp4';
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 8000000
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const recordingComplete = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = mimeType.includes('mp4') ? 'NewAI-Ad.mp4' : 'NewAI-Ad.webm';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Video exported!");
          resolve();
        };
      });
      
      recorder.start(100);
      
      // Record each slide
      const slideDuration = 4000; // 4 seconds per slide
      const frameRate = 30;
      const frameInterval = 1000 / frameRate;
      
      for (let slideIdx = 0; slideIdx < slides.length; slideIdx++) {
        setCurrentSlide(slideIdx);
        
        // Wait for slide transition animation
        await new Promise(r => setTimeout(r, 700));
        
        // Capture frames for this slide duration
        const framesPerSlide = Math.floor((slideDuration - 700) / frameInterval);
        
        for (let frame = 0; frame < framesPerSlide; frame++) {
          try {
            const capturedCanvas = await html2canvas(container, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#1e40af',
              logging: false,
            });
            
            ctx.fillStyle = '#1e40af';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling to fit 9:16
            const scale = Math.min(
              canvas.width / capturedCanvas.width,
              canvas.height / capturedCanvas.height
            );
            const x = (canvas.width - capturedCanvas.width * scale) / 2;
            const y = (canvas.height - capturedCanvas.height * scale) / 2;
            
            ctx.drawImage(
              capturedCanvas, 
              x, y, 
              capturedCanvas.width * scale, 
              capturedCanvas.height * scale
            );
          } catch (err) {
            // Continue on frame capture error
          }
          
          await new Promise(r => setTimeout(r, frameInterval));
          
          // Update progress
          const progress = Math.round(((slideIdx * framesPerSlide + frame) / (slides.length * framesPerSlide)) * 100);
          if (frame % 10 === 0) {
            toast.info(`Recording: ${progress}%`, { id: 'export-progress' });
          }
        }
      }
      
      recorder.stop();
      await recordingComplete;
      setIsExporting(false);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed. Try using screen recording.");
      setIsExporting(false);
    }
  };

  const handleGenerateAudio = async () => {
    toast.info("Generating audio narrations...");
    try {
      const { data, error } = await supabase.functions.invoke('generate-animationads-audio');
      if (error) throw error;
      
      toast.success(data.message || "Audio generated!");
      // Reload audio cache
      window.location.reload();
    } catch (error) {
      console.error('Audio generation error:', error);
      toast.error("Failed to generate audio");
    }
  };

  const handleDownload = () => {
    toast.info("Use Export Video button for video download");
  };

  const CurrentSlideComponent = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 gap-4">
      {/* Export Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleExportVideo}
          disabled={isExporting}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
        >
          <Film className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Video'}
        </Button>
        <Button
          onClick={handleGenerateAudio}
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Audio
        </Button>
      </div>

      {/* 9:16 Container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900"
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={slideTransition3D.initial}
            animate={slideTransition3D.animate}
            exit={slideTransition3D.exit}
            transition={{ 
              duration: 0.6, 
              ease: [0.25, 0.46, 0.45, 0.94],
              rotateY: { type: "spring", stiffness: 80, damping: 20 },
              rotateX: { type: "spring", stiffness: 100, damping: 25 }
            }}
            style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Progress bar - video style */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
          <motion.div 
            className="h-full bg-white"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-30">
          <button
            onClick={toggleMute}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>

        {/* Loading indicator */}
        {isLoadingAudio && (
          <div className="absolute top-4 left-16 z-30">
            <motion.div
              className="w-3 h-3 bg-blue-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        )}

        {/* Slide counter */}
        <div className="absolute top-4 left-4 z-30 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white text-sm font-bold">{currentSlide + 1}/{slides.length}</span>
        </div>
      </div>
    </div>
  );
}
