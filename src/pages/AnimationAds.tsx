import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Star, Check, Target, Sparkles, Download, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Import components
import { SEOScoreCircle } from "@/components/video3d/SEOScoreCircle";
import { BeforeAfterSplit } from "@/components/video3d/BeforeAfterSplit";
import { LandingPageMockup } from "@/components/video3d/LandingPageMockup";
import { ImageEnhancement } from "@/components/video3d/ImageEnhancement";
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

// Import mockup images for 3D carousel
import googleMockupsPhones from "@/assets/mockups/google-mockups-phones.png";
import searchConsoleGrowth from "@/assets/mockups/search-console-growth.png";
import seoBeforeAfter from "@/assets/mockups/seo-before-after.png";

// ========= ENGLISH NARRATIONS =========
const SLIDE_NARRATIONS_EN = [
  "NewAI — the AI that boosts your Shopify SEO automatically. Connect Shopify, Google, Facebook and Instagram in one click!",
  "Real results: 3x faster workflow, 50% more traffic, save 10 hours weekly, and Top 10 Google ranking!",
  "Appear on Google Search, Shopping, and Discover — reach millions of potential customers!",
  "Watch your SEO score transform from 34% to 95% — fully automated with AI optimization!",
  "See the difference! Before: plain white background. After: Vision AI professional staging. Plus 68% more conversions!",
  "Auto-generated landing pages with AI — conversion-optimized HTML ready to deploy in seconds!",
  "AI Vision analyzes and enhances every product image. Alt text, backgrounds, optimization — all automatic!",
  "Google Shopping ready! XML feed, category mapping, GTIN validation. Zero errors guaranteed!",
  "Start your free trial today. No credit card required. Join 500+ successful sellers!"
];

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

// 3D Slide transition variants
const slideTransition3D = {
  initial: { opacity: 0, rotateY: -45, scale: 0.8, z: -200 },
  animate: { opacity: 1, rotateY: 0, scale: 1, z: 0 },
  exit: { opacity: 0, rotateY: 45, scale: 0.8, z: -200 }
};

// ========= SLIDE 1: INTRO =========
const SlideIntro = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    <ParticleExplosion trigger={true} count={25} />
    
    {/* Central Glow */}
    <motion.div
      className="absolute w-64 h-64 bg-purple-400/30 rounded-full blur-3xl"
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
          <span className="text-purple-600 text-5xl font-black">N</span>
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
      <NeonText color="#a855f7">AI-Powered E-commerce</NeonText>
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
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <SpeedLines />
    
    <ZoomPunch>
      <GlitchText className="text-3xl font-black text-white text-center mb-8 drop-shadow-lg">
        <span className="text-yellow-300">Real</span> Results
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

