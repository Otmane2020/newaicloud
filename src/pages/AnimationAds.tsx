import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, ArrowRight, Check, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import real assets
import sofaProduct from "@/assets/sofa-product.jpg";
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";
import shopifyLogo from "@/assets/shopify-logo.svg";

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

// Floating Particle
const FloatingParticle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
    initial={{ opacity: 0, y: 0 }}
    animate={{
      opacity: [0, 1, 0],
      y: [-20, -80],
      x: [0, Math.random() * 30 - 15],
    }}
    transition={{
      duration: 2.5,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 2,
    }}
  />
);

// Glow Orb
const GlowOrb = ({ className }: { className?: string }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      scale: [1, 1.3, 1],
      opacity: [0.2, 0.4, 0.2],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Slide 1: Intro NewAI
const SlideIntro = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    {/* NewAI Logo */}
    <motion.div
      className="relative mb-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >
      <div className="absolute inset-0 blur-3xl bg-purple-500/50 rounded-full scale-150" />
      <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-2xl">
        <span className="text-white text-4xl font-black">N</span>
      </div>
    </motion.div>

    <motion.h1
      className="text-4xl font-black text-white text-center mb-2"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      NewAI
    </motion.h1>

    <motion.p
      className="text-lg text-white/80 text-center mb-8"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      AI-Powered E-commerce
    </motion.p>

    {/* Integration Logos */}
    <motion.div
      className="flex items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {[
        { logo: <img src={shopifyLogo} alt="Shopify" className="w-8 h-8" />, delay: 0.7 },
        { logo: <GoogleLogo />, delay: 0.8 },
        { logo: <FacebookLogo />, delay: 0.9 },
        { logo: <InstagramLogo />, delay: 1 },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: item.delay, type: "spring", stiffness: 200 }}
        >
          {item.logo}
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

