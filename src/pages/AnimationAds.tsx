import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, ArrowRight, Check, Star, Zap, TrendingUp, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import real assets
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";
import shopifyLogo from "@/assets/shopify-logo.svg";

// Voice narration for each slide
const SLIDE_NARRATIONS = [
  "NewAI, l'intelligence artificielle qui transforme votre e-commerce. Connectez Shopify, Google, Facebook et Instagram en un clic.",
  "Des résultats concrets: 3 fois plus rapide, 50% plus de trafic, 10 heures économisées par semaine, et un classement Top 10 sur Google!",
  "Vos produits visibles partout sur Google: Search, Shopping et Discover. Maximum de visibilité garantie!",
  "Optimisation SEO automatique. NewAI analyse et optimise chaque produit pour Google. Regardez vos erreurs disparaître!",
  "Voyez la différence! Avant NewAI: fond blanc basique. Après NewAI: mise en scène professionnelle par l'IA. Plus 68% de conversions!",
  "Google Shopping Ready! Feed XML automatique, catégories Google optimisées, validation GTIN. Zéro erreur garantie!",
  "Témoignages clients: Sarah a augmenté son trafic de 180%. Marc économise 10 heures par semaine. Prix à partir de 49 dollars par mois!",
  "Commencez maintenant! Essai gratuit sans carte bancaire. Rejoignez plus de 500 vendeurs satisfaits!"
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

// Counter Animation Component
const AnimatedCounter = ({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 30;
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

// Speed Lines Effect
const SpeedLines = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        style={{
          top: `${Math.random() * 100}%`,
          left: '-100%',
          width: `${50 + Math.random() * 100}px`,
        }}
        animate={{
          x: ['0%', '200vw'],
        }}
        transition={{
          duration: 0.4 + Math.random() * 0.3,
          delay: i * 0.05,
          ease: "linear",
        }}
      />
    ))}
  </div>
);

// Glowing Burst Effect
const GlowBurst = () => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 0] }}
    transition={{ duration: 0.5 }}
  >
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-radial from-blue-500/50 via-transparent to-transparent" />
  </motion.div>
);

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

// Hand Pointer Animation (like the reference)
const HandPointer = ({ className }: { className?: string }) => (
  <motion.div
    className={`absolute ${className}`}
    animate={{
      y: [0, -10, 0],
      rotate: [0, 5, 0],
    }}
    transition={{
      duration: 1,
      repeat: Infinity,
    }}
  >
    <svg viewBox="0 0 64 64" className="w-16 h-16 drop-shadow-2xl">
      <path fill="#FFCC4D" d="M52 36.142c0-2.757-1.953-5.063-4.548-5.603l.376-3.02c.094-.746-.053-1.478-.424-2.117-.373-.639-.936-1.121-1.63-1.396-.695-.275-1.445-.325-2.172-.144a3.605 3.605 0 0 0-1.916 1.18l-.354.425c.011-.144.018-.289.018-.435 0-3.584-2.916-6.5-6.5-6.5s-6.5 2.916-6.5 6.5v2.022l-.453-.556a3.601 3.601 0 0 0-2.501-1.379 3.583 3.583 0 0 0-2.73.819c-.781.672-1.248 1.637-1.314 2.716-.067 1.079.284 2.094.988 2.859l3.088 3.353a21.71 21.71 0 0 0-.358 3.877c0 11.598 9.402 21 21 21 11.598 0 21-9.402 21-21 0-1.24-.125-2.45-.353-3.626A5.646 5.646 0 0 0 52 36.142z"/>
      <path fill="#F4900C" d="M34.85 18.532c-2.416 0-4.398 1.843-4.615 4.191l-1.385-1.686c-.436-.531-1.056-.879-1.745-.977a2.585 2.585 0 0 0-1.964.59c-.562.483-.898 1.177-.946 1.954-.047.777.204 1.508.711 2.058l5.594 6.071v-5.701c0-2.481 2.019-4.5 4.5-4.5s4.5 2.019 4.5 4.5a4.49 4.49 0 0 1-.736 2.467l-.708.851c.386-.141.802-.218 1.231-.218a3.644 3.644 0 0 1 3.113 1.766l.238-1.908c.062-.494-.036-1.004-.286-1.436-.251-.434-.633-.76-1.106-.947a2.594 2.594 0 0 0-2.776.702l-1.676 2.015v-3.292c0-3.584-2.916-6.5-6.5-6.5h-.449z"/>
    </svg>
  </motion.div>
);

