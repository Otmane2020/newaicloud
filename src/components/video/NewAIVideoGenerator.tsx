import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VideoExporter } from "@/lib/VideoRenderer";
import { Volume2, VolumeX, Play, Pause, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Import 3D components
import { SEOScoreCircle } from "@/components/video3d/SEOScoreCircle";
import { BeforeAfterSplit } from "@/components/video3d/BeforeAfterSplit";
import { 
  GlitchText, 
  ParticleExplosion, 
  SpeedLines, 
  ZoomPunch,
  FloatingElement,
  NeonText 
} from "@/components/video3d/ViralEffects";

import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";

// ========= ENGLISH NARRATIONS =========
const SLIDE_NARRATIONS = [
  "NewAI — the AI that boosts your Shopify SEO automatically!",
  "3x Faster, 50% More Traffic, Save 10 hours weekly!",
  "Watch your SEO score transform from 34% to 95% — fully automated!",
  "Google Search, Shopping, and Discover — visible everywhere!",
  "Before: plain white. After: Vision AI professional staging. Plus 68% conversions!",
  "Google Shopping XML feed — GTIN validated — zero errors!",
  "AI Blog and Product Pages — HTML SEO Content generated!",
  "Real Growth: From 200 to 10K monthly impressions!",
  "Starter 9.99 — Pro 39 — Enterprise 139 dollars!",
  "Try NewAI FREE today — No Credit Card required!"
];

// ========= SLIDE COMPONENTS =========

// Floating Particles
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full bg-white/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -20, 0],
          opacity: [0.4, 1, 0.4],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </div>
);

// Slide 1: Hero
const SlideHero = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    <ParticleExplosion trigger={true} count={20} />
    
    <motion.div
      className="relative z-10 mb-4"
      initial={{ scale: 0, rotateY: -180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 150 }}
      style={{ perspective: 1000 }}
    >
      <motion.div 
        className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center shadow-2xl"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <span className="text-purple-600 text-5xl font-black">N</span>
      </motion.div>
    </motion.div>

    <ZoomPunch>
      <GlitchText className="text-4xl font-black text-white text-center drop-shadow-lg">
        NewAI
      </GlitchText>
    </ZoomPunch>
    
    <motion.p
      className="text-lg text-white/90 text-center mt-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <NeonText color="#a855f7">AI-Powered SEO</NeonText>
    </motion.p>
  </motion.div>
);