// Slide 2: Stats
const SlideStats = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    <motion.h2
      className="text-2xl font-bold text-white text-center mb-8"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Résultats Garantis
    </motion.h2>

    <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
      {[
        { value: 3, suffix: "x", label: "Plus rapide", color: "from-emerald-400 to-teal-500" },
        { value: 50, suffix: "%", label: "Plus de trafic", color: "from-blue-400 to-indigo-500" },
        { value: 10, suffix: "h+", label: "Économisées", color: "from-orange-400 to-amber-500" },
        { value: 10, prefix: "Top ", label: "Google", color: "from-pink-400 to-rose-500" },
      ].map((stat, i) => (
        <motion.div
          key={i}
          className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-center`}
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 200 }}
        >
          <div className="text-3xl font-black text-white">
            <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
          </div>
          <div className="text-sm text-white/80 font-medium">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Slide 3: Google Phone Mockups
const SlideGooglePhones = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4">
    <motion.h2
      className="text-xl font-bold text-white text-center mb-4"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Visible partout sur <span className="text-yellow-300">Google</span>
    </motion.h2>

    <div className="relative flex items-end justify-center gap-2">
      {/* Left Phone - Search */}
      <motion.div
        className="w-24 bg-white rounded-xl overflow-hidden shadow-xl"
        initial={{ x: -100, opacity: 0, rotate: -15 }}
        animate={{ x: 0, opacity: 1, rotate: -6 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        <div className="bg-gray-100 h-4 flex items-center justify-center">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1 mb-2">
            <GoogleLogo />
            <span className="text-[6px] text-gray-500 truncate">canapé velours</span>
          </div>
          <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=120&fit=crop" alt="Search" className="w-full h-16 object-cover rounded-md mb-1" />
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-2 h-2 fill-yellow-400 text-yellow-400" />)}
          </div>
          <p className="text-[7px] font-bold text-green-600">€899</p>
        </div>
        <p className="text-[8px] text-center py-1 text-gray-600 font-medium">Search</p>
      </motion.div>

      {/* Center Phone - Shopping */}
      <motion.div
        className="w-32 bg-white rounded-xl overflow-hidden shadow-2xl z-10"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <div className="bg-gray-100 h-5 flex items-center justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center gap-1 bg-blue-50 rounded-full px-2 py-0.5">
              <GoogleLogo />
              <span className="text-[8px] font-medium text-blue-600">Shopping</span>
            </div>
          </div>
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=140&fit=crop" alt="Shopping" className="w-full h-20 object-cover rounded-md mb-2" />
          <p className="text-[9px] font-medium">Nike Air Max 90</p>
          <p className="text-[10px] font-bold text-green-600">€149,99</p>
          <div className="flex items-center gap-0.5 mt-1">
            {[1,2,3,4].map(i => <Star key={i} className="w-2 h-2 fill-yellow-400 text-yellow-400" />)}
            <Star className="w-2 h-2 text-gray-300" />
            <span className="text-[6px] text-gray-500">(2.3k)</span>
          </div>
        </div>
        <p className="text-[9px] text-center py-1 text-blue-600 font-semibold bg-blue-50">Google Shopping</p>
      </motion.div>

      {/* Right Phone - Discover */}
      <motion.div
        className="w-24 bg-white rounded-xl overflow-hidden shadow-xl"
        initial={{ x: 100, opacity: 0, rotate: 15 }}
        animate={{ x: 0, opacity: 1, rotate: 6 }}
        transition={{ delay: 0.7, type: "spring" }}
      >
        <div className="bg-gray-100 h-4 flex items-center justify-center">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1 mb-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-[6px] text-white font-bold">D</span>
            </div>
            <span className="text-[7px] font-medium">Discover</span>
          </div>
          <img src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200&h=100&fit=crop" alt="Discover" className="w-full h-14 object-cover rounded-md mb-1" />
          <p className="text-[6px] font-medium line-clamp-2">Montres luxe tendance 2024</p>
        </div>
        <p className="text-[8px] text-center py-1 text-gray-600 font-medium">Discover</p>
      </motion.div>
    </div>
  </motion.div>
);

// Slide 4: Traffic Growth
const SlideTrafficGrowth = () => {
  const dataPoints = [
    { x: 0, y: 200 },
    { x: 1, y: 350 },
    { x: 2, y: 800 },
    { x: 3, y: 2500 },
    { x: 4, y: 5000 },
    { x: 5, y: 10000 },
  ];

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
      <motion.div
        className="flex items-center gap-2 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <GoogleLogo />
        <span className="text-white font-bold">Search Console</span>
      </motion.div>

      {/* Chart */}
      <motion.div
        className="w-full max-w-xs bg-white/10 backdrop-blur-md rounded-2xl p-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <svg viewBox="0 0 300 150" className="w-full h-32">
          {/* Grid lines */}
          {[0, 1, 2, 3].map(i => (
            <line key={i} x1="30" y1={30 + i * 30} x2="280" y2={30 + i * 30} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          ))}
          
          {/* Animated path */}
          <motion.path
            d={`M ${dataPoints.map((p, i) => `${30 + i * 50},${130 - (p.y / 10000) * 100}`).join(' L ')}`}
            fill="none"
            stroke="url(#chartGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
          
          {/* Area fill */}
          <motion.path
            d={`M 30,130 ${dataPoints.map((p, i) => `L ${30 + i * 50},${130 - (p.y / 10000) * 100}`).join(' ')} L 280,130 Z`}
            fill="url(#areaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1, delay: 1 }}
          />
          
          {/* Data points */}
          {dataPoints.map((p, i) => (
            <motion.circle
              key={i}
              cx={30 + i * 50}
              cy={130 - (p.y / 10000) * 100}
              r="5"
              fill="white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            />
          ))}
          
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="flex justify-between text-white/60 text-xs mt-2">
          <span>Avant</span>
          <span>6 mois</span>
        </div>
      </motion.div>

      <motion.div
        className="flex items-center gap-6 mt-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <div className="text-center">
          <p className="text-white/60 text-sm">Avant</p>
          <p className="text-2xl font-bold text-white">200</p>
        </div>
        <ArrowRight className="w-6 h-6 text-green-400" />
        <div className="text-center">
          <p className="text-green-400 text-sm">Après</p>
          <p className="text-2xl font-bold text-green-400">10K+</p>
        </div>
      </motion.div>

      <motion.div
        className="mt-4 bg-green-500/20 px-4 py-2 rounded-full"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: "spring" }}
      >
        <span className="text-green-400 font-bold text-lg">+4900%</span>
      </motion.div>
    </motion.div>
  );
};

// Slide 5: Before/After
const SlideBeforeAfter = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    <motion.h2
      className="text-xl font-bold text-white text-center mb-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Transformation <span className="text-purple-300">IA</span>
    </motion.h2>

    <div className="relative w-full max-w-xs">
      {/* Before */}
      <motion.div
        className="relative rounded-xl overflow-hidden shadow-xl mb-4"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <img src={sofaWhiteBackground} alt="Avant" className="w-full h-32 object-cover" />
        <div className="absolute top-2 left-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded">
          AVANT
        </div>
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          Fond blanc basique
        </div>
      </motion.div>

      {/* Arrow */}
      <motion.div
        className="flex justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
      >
        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
      </motion.div>

      {/* After */}
      <motion.div
        className="relative rounded-xl overflow-hidden shadow-xl"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <img src={sofaWithBackground} alt="Après" className="w-full h-32 object-cover" />
        <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded">
          APRÈS
        </div>
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Zap className="w-3 h-3" /> Généré par IA
        </div>
        
        {/* Sparkle effects */}
        <motion.div
          className="absolute top-4 right-4"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
        </motion.div>
      </motion.div>
    </div>
  </motion.div>
);

// Slide 6: Google Shopping Features
const SlideGoogleShopping = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    <motion.div
      className="mb-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-green-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl">
        <GoogleLogo />
      </div>
    </motion.div>

    <motion.h2
      className="text-2xl font-bold text-white text-center mb-6"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Google Shopping Ready
    </motion.h2>

    <div className="space-y-3 w-full max-w-xs">
      {[
        { icon: "📦", text: "Feed XML automatique", color: "from-blue-500 to-cyan-500" },
        { icon: "🏷️", text: "Catégories Google", color: "from-green-500 to-emerald-500" },
        { icon: "✓", text: "GTIN/EAN validés", color: "from-amber-500 to-orange-500" },
      ].map((feature, i) => (
        <motion.div
          key={i}
          className={`flex items-center gap-3 bg-gradient-to-r ${feature.color} rounded-xl p-3`}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.15 }}
        >
          <span className="text-2xl">{feature.icon}</span>
          <span className="text-white font-medium">{feature.text}</span>
          <Check className="w-5 h-5 text-white ml-auto" />
        </motion.div>
      ))}
    </div>

    <motion.div
      className="flex gap-3 mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
        <span className="text-white text-sm font-bold">100% GMC</span>
      </div>
      <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
        <span className="text-white text-sm font-bold">0 Erreurs</span>
      </div>
    </motion.div>
  </motion.div>
);

// Slide 7: Features Grid
const SlideFeatures = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    <motion.h2
      className="text-xl font-bold text-white text-center mb-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      Tout-en-un
    </motion.h2>

    <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
      {[
        { emoji: "🚀", label: "SEO Auto", color: "from-purple-500 to-indigo-600" },
        { emoji: "🖼️", label: "Images IA", color: "from-pink-500 to-rose-600" },
        { emoji: "📝", label: "Blog IA", color: "from-blue-500 to-cyan-600" },
        { emoji: "📊", label: "Analytics", color: "from-green-500 to-emerald-600" },
        { emoji: "📱", label: "Social", color: "from-orange-500 to-amber-600" },
        { emoji: "🏪", label: "Shopping", color: "from-teal-500 to-cyan-600" },
      ].map((feature, i) => (
        <motion.div
          key={i}
          className={`bg-gradient-to-br ${feature.color} rounded-2xl p-3 flex flex-col items-center justify-center aspect-square`}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
        >
          <span className="text-3xl mb-1">{feature.emoji}</span>
          <span className="text-white text-xs font-medium text-center">{feature.label}</span>
        </motion.div>
      ))}
    </div>

    <motion.p
      className="text-white/70 text-center mt-6 text-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      Une seule plateforme pour tout gérer
    </motion.p>
  </motion.div>
);

// Slide 8: CTA Final
const SlideCTA = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6">
    <motion.div
      className="mb-6"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-purple-500/50 scale-150" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-2xl">
          <span className="text-white text-3xl font-black">N</span>
        </div>
      </div>
    </motion.div>

    <motion.h2
      className="text-3xl font-black text-white text-center mb-2"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      Commencez Maintenant
    </motion.h2>

    <motion.p
      className="text-white/80 text-center mb-8"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      14 jours gratuits • Sans engagement
    </motion.p>

    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <Button
        size="lg"
        className="bg-white text-purple-600 hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-2xl group"
        onClick={() => window.open("https://newai.sale", "_blank")}
      >
        Essai Gratuit
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
    </motion.div>

    <motion.div
      className="flex items-center gap-2 mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <Check className="w-4 h-4 text-green-400" />
      <span className="text-white/70 text-sm">Aucune carte requise</span>
    </motion.div>

    <motion.div
      className="flex items-center gap-4 mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(i => (
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <span className="text-white/60 text-sm">500+ vendeurs satisfaits</span>
    </motion.div>
  </motion.div>
);

// Main Component
const slides = [
  { id: 1, component: SlideIntro, gradient: "from-violet-600 via-purple-600 to-fuchsia-500" },
  { id: 2, component: SlideStats, gradient: "from-slate-800 via-slate-900 to-black" },
  { id: 3, component: SlideGooglePhones, gradient: "from-blue-600 via-indigo-600 to-violet-600" },
  { id: 4, component: SlideTrafficGrowth, gradient: "from-emerald-600 via-teal-600 to-cyan-600" },
  { id: 5, component: SlideBeforeAfter, gradient: "from-purple-700 via-violet-700 to-indigo-700" },
  { id: 6, component: SlideGoogleShopping, gradient: "from-blue-500 via-green-500 to-yellow-500" },
  { id: 7, component: SlideFeatures, gradient: "from-slate-900 via-purple-900 to-slate-900" },
  { id: 8, component: SlideCTA, gradient: "from-violet-600 via-purple-600 to-fuchsia-500" },
];

export default function AnimationAds() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* 9:16 Card Container */}
      <div className="relative w-full max-w-[400px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl">
        {/* Animated Background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].gradient}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        </AnimatePresence>

        {/* Glow Orbs */}
        <GlowOrb className="w-64 h-64 bg-white/20 -top-20 -left-20" />
        <GlowOrb className="w-48 h-48 bg-white/20 -bottom-10 -right-10" />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: "10%",
              }}
            >
              <FloatingParticle delay={i * 0.4} />
            </div>
          ))}
        </div>

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />

        {/* Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              className={`h-2 rounded-full transition-all ${
                currentSlide === index ? "bg-white w-6" : "bg-white/40 w-2"
              }`}
              onClick={() => setCurrentSlide(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Play/Pause Button */}
        <motion.button
          className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-sm rounded-full"
          onClick={() => setIsPlaying(!isPlaying)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </motion.button>

        {/* Logo */}
        <motion.div
          className="absolute top-6 left-6 flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-black text-lg">N</span>
          </div>
          <span className="text-white font-bold">NewAI</span>
        </motion.div>
      </div>
    </div>
  );
}