// Slide 1: Intro NewAI with crazy blue theme
const SlideIntro = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <FloatingParticles />
    
    {/* Central Glow */}
    <motion.div
      className="absolute w-64 h-64 bg-blue-400/30 rounded-full blur-3xl"
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 3, repeat: Infinity }}
    />

    {/* NewAI Logo */}
    <motion.div
      className="relative z-10 mb-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      <motion.div 
        className="absolute inset-0 blur-3xl bg-white/50 rounded-full scale-150"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className="relative w-28 h-28 rounded-3xl bg-white flex items-center justify-center shadow-2xl">
        <span className="text-blue-600 text-5xl font-black">N</span>
      </div>
    </motion.div>

    <motion.h1
      className="text-5xl font-black text-white text-center mb-2 drop-shadow-lg"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      NewAI
    </motion.h1>

    <motion.p
      className="text-xl text-white/90 text-center mb-8 font-semibold"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      AI-Powered E-commerce
    </motion.p>

    {/* Integration Logos */}
    <motion.div
      className="flex items-center gap-3 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {[
        { logo: <img src={shopifyLogo} alt="Shopify" className="w-9 h-9" />, delay: 0.7 },
        { logo: <GoogleLogo />, delay: 0.8 },
        { logo: <FacebookLogo />, delay: 0.9 },
        { logo: <InstagramLogo />, delay: 1 },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl"
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: item.delay, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
        >
          {item.logo}
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

