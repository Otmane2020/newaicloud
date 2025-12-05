import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Zap, TrendingUp, ShoppingBag, Globe, 
  BarChart3, Bot, Image, FileText, Share2, 
  CheckCircle2, ArrowRight, Play, Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: 1,
    title: "NewAI",
    subtitle: "E-commerce Intelligence",
    description: "Automatisez votre succès",
    icon: Sparkles,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-500",
    bgPattern: "radial-gradient(circle at 20% 80%, rgba(167, 139, 250, 0.3) 0%, transparent 50%)",
  },
  {
    id: 2,
    title: "SEO Automatique",
    subtitle: "Optimisation IA",
    description: "Titres, descriptions, mots-clés générés en 1 clic",
    icon: TrendingUp,
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    stats: [
      { value: "+300%", label: "Trafic organique" },
      { value: "Top 10", label: "Google Ranking" },
    ],
  },
  {
    id: 3,
    title: "Images IA",
    subtitle: "Génération automatique",
    description: "Backgrounds pro, textes alt, galeries optimisées",
    icon: Image,
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    features: ["White Background", "Custom Scenes", "Bulk Generation"],
  },
  {
    id: 4,
    title: "Blog IA",
    subtitle: "Contenu automatisé",
    description: "Articles SEO générés depuis vos produits",
    icon: FileText,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    stats: [
      { value: "10h+", label: "Économisées/semaine" },
      { value: "∞", label: "Articles possibles" },
    ],
  },
  {
    id: 5,
    title: "Social Media",
    subtitle: "Publication automatique",
    description: "Facebook & Instagram en pilote automatique",
    icon: Share2,
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    platforms: ["facebook", "instagram", "google"],
  },
  {
    id: 6,
    title: "Google Shopping",
    subtitle: "Feed optimisé",
    description: "Synchronisation automatique Merchant Center",
    icon: ShoppingBag,
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    features: ["Feed XML", "Sync Auto", "Catégories Google"],
  },
  {
    id: 7,
    title: "Analytics",
    subtitle: "Dashboard intelligent",
    description: "Suivez vos performances en temps réel",
    icon: BarChart3,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    stats: [
      { value: "50%", label: "Plus de conversions" },
      { value: "3x", label: "ROI moyen" },
    ],
  },
  {
    id: 8,
    title: "Commencez",
    subtitle: "14 jours gratuits",
    description: "Aucune carte requise",
    icon: Zap,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-500",
    cta: true,
  },
];

const FloatingParticle = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full bg-white/30"
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      y: [-20, -100],
      x: [0, Math.random() * 40 - 20],
    }}
    transition={{
      duration: 2,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 2,
    }}
  />
);

const GlowOrb = ({ className }: { className?: string }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const SlideContent = ({ slide, isActive }: { slide: typeof slides[0]; isActive: boolean }) => {
  const Icon = slide.icon;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={slide.id}
          className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon with glow effect */}
          <motion.div
            className="relative mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.2 
            }}
          >
            <div className="absolute inset-0 blur-2xl bg-white/30 rounded-full scale-150" />
            <div className={`relative p-6 rounded-3xl bg-gradient-to-br ${slide.gradient} shadow-2xl`}>
              <Icon className="w-16 h-16" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl font-bold text-center mb-2"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {slide.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl font-medium text-white/80 mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {slide.subtitle}
          </motion.p>

          {/* Description */}
          <motion.p
            className="text-lg text-white/70 text-center max-w-xs mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {slide.description}
          </motion.p>

          {/* Stats */}
          {slide.stats && (
            <motion.div
              className="flex gap-8 mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {slide.stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/60">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Features */}
          {slide.features && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {slide.features.map((feature, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full"
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Platforms */}
          {slide.platforms && (
            <motion.div
              className="flex gap-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {slide.platforms.map((platform, i) => (
                <motion.div
                  key={platform}
                  className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.7 + i * 0.1, type: "spring" }}
                >
                  {platform === "facebook" && (
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  {platform === "instagram" && (
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  )}
                  {platform === "google" && (
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* CTA */}
          {slide.cta && (
            <motion.div
              className="mt-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-full shadow-2xl"
                onClick={() => window.open("https://newai.sale", "_blank")}
              >
                Essayer Gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function AnimationAds() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentGradient = slides[currentSlide].gradient;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* 9:16 Card Container */}
      <div className="relative w-full max-w-[400px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl">
        {/* Animated Background */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${currentGradient}`}
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Glow Orbs */}
        <GlowOrb className="w-64 h-64 bg-white/20 -top-20 -left-20" />
        <GlowOrb className="w-48 h-48 bg-white/20 -bottom-10 -right-10" />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: "10%",
              }}
            >
              <FloatingParticle delay={i * 0.3} />
            </div>
          ))}
        </div>

        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Slide Content */}
        {slides.map((slide, index) => (
          <SlideContent
            key={slide.id}
            slide={slide}
            isActive={currentSlide === index}
          />
        ))}

        {/* Progress Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === index ? "bg-white w-6" : "bg-white/40"
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
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-lg">NewAI</span>
        </motion.div>
      </div>
    </div>
  );
}