// Slide 2: Stats
const SlideStats = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <SpeedLines />
    
    <ZoomPunch>
      <h2 className="text-xl font-black text-white text-center mb-4">
        <GlitchText>Real Results</GlitchText>
      </h2>
    </ZoomPunch>

    <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
      {[
        { value: "3x", label: "Faster", color: "from-emerald-400 to-teal-500" },
        { value: "+50%", label: "Traffic", color: "from-yellow-400 to-orange-500" },
        { value: "10h+", label: "Saved", color: "from-pink-400 to-rose-500" },
        { value: "Top 10", label: "Google", color: "from-blue-400 to-indigo-500" },
      ].map((stat, i) => (
        <motion.div
          key={i}
          className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 text-center shadow-xl`}
          initial={{ scale: 0, rotateX: 90 }}
          animate={{ scale: 1, rotateX: 0 }}
          transition={{ delay: 0.1 + i * 0.1, type: "spring" }}
        >
          <div className="text-2xl font-black text-white">{stat.value}</div>
          <div className="text-xs text-white/90 font-semibold">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Slide 3: SEO Score
const SlideSEOScore = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-2">
        <GlitchText>SEO Score</GlitchText>
      </h2>
    </ZoomPunch>
    
    <p className="text-sm text-white/80 text-center mb-4">
      <span className="text-red-400">34%</span> → <span className="text-green-400">95%</span>
    </p>

    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 0.85 }}
      transition={{ delay: 0.3, type: "spring" }}
    >
      <SEOScoreCircle startScore={34} endScore={95} duration={2} />
    </motion.div>
  </motion.div>
);

// Slide 4: Google Visibility
const SlideGoogle = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <SpeedLines />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-4">
        Visible on <span className="text-yellow-300">Google</span>
      </h2>
    </ZoomPunch>

    <div className="flex gap-2">
      {["Search", "Shopping", "Discover"].map((item, i) => (
        <FloatingElement key={i} delay={i * 0.1} amp={3}>
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 text-center"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
          >
            <span className="text-white font-bold text-sm">{item}</span>
          </motion.div>
        </FloatingElement>
      ))}
    </div>
  </motion.div>
);

// Slide 5: Before/After
const SlideBeforeAfter = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-3 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <ParticleExplosion trigger={true} count={12} />
    
    <h2 className="text-lg font-black text-white text-center mb-2 z-10">
      <GlitchText>Vision AI</GlitchText>
    </h2>

    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 0.75 }}
      transition={{ type: "spring" }}
    >
      <BeforeAfterSplit 
        beforeImage={sofaWhiteBackground}
        afterImage={sofaWithBackground}
        conversionBoost="+68%"
      />
    </motion.div>
  </motion.div>
);

// Slide 6: Google Shopping Feed
const SlideGoogleFeed = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-4">
        Google Shopping <span className="text-green-400">Ready</span>
      </h2>
    </ZoomPunch>

    <div className="space-y-2 w-full max-w-[280px]">
      {[
        { icon: "✓", label: "XML Feed Auto" },
        { icon: "✓", label: "GTIN Validated" },
        { icon: "✓", label: "0 Errors" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
        >
          <span className="text-green-400 font-bold">{item.icon}</span>
          <span className="text-white font-semibold text-sm">{item.label}</span>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Slide 7: AI Blog
const SlideAIBlog = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <SpeedLines />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-4">
        <GlitchText>AI Content</GlitchText>
      </h2>
    </ZoomPunch>

    <div className="space-y-2 w-full max-w-[280px]">
      {[
        { icon: "📝", label: "Blog Articles" },
        { icon: "🛍️", label: "Product Pages" },
        { icon: "📊", label: "SEO HTML" },
      ].map((item, i) => (
        <motion.div
          key={i}
          className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
        >
          <span className="text-xl">{item.icon}</span>
          <span className="text-white font-semibold text-sm">{item.label}</span>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Slide 8: Growth Graph
const SlideGrowth = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-4">
        Real <span className="text-green-400">Growth</span>
      </h2>
    </ZoomPunch>

    <div className="relative w-full max-w-[280px] h-32">
      <svg viewBox="0 0 300 100" className="w-full h-full">
        <motion.path
          d="M 0 90 Q 50 85 100 70 Q 150 50 200 30 Q 250 15 300 5"
          stroke="url(#growthGrad)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        <defs>
          <linearGradient id="growthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      
      <motion.div
        className="absolute bottom-0 left-0 text-white/70 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        200
      </motion.div>
      <motion.div
        className="absolute top-0 right-0 text-green-400 font-bold"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, type: "spring" }}
      >
        10K+
      </motion.div>
    </div>
    
    <p className="text-white/80 text-sm mt-2">Monthly Impressions</p>
  </motion.div>
);

// Slide 9: Pricing
const SlidePricing = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <SpeedLines />
    
    <ZoomPunch>
      <h2 className="text-lg font-black text-white text-center mb-4">
        <GlitchText>Pricing</GlitchText>
      </h2>
    </ZoomPunch>

    <div className="flex gap-2 w-full max-w-[300px]">
      {[
        { name: "Starter", price: "$9.99", color: "from-gray-400 to-gray-500" },
        { name: "Pro", price: "$39", color: "from-purple-400 to-purple-600", featured: true },
        { name: "Business", price: "$139", color: "from-yellow-400 to-orange-500" },
      ].map((plan, i) => (
        <motion.div
          key={i}
          className={`flex-1 bg-gradient-to-br ${plan.color} rounded-xl p-3 text-center ${plan.featured ? 'scale-110 z-10 shadow-2xl' : ''}`}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
        >
          <div className="text-xs text-white/90 font-semibold">{plan.name}</div>
          <div className="text-lg font-black text-white">{plan.price}</div>
          <div className="text-[10px] text-white/70">/month</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Slide 10: CTA
const SlideCTA = () => (
  <motion.div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900">
    <FloatingParticles />
    <ParticleExplosion trigger={true} count={25} />
    
    <motion.div
      className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-2xl mb-4"
      initial={{ scale: 0 }}
      animate={{ 
        scale: 1,
        boxShadow: [
          "0 0 20px rgba(168,85,247,0.5)",
          "0 0 50px rgba(168,85,247,0.9)",
          "0 0 20px rgba(168,85,247,0.5)",
        ]
      }}
      transition={{ 
        scale: { type: "spring" },
        boxShadow: { duration: 1.5, repeat: Infinity }
      }}
    >
      <span className="text-purple-600 text-4xl font-black">N</span>
    </motion.div>

    <ZoomPunch>
      <GlitchText className="text-2xl font-black text-white text-center mb-4">
        Try FREE Today
      </GlitchText>
    </ZoomPunch>

    <motion.button
      className="bg-white text-purple-600 font-black text-lg px-6 py-3 rounded-xl shadow-xl"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      whileHover={{ scale: 1.05 }}
    >
      🚀 Start Free
    </motion.button>
    
    <motion.p
      className="text-white/80 text-sm mt-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      No credit card required
    </motion.p>
  </motion.div>
);

// All slides
const SLIDES = [
  { component: SlideHero, text: SLIDE_NARRATIONS[0] },
  { component: SlideStats, text: SLIDE_NARRATIONS[1] },
  { component: SlideSEOScore, text: SLIDE_NARRATIONS[2] },
  { component: SlideGoogle, text: SLIDE_NARRATIONS[3] },
  { component: SlideBeforeAfter, text: SLIDE_NARRATIONS[4] },
  { component: SlideGoogleFeed, text: SLIDE_NARRATIONS[5] },
  { component: SlideAIBlog, text: SLIDE_NARRATIONS[6] },
  { component: SlideGrowth, text: SLIDE_NARRATIONS[7] },
  { component: SlidePricing, text: SLIDE_NARRATIONS[8] },
  { component: SlideCTA, text: SLIDE_NARRATIONS[9] },
];

// TTS via Edge Function
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

  const CurrentSlideComponent = SLIDES[currentSlide].component;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div
        id="video-capture"
        className="relative w-[400px] aspect-[9/16] rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.1, rotateY: -10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            transition={{ duration: 0.4 }}
            style={{ perspective: 1000 }}
          >
            <CurrentSlideComponent />
          </motion.div>
        </AnimatePresence>

        {/* Slide indicator */}
        <div className="absolute top-4 left-4 flex gap-1 z-20">
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
        <div className="absolute top-4 right-4 flex gap-2 z-20">
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
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
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
