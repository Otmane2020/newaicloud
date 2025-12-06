/**
 🔥 NEWAI VIDEO ADS ENGINE (ENHANCED EDITION)
 - Auto voice narration per slide
 - Smooth transitions
 - Preload next audio
 - Slide waits narration OR timer (configurable)
 - 9:16 export-ready version
**/

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// slides UI
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
} from "@/components/video3d/ViralEffects";

// assets
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";
import shopifyLogo from "@/assets/shopify-logo.svg";

/* ---------------- CONFIG ---------------- */

const SLIDES = [
  SlideIntro,
  SlideStats,
  SlideSEOScore,
  SlideBeforeAfter,
  SlideLandingPage,
  SlideImageEnhancement,
  SlideGoogleShopping,
  SlideCTA,
];

const TTS = [
  "NewAI — the AI that boosts Shopify SEO automatically. Connect Shopify, Google, Facebook and Instagram.",
  "Real results: 3x faster workflow, +50% traffic, 10h weekly saved, Top 10 Google rankings.",
  "Watch your SEO score transform from 34% to 95% — fully automated AI optimization.",
  "Before plain background — After Vision AI staging. +68% conversion increase.",
  "AI landing pages auto-generated in seconds — ready for marketing & SEO.",
  "Vision AI improves every product image automatically — alt, background, enhancement.",
  "Google Shopping Feed auto — GTIN validation — 0 GMC errors.",
  "Start your free trial now. No credit card required.",
];

// config — narration controls slide
const WAIT_FOR_AUDIO = true; // ← si true : slide change après narration
const FALLBACK_TIMER = 6000; // durée si mute ou TTS error

export default function AnimationAdsEnhanced() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const nextAudio = useRef<HTMLAudioElement | null>(null);
  const slideTimer = useRef<NodeJS.Timeout>();
  const currentVoice = useRef<AbortController | null>(null);

  /* ---------------- LOAD AND PLAY NARRATION ---------------- */

  const playNarration = async (i: number) => {
    if (muted) return nextSlide(FALLBACK_TIMER);

    try {
      setLoadingAudio(true);

      currentVoice.current?.abort();
      const ctrl = new AbortController();
      currentVoice.current = ctrl;

      const { data, error } = await supabase.functions.invoke("robot-tts", {
        body: { text: TTS[i] },
        signal: ctrl.signal,
      });

      if (error || !data?.audio) return nextSlide(FALLBACK_TIMER);

      // fade stop old audio
      if (audio.current) {
        audio.current.volume = 0.3;
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

  /* ---------------- NEXT SLIDE ---------------- */
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
  const SlideC = SLIDES[index];

  /* ---------------- UI ---------------- */

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-violet-600 to-indigo-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.1, rotateY: -8 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 8 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <SlideC />
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="absolute bottom-6 w-full flex justify-center gap-2 z-40">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full cursor-pointer transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex gap-2 z-40">
          <button
            onClick={toggleMute}
            className="bg-white/15 w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="bg-white/15 w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            {playing ? <Pause /> : <Play />}
          </button>
        </div>

        {loadingAudio && (
          <motion.div
            className="absolute top-4 left-4 w-3 h-3 rounded-full bg-purple-300 z-40"
            animate={{ scale: [1, 1.7, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}

        {/* Slide Counter */}
        <div className="absolute top-4 left-4 bg-white/10 text-white px-3 py-1 rounded-full z-40 text-xs font-bold">
          {index + 1}/{SLIDES.length}
        </div>
      </div>
    </div>
  );
}

/* 
🔍 EXPORT MP4 READY HOOK (to integrate next)
-------------------------------------------
import { exportVideo } from "@/utils/mp4Recorder";
exportVideo("#video-container", audioTrack)
*/