// Slide 2: Stats with explosive animations
const SlideStats = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <SpeedLines />
    
    <motion.h2
      className="text-3xl font-black text-white text-center mb-8 drop-shadow-lg"
      initial={{ scale: 3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      Résultats <span className="text-yellow-300">Garantis</span>
    </motion.h2>

    <div className="grid grid-cols-2 gap-4 w-full max-w-xs z-10">
      {[
        { value: 3, suffix: "x", label: "Plus rapide", color: "bg-gradient-to-br from-emerald-400 to-teal-500" },
        { value: 50, suffix: "%", label: "Plus de trafic", color: "bg-gradient-to-br from-yellow-400 to-orange-500" },
        { value: 10, suffix: "h+", label: "Économisées", color: "bg-gradient-to-br from-pink-400 to-rose-500" },
        { value: 10, prefix: "Top ", label: "Google", color: "bg-gradient-to-br from-blue-400 to-indigo-500" },
      ].map((stat, i) => (
        <motion.div
          key={i}
          className={`${stat.color} rounded-2xl p-5 text-center shadow-xl`}
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 150 }}
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

// Slide 3: Google Phone Mockups
const SlideGooglePhones = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <FloatingParticles />
    
    <motion.h2
      className="text-2xl font-black text-white text-center mb-6 z-10"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Visible partout sur <span className="text-yellow-300">Google</span>
    </motion.h2>

    <div className="relative flex items-end justify-center gap-2 z-10">
      {/* Left Phone - Search */}
      <motion.div
        className="w-24 bg-white rounded-2xl overflow-hidden shadow-2xl"
        initial={{ x: -150, opacity: 0, rotate: -30 }}
        animate={{ x: 0, opacity: 1, rotate: -6 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
      >
        <div className="bg-gray-100 h-4 flex items-center justify-center">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 mb-2">
            <GoogleLogo />
          </div>
          <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=120&fit=crop" alt="Search" className="w-full h-16 object-cover rounded-lg mb-1" />
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-[8px] font-bold text-green-600">€899</p>
        </div>
        <p className="text-[9px] text-center py-1 text-gray-600 font-bold bg-gray-50">Search</p>
      </motion.div>

      {/* Center Phone - Shopping */}
      <motion.div
        className="w-36 bg-white rounded-2xl overflow-hidden shadow-2xl z-20 border-4 border-blue-400"
        initial={{ y: 150, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
      >
        <div className="bg-blue-500 h-5 flex items-center justify-center">
          <span className="text-[9px] text-white font-bold">Google Shopping</span>
        </div>
        <div className="p-3">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=140&fit=crop" alt="Shopping" className="w-full h-24 object-cover rounded-lg mb-2" />
          <p className="text-[10px] font-bold">Nike Air Max 90</p>
          <p className="text-sm font-black text-green-600">€149,99</p>
          <div className="flex items-center gap-0.5 mt-1">
            {[1,2,3,4].map(i => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
            <Star className="w-3 h-3 text-gray-300" />
          </div>
        </div>
      </motion.div>

      {/* Right Phone - Discover */}
      <motion.div
        className="w-24 bg-white rounded-2xl overflow-hidden shadow-2xl"
        initial={{ x: 150, opacity: 0, rotate: 30 }}
        animate={{ x: 0, opacity: 1, rotate: 6 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
      >
        <div className="bg-gray-100 h-4 flex items-center justify-center">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">D</span>
            </div>
            <span className="text-[8px] font-bold">Discover</span>
          </div>
          <img src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200&h=100&fit=crop" alt="Discover" className="w-full h-14 object-cover rounded-lg mb-1" />
          <p className="text-[7px] font-medium line-clamp-2">Tendances 2024</p>
        </div>
        <p className="text-[9px] text-center py-1 text-gray-600 font-bold bg-gray-50">Discover</p>
      </motion.div>
    </div>

    <HandPointer className="bottom-20 right-8" />
  </motion.div>
);

// Slide 4: SEO Optimization Phone (like reference image)
const SlideSEOOptimization = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 overflow-hidden">
    <SpeedLines />
    
    {/* Glowing light effect from side */}
    <motion.div
      className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-96 bg-gradient-to-l from-cyan-400/60 via-blue-400/30 to-transparent blur-3xl"
      animate={{
        opacity: [0.5, 1, 0.5],
        x: [0, -20, 0],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />

    <motion.div
      className="relative bg-white rounded-[2.5rem] overflow-hidden shadow-2xl w-72 border-8 border-gray-900"
      initial={{ x: -200, rotate: -20, opacity: 0 }}
      animate={{ x: 0, rotate: -5, opacity: 1 }}
      transition={{ type: "spring", stiffness: 80 }}
    >
      {/* Phone notch */}
      <div className="bg-gray-900 h-8 flex items-center justify-between px-6">
        <span className="text-white text-xs">31:20</span>
        <div className="w-16 h-4 bg-black rounded-full" />
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 bg-white/80 rounded-sm" />
        </div>
      </div>

      {/* App Header */}
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">← Shopify</span>
        </div>
        <span className="font-bold text-lg">Shopify</span>
        <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">Go Vite</span>
      </div>

      {/* Main content */}
      <div className="p-4">
        <p className="text-gray-600 mb-4">Grulotiye:</p>
        
        {/* Big percentage */}
        <motion.div 
          className="text-center mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <span className="text-6xl font-black text-red-500">34%</span>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-2 w-24 bg-red-500 rounded-full" />
            <span className="text-red-500 font-bold">4%</span>
          </div>
        </motion.div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Fldive manen</span>
          <span className="text-gray-400 text-sm">Pragan Sow...</span>
        </div>

        {/* SEO Optimization Title */}
        <motion.h3
          className="text-2xl font-black text-gray-900 mb-4"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Optimisation SEO<br/>Automatique
        </motion.h3>

        {/* Progress items */}
        <div className="space-y-3">
          {[
            { icon: "✓", label: "Erreurs Corrigées", sublabel: "Pormeaetie soht. ubranul", value: "0%", color: "text-blue-500" },
            { icon: "📝", label: "Description", value: "A+ 17%", color: "text-gray-700" },
            { icon: "🔄", label: "Rloumtlexie", value: "36,156%", color: "text-gray-700" },
            { icon: "📊", label: "Der Valison", sublabel: "cheome", value: "66,0lnf %", color: "text-gray-700" },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between py-2 border-b border-gray-100"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ${item.color}`}>
                  {item.icon}
                </span>
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-gray-400">{item.sublabel}</p>}
                </div>
              </div>
              <span className="font-bold text-sm">{item.value}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>

    <HandPointer className="bottom-32 right-16 scale-125" />
  </motion.div>
);

// Slide 5: Before/After like reference
const SlideBeforeAfter = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <GlowBurst />
    
    <motion.h2
      className="text-2xl font-black text-white text-center mb-2 z-10"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      See the Difference
    </motion.h2>
    <motion.h3
      className="text-xl font-bold text-white text-center mb-2 z-10"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      Before & AI NewAI
    </motion.h3>

    <motion.div
      className="bg-blue-500 px-4 py-2 rounded-full mb-4 z-10"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.3, type: "spring" }}
    >
      <span className="text-white font-bold">+68% Impeoricemecn</span>
    </motion.div>

    <div className="flex gap-3 w-full max-w-sm z-10">
      {/* Before Phone */}
      <motion.div
        className="flex-1 bg-white rounded-2xl overflow-hidden shadow-xl"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
      >
        <div className="bg-gray-100 h-5 flex items-center justify-center">
          <span className="text-[8px] text-gray-500">Avant</span>
        </div>
        <img src={sofaWhiteBackground} alt="Before" className="w-full h-32 object-cover" />
        <div className="p-2 text-center">
          <p className="text-xs text-gray-500">Fond blanc</p>
          <p className="text-sm font-bold text-gray-400">799 €</p>
        </div>
      </motion.div>

      {/* After Phone */}
      <motion.div
        className="flex-1 bg-white rounded-2xl overflow-hidden shadow-xl border-2 border-blue-400"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
      >
        <div className="bg-blue-500 h-5 flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">After Vision AI</span>
        </div>
        <motion.img 
          src={sofaWithBackground} 
          alt="After" 
          className="w-full h-32 object-cover"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="p-2 text-center">
          <p className="text-xs text-blue-500 font-semibold">After Vision AI</p>
          <p className="text-lg font-black text-gray-900">1 299 €</p>
          <p className="text-[10px] text-gray-500">Gray velvet 3seater sooth</p>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

// Slide 6: Google Shopping Features
const SlideGoogleShopping = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <FloatingParticles />
    
    <motion.div
      className="mb-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring" }}
    >
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
        <GoogleLogo />
      </div>
    </motion.div>

    <motion.h2
      className="text-2xl font-black text-white text-center mb-6"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Google Shopping<br/><span className="text-yellow-300">Ready</span>
    </motion.h2>

    <div className="space-y-3 w-full max-w-xs">
      {[
        { icon: <Check className="w-5 h-5" />, label: "XML Feed Auto", desc: "Généré automatiquement" },
        { icon: <Target className="w-5 h-5" />, label: "Google Categories", desc: "Mapping intelligent" },
        { icon: <Sparkles className="w-5 h-5" />, label: "GTIN/EAN", desc: "Validation complète" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="bg-white/20 backdrop-blur-md rounded-xl p-4 flex items-center gap-4"
          initial={{ x: i % 2 === 0 ? -100 : 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
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
      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">0 Erreurs</span>
      <span className="bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-bold">100% GMC</span>
    </motion.div>
  </motion.div>
);

// Slide 7: Testimonials & Pricing
const SlideTestimonials = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-white overflow-hidden">
    {/* Blue burst effect at bottom */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-48 bg-gradient-to-t from-blue-600 to-transparent"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.5 }}
    />
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64"
      initial={{ scale: 0 }}
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ delay: 0.7, duration: 1, repeat: Infinity }}
    >
      {/* Light rays */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-0 left-1/2 w-1 h-32 bg-gradient-to-t from-white/80 to-transparent origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.8 + i * 0.05 }}
        />
      ))}
    </motion.div>

    <motion.h2
      className="text-2xl font-bold text-gray-900 mb-4 z-10"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Pricing
    </motion.h2>

    {/* Testimonials */}
    <div className="space-y-3 w-full max-w-xs mb-4 z-10">
      {[
        { name: "Sarah Chan", text: "Our organic traffic increased by 180%", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop" },
        { name: "Marc D.", text: "10 heures économisées par semaine", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-lg"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.2 }}
        >
          <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
          <div>
            <p className="font-bold text-sm">{item.name}</p>
            <p className="text-xs text-gray-600">{item.text}</p>
          </div>
        </motion.div>
      ))}
    </div>

    {/* Price */}
    <motion.div
      className="bg-white rounded-2xl p-4 shadow-xl z-10"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.7, type: "spring" }}
    >
      <span className="text-xs text-blue-600 font-bold">#LIMITED2024</span>
      <div className="flex items-baseline">
        <span className="text-4xl font-black text-gray-900">$49</span>
        <span className="text-gray-500 ml-1">.99</span>
      </div>
      <span className="text-gray-600">monthly</span>
    </motion.div>
  </motion.div>
);

// Slide 8: Final CTA
const SlideCTA = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
    <FloatingParticles />
    <GlowBurst />
    
    {/* Logo */}
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
            "0 0 60px rgba(255,255,255,0.5)",
            "0 0 30px rgba(255,255,255,0.3)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-blue-600 text-5xl font-black">N</span>
      </motion.div>
    </motion.div>

    <motion.h2
      className="text-3xl font-black text-white text-center mb-4"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Commencez<br/>Maintenant
    </motion.h2>

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
            "0 0 20px rgba(255,255,255,0.5)",
            "0 0 40px rgba(255,255,255,0.8)",
            "0 0 20px rgba(255,255,255,0.5)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🚀 Essai Gratuit
      </motion.button>
    </motion.div>

    <motion.p
      className="text-white/80 text-center mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      Sans carte bancaire
    </motion.p>

    {/* Stats */}
    <motion.div
      className="flex gap-6"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.9 }}
    >
      <div className="text-center">
        <p className="text-2xl font-black text-yellow-300">10K+</p>
        <p className="text-white/70 text-xs">Produits</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-black text-green-400">500+</p>
        <p className="text-white/70 text-xs">Vendeurs</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-black text-pink-400">95%</p>
        <p className="text-white/70 text-xs">Satisfaction</p>
      </div>
    </motion.div>
  </motion.div>
);

// All slides
const slides = [SlideIntro, SlideStats, SlideGooglePhones, SlideSEOOptimization, SlideBeforeAfter, SlideGoogleShopping, SlideTestimonials, SlideCTA];
const SLIDE_DURATION = 6000; // 6 seconds per slide

export default function AnimationAds() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, SLIDE_DURATION);
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Play voice narration when slide changes
  useEffect(() => {
    if (isMuted) return;
    
    const playNarration = async () => {
      try {
        setIsLoadingAudio(true);
        
        const { data, error } = await supabase.functions.invoke('robot-tts', {
          body: { text: SLIDE_NARRATIONS[currentSlide] }
        });

        if (error) {
          console.error('TTS error:', error);
          return;
        }

        if (data?.audio) {
          // Stop previous audio
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          // Create and play new audio
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

  const CurrentSlideComponent = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* 9:16 Container */}
      <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
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
          <Button
            size="icon"
            variant="ghost"
            className="w-10 h-10 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-10 h-10 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
        </div>

        {/* Audio loading indicator */}
        {isLoadingAudio && (
          <div className="absolute top-4 left-4 z-30">
            <motion.div
              className="w-3 h-3 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