// ========= SLIDE 3: SHOPIFY - 3 Photos Scrolling =========
const SlideShopifyPhotos = () => {
  const [activePhoto, setActivePhoto] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhoto(prev => (prev + 1) % 3);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white overflow-hidden">
      <motion.h2
        className="text-xl font-black text-gray-900 text-center mb-4 z-20"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <span className="text-green-600">Shopify</span> + Google
      </motion.h2>

      <div className="relative w-full h-56 flex items-center justify-center" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhoto}
            className="absolute w-[85%] h-full rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100"
            initial={{ opacity: 0, rotateY: 90, scale: 0.6, x: 150 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, rotateY: -90, scale: 0.6, x: -150 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            style={{ transformStyle: "preserve-3d", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
          >
            <img 
              src={googleMockupsPhones} 
              alt="Google Mockups"
              className="w-full h-full object-contain"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 mt-4">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className={`w-3 h-3 rounded-full ${i === activePhoto ? 'bg-green-600' : 'bg-gray-300'}`}
            animate={i === activePhoto ? { scale: [1, 1.4, 1] } : {}}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        {["Search", "Shopping", "Discover"].map((label, i) => (
          <motion.span
            key={i}
            className={`text-xs px-3 py-1 rounded-full font-bold ${i === activePhoto ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            {label}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

// ========= SLIDE 4: SEARCH CONSOLE - 2 Photos 3D Mockup =========
const SlideSearchConsole = () => {
  const [showSecond, setShowSecond] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowSecond(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white overflow-hidden">
      <motion.h2
        className="text-xl font-black text-gray-900 text-center mb-4 z-20"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <span className="text-blue-600">Search Console</span> Growth
      </motion.h2>

      <div className="relative w-full h-64 flex items-center justify-center" style={{ perspective: 1500 }}>
        {/* First card - tilted left */}
        <motion.div
          className="absolute w-[75%] h-48 rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100"
          initial={{ opacity: 0, rotateY: -45, rotateZ: -5, x: -80, scale: 0.8 }}
          animate={{ opacity: 1, rotateY: -15, rotateZ: -3, x: -40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)" }}
        >
          <img 
            src={searchConsoleGrowth} 
            alt="Search Console"
            className="w-full h-full object-contain"
          />
          <motion.div 
            className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            +500%
          </motion.div>
        </motion.div>

        {/* Second card - tilted right */}
        <motion.div
          className="absolute w-[75%] h-48 rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100"
          initial={{ opacity: 0, rotateY: 45, rotateZ: 5, x: 80, scale: 0.8 }}
          animate={{ 
            opacity: showSecond ? 1 : 0, 
            rotateY: showSecond ? 15 : 45, 
            rotateZ: 3, 
            x: showSecond ? 40 : 80, 
            scale: 0.9 
          }}
          transition={{ type: "spring", stiffness: 100 }}
          style={{ transformStyle: "preserve-3d", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)", zIndex: showSecond ? 10 : 0 }}
        >
          <img 
            src={searchConsoleGrowth} 
            alt="Search Console"
            className="w-full h-full object-contain"
          />
          <motion.div 
            className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
          >
            10K+
          </motion.div>
        </motion.div>
      </div>

      <motion.div 
        className="flex gap-4 mt-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold">Before: ~200/month</span>
        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">After: 10K+/month</span>
      </motion.div>
    </motion.div>
  );
};

// ========= SLIDE 5: SEO BEFORE/AFTER - Score Mockup =========
const SlideSEOBeforeAfter = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-white overflow-hidden">
    <motion.h2
      className="text-xl font-black text-gray-900 text-center mb-4 z-20"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <span className="text-orange-600">SEO Score</span> Transformation
    </motion.h2>

    <motion.div
      className="relative w-[90%] rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100"
      initial={{ opacity: 0, scale: 0.7, rotateX: 30 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
      style={{ 
        perspective: 1200,
        transformStyle: "preserve-3d", 
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2)" 
      }}
    >
      <img 
        src={seoBeforeAfter} 
        alt="SEO Before After"
        className="w-full h-auto object-contain"
      />
      
      {/* Animated overlay highlights */}
      <motion.div 
        className="absolute top-4 left-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 0.8 }}
      >
        23%
      </motion.div>
      
      <motion.div 
        className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 1.2 }}
      >
        91%
      </motion.div>

      <motion.div 
        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        +68% Improvement
      </motion.div>
    </motion.div>

    <motion.div 
      className="flex gap-3 mt-4"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <span className="text-gray-500 text-xs">✗ Missing meta</span>
      <span className="text-gray-500 text-xs">→</span>
      <span className="text-green-600 text-xs font-bold">✓ AI Optimized</span>
    </motion.div>
  </motion.div>
);

// ========= SLIDE 6: SEO SCORE (Original) =========
const SlideSEOScore = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-2xl font-black text-white text-center mb-2">
        <GlitchText>SEO Score</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-lg text-white/80 text-center mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <span className="text-red-400">34%</span> → <span className="text-green-400">95%</span>
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
      className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.2 }}
    >
      <p className="text-white font-bold text-center">
        ✨ <NeonText color="#22c55e">Fully Automated</NeonText> ✨
      </p>
    </motion.div>
  </motion.div>
);

// ========= SLIDE 5: BEFORE/AFTER =========
const SlideBeforeAfter = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <ParticleExplosion trigger={true} count={15} />
    
    <ZoomPunch>
      <h2 className="text-2xl font-black text-white text-center mb-1 z-10">
        <GlitchText>See the Difference</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-sm text-white/80 text-center mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Vision AI Enhancement
    </motion.p>

    <motion.div
      initial={{ scale: 0.8, rotateX: 30 }}
      animate={{ scale: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      style={{ perspective: 1000 }}
    >
      <BeforeAfterSplit 
        beforeImage={sofaWhiteBackground}
        afterImage={sofaWithBackground}
        beforeLabel="BEFORE"
        afterLabel="AFTER AI"
        conversionBoost="+68%"
      />
    </motion.div>
  </motion.div>
);

// ========= SLIDE 6: LANDING PAGE =========
const SlideLandingPage = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-xl font-black text-white text-center mb-2">
        <GlitchText>AI Landing Pages</GlitchText>
      </h2>
    </ZoomPunch>
    
    <motion.p
      className="text-sm text-white/80 text-center mb-4"
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
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
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
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
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
      <h2 className="text-2xl font-black text-white text-center mb-6">
        Google Shopping <span className="text-yellow-300">Ready</span>
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
          className="bg-white/20 backdrop-blur-md rounded-xl p-4 flex items-center gap-4"
          initial={{ x: i % 2 === 0 ? -100 : 100, opacity: 0, rotateY: i % 2 === 0 ? -30 : 30 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
            {item.icon}
          </div>
          <div>
            <p className="text-white font-bold">{item.label}</p>
            <p className="text-white/70 text-sm">{item.desc}</p>
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
      <span className="bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-bold">100% GMC Ready</span>
    </motion.div>
  </motion.div>
);

// ========= SLIDE 9: CTA =========
const SlideCTA = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
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
        <span className="text-purple-600 text-5xl font-black">N</span>
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
        className="bg-white text-purple-600 font-black text-xl px-8 py-4 rounded-2xl shadow-2xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          boxShadow: [
            "0 0 20px rgba(168,85,247,0.5)",
            "0 0 50px rgba(168,85,247,0.9)",
            "0 0 20px rgba(168,85,247,0.5)",
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
const slides = [SlideIntro, SlideStats, SlideShopifyPhotos, SlideSearchConsole, SlideSEOBeforeAfter, SlideSEOScore, SlideBeforeAfter, SlideLandingPage, SlideImageEnhancement, SlideGoogleShopping, SlideCTA];
const SLIDE_DURATION = 4000; // Reduced from 6000ms to 4000ms

export default function AnimationAds() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Play voice narration when slide changes (ENGLISH)
  useEffect(() => {
    if (isMuted) return;
    
    const playNarration = async () => {
      try {
        setIsLoadingAudio(true);
        
        const { data, error } = await supabase.functions.invoke('robot-tts', {
          body: { text: SLIDE_NARRATIONS_EN[currentSlide] }
        });

        if (error) {
          console.error('TTS error:', error);
          return;
        }

        // Handle quota exceeded gracefully
        if (data?.quotaExceeded) {
          console.log('ElevenLabs quota exceeded - playing without audio');
          return;
        }

        if (data?.audio) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audioRef.current = audio;
          audio.volume = 0.8;
          await audio.play();
        }
      } catch (err) {
        console.error('Narration error:', err);
      } finally {
        setIsLoadingAudio(false);
      }
    };

    playNarration();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentSlide, isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    // Simulate export - in production you would use a library like html2canvas + video encoder
    setTimeout(() => {
      setIsExporting(false);
      alert('Video export coming soon! For now, use screen recording.');
    }, 2000);
  };

  const handleDownload = () => {
    // Create a download link for screen recording instructions
    const instructions = `
NewAI Animation Ads - Export Instructions
==========================================

Pour exporter cette vidéo:
1. Utilisez un logiciel d'enregistrement d'écran (OBS, Loom, etc.)
2. Enregistrez la vidéo en format 9:16 (vertical)
3. Durée totale: environ ${slides.length * 4} secondes

Ou utilisez l'export vidéo intégré (bientôt disponible).
    `;
    
    const blob = new Blob([instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newai-video-instructions.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const CurrentSlideComponent = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 gap-4">
      {/* Export Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleExportVideo}
          disabled={isExporting}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Film className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Video'}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* 9:16 Container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900"
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={slideTransition3D.initial}
            animate={slideTransition3D.animate}
            exit={slideTransition3D.exit}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'bg-white w-6' : 'bg-white/40'
              }`}
            />
          ))}
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
              className="w-3 h-3 bg-purple-400 rounded-full"
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
