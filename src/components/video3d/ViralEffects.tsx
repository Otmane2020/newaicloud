import { motion } from "framer-motion";
import { ReactNode } from "react";

/* ===========================================================
   🔥 ULTRA VIRAL TIKTOK EFFECTS PACK - NEWAI EDITION
   Use inside your video like:
   <GlitchText>NewAI Boosts Your SEO</GlitchText>
   <RGBSplit><img/></RGBSplit>
   <VHSEffect><content/></VHSEffect>
===========================================================*/

/* ====================== GLITCH TEXT ====================== */
export const GlitchText = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`relative font-black tracking-wide ${className}`}>
    <motion.span
      animate={{ x: [0, -2, 3, -1, 0], opacity: [1, 0.8, 1] }}
      transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 1.5 }}
    >
      {children}
    </motion.span>
    <motion.span
      className="absolute top-0 left-0 text-red-500 opacity-70"
      style={{ clipPath: "inset(0 0 60% 0)" }}
      animate={{ x: [0, 5, -3, 0], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 1.5 }}
    >
      {children}
    </motion.span>
    <motion.span
      className="absolute top-0 left-0 text-cyan-400 opacity-70"
      style={{ clipPath: "inset(40% 0 0 0)" }}
      animate={{ x: [0, -5, 3, 0], opacity: [0, 0.8, 0] }}
      transition={{ duration: 0.1, delay: 0.02, repeat: Infinity, repeatDelay: 1.5 }}
    >
      {children}
    </motion.span>
  </div>
);

/* ===================== RGB SPLIT / CHROMATIC ABERRATION ===================== */
export const RGBSplit = ({ children, intensity = 4 }: { children: ReactNode; intensity?: number }) => (
  <motion.div
    className="relative"
    animate={{
      filter: [
        `drop-shadow(${intensity}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${intensity}px 0 0 rgba(0,255,255,0.5))`,
        `drop-shadow(-${intensity}px 0 0 rgba(255,0,0,0.5)) drop-shadow(${intensity}px 0 0 rgba(0,255,255,0.5))`,
        `drop-shadow(0 0 0 transparent)`,
      ],
    }}
    transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 2 }}
  >
    {children}
  </motion.div>
);

/* ===================== VHS / RETRO EFFECT ===================== */
export const VHSEffect = ({ children }: { children: ReactNode }) => (
  <div className="relative overflow-hidden">
    {children}
    {/* Scan lines */}
    <div 
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      }}
    />
    {/* VHS tracking distortion */}
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        background: 'linear-gradient(transparent 90%, rgba(255,255,255,0.1) 90%, transparent 100%)',
        height: '200%',
      }}
      animate={{ y: ['-50%', '0%'] }}
      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

/* ===================== TIKTOK TEXT POP ===================== */
export const TextPop = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ scale: 0, rotate: -15, opacity: 0 }}
    animate={{ 
      scale: [0, 1.4, 0.9, 1.1, 1], 
      rotate: [-15, 5, -3, 0],
      opacity: 1 
    }}
    transition={{ 
      duration: 0.5, 
      delay,
      times: [0, 0.4, 0.6, 0.8, 1],
      ease: "easeOut" 
    }}
  >
    {children}
  </motion.div>
);

/* ===================== SHAKE INTENSITY ===================== */
export const CameraShake = ({
  children,
  intensity = 6,
  active = true,
}: {
  children: ReactNode;
  intensity?: number;
  active?: boolean;
}) => (
  <motion.div
    animate={
      active
        ? {
            x: [0, -intensity, intensity, -intensity * 0.5, intensity * 0.5, 0],
            y: [0, intensity * 0.5, -intensity, intensity, -intensity * 0.5, 0],
            rotate: [0, -2, 2, -1, 1, 0],
          }
        : {}
    }
    transition={{ duration: 0.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
  >
    {children}
  </motion.div>
);

/* ===================== BEAT SYNC PULSE ===================== */
export const BeatPulse = ({ children, bpm = 120 }: { children: ReactNode; bpm?: number }) => {
  const duration = 60 / bpm;
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.08, 1],
        filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
      }}
      transition={{ 
        duration, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      {children}
    </motion.div>
  );
};

/* ===================== ZOOM BURST ===================== */
export const ZoomBurst = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ scale: 3, opacity: 0, filter: 'blur(20px)' }}
    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
    transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
  >
    {children}
  </motion.div>
);

/* ===================== WHITE FLASH ====================== */
export const FlashEffect = ({ trigger = false }: { trigger: boolean }) => (
  <motion.div
    className="fixed inset-0 bg-white pointer-events-none z-[999]"
    initial={{ opacity: 0 }}
    animate={{ opacity: trigger ? [0, 1, 0] : 0 }}
    transition={{ duration: 0.15 }}
  />
);

/* ====================== ZOOM HIT ========================= */
export const ZoomPunch = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ scale: 0.3, opacity: 0 }}
    animate={{ scale: [0.3, 1.3, 0.95, 1.05, 1], opacity: [0, 1, 1, 1, 1] }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

/* ================= PARTICLE EXPLOSION ==================== */
export const ParticleExplosion = ({
  count = 35,
  trigger = true,
  sizeMin = 4,
  sizeMax = 14,
}: {
  count?: number;
  trigger?: boolean;
  sizeMin?: number;
  sizeMax?: number;
}) => {
  if (!trigger) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const velocity = 150 + Math.random() * 250;
        const size = sizeMin + Math.random() * (sizeMax - sizeMin);
        const colors = ["#FFD700", "#FF5C5C", "#4ECDC4", "#9B59B6", "#3498DB", "#FF69B4", "#00FF88"];
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: color,
              top: "50%",
              left: "50%",
              boxShadow: `0 0 ${size * 3}px ${color}`,
            }}
            initial={{ x: 0, y: 0, scale: 1.5, opacity: 1 }}
            animate={{ 
              x: Math.cos(angle) * velocity, 
              y: Math.sin(angle) * velocity, 
              scale: 0, 
              opacity: 0,
              rotate: Math.random() * 360
            }}
            transition={{ duration: 0.6 + Math.random() * 0.3, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
};

/* ==================== SPEED LINES FX ===================== */
export const SpeedLines = ({ direction = "horizontal", color = "white" }: { direction?: "horizontal" | "vertical"; color?: string }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute`}
          style={{
            background: `linear-gradient(${direction === 'horizontal' ? '90deg' : '180deg'}, transparent, ${color}40, transparent)`,
            ...(direction === "horizontal"
              ? {
                  height: 2 + Math.random() * 2,
                  width: `${60 + Math.random() * 150}px`,
                  top: `${Math.random() * 100}%`,
                  left: "-200px",
                }
              : {
                  width: 2 + Math.random() * 2,
                  height: `${60 + Math.random() * 150}px`,
                  left: `${Math.random() * 100}%`,
                  top: "-200px",
                })
          }}
          animate={direction === "horizontal" ? { x: ["0vw", "250vw"] } : { y: ["0vh", "250vh"] }}
          transition={{ duration: 0.25 + Math.random() * 0.15, delay: i * 0.015, repeat: Infinity }}
        />
      ))}
    </div>
  );
};

/* ==================== SWIPE TRANSITION ===================== */
export const SwipeIn = ({ children, direction = "left", delay = 0 }: { children: ReactNode; direction?: "left" | "right" | "up" | "down"; delay?: number }) => {
  const variants = {
    left: { x: '-100%', opacity: 0 },
    right: { x: '100%', opacity: 0 },
    up: { y: '-100%', opacity: 0 },
    down: { y: '100%', opacity: 0 },
  };
  return (
    <motion.div
      initial={variants[direction]}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 1, 0.5, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ==================== BOUNCE DROP ===================== */
export const BounceDrop = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ y: -100, opacity: 0, scale: 0.5 }}
    animate={{ 
      y: [null, 20, -10, 5, 0], 
      opacity: 1, 
      scale: [0.5, 1.1, 0.95, 1.02, 1] 
    }}
    transition={{ 
      duration: 0.6, 
      delay,
      times: [0, 0.5, 0.7, 0.85, 1],
      ease: "easeOut" 
    }}
  >
    {children}
  </motion.div>
);

/* ==================== NEON GLOW PULSE ===================== */
export const NeonText = ({
  children,
  color = "#00ff88",
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) => (
  <motion.span
    className={className}
    style={{
      color,
      textShadow: `0 0 10px ${color},0 0 20px ${color},0 0 40px ${color},0 0 80px ${color}`,
    }}
    animate={{ 
      textShadow: [
        `0 0 10px ${color},0 0 20px ${color},0 0 40px ${color},0 0 80px ${color}`,
        `0 0 5px ${color},0 0 10px ${color},0 0 20px ${color},0 0 40px ${color}`,
        `0 0 10px ${color},0 0 20px ${color},0 0 40px ${color},0 0 80px ${color}`,
      ]
    }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    {children}
  </motion.span>
);

/* ===================== CTA PULSE ========================= */
export const CTAPulse = ({ children }: { children: ReactNode }) => (
  <motion.div 
    animate={{ 
      scale: [1, 1.12, 1],
      boxShadow: [
        '0 0 0 0 rgba(59,130,246,0.5)',
        '0 0 0 20px rgba(59,130,246,0)',
        '0 0 0 0 rgba(59,130,246,0)',
      ]
    }} 
    transition={{ repeat: Infinity, duration: 1 }}
  >
    {children}
  </motion.div>
);

/* ===================== SLOW FLOAT ======================== */
export const FloatingElement = ({
  children,
  delay = 0,
  amp = 12,
}: {
  children: ReactNode;
  delay?: number;
  amp?: number;
}) => (
  <motion.div
    animate={{ y: [-amp, amp, -amp], rotate: [-2, 2, -2] }}
    transition={{ duration: 2.5, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

/* =================== ROTATING 3D ===================== */
export const Rotating3D = ({
  children,
  duration = 8,
}: {
  children: ReactNode;
  duration?: number;
}) => (
  <motion.div
    animate={{ rotateY: [0, 360] }}
    transition={{ duration, repeat: Infinity, ease: "linear" }}
    style={{ transformStyle: "preserve-3d" }}
  >
    {children}
  </motion.div>
);

/* =================== CHROMATIC SPLIT ===================== */
export const ChromaticSplit = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ filter: "none" }}
    animate={{ filter: ["drop-shadow(3px 0 red)", "drop-shadow(-3px 0 cyan)", "none"] }}
    transition={{ duration: 0.8, repeat: Infinity }}
  >
    {children}
  </motion.div>
);

/* =================== TYPEWRITER TEXT ===================== */
export const TypewriterText = ({ text, speed = 50 }: { text: string; speed?: number }) => (
  <motion.span>
    {text.split('').map((char, i) => (
      <motion.span
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * (speed / 1000) }}
      >
        {char}
      </motion.span>
    ))}
  </motion.span>
);

/* =================== EMOJI RAIN ===================== */
export const EmojiRain = ({ emojis = ['🔥', '💯', '✨', '🚀'], count = 20 }: { emojis?: string[]; count?: number }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-2xl"
        style={{ left: `${Math.random() * 100}%`, top: -50 }}
        animate={{ y: ['0vh', '120vh'], rotate: [0, 360] }}
        transition={{ 
          duration: 2 + Math.random() * 2, 
          delay: Math.random() * 2,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        {emojis[Math.floor(Math.random() * emojis.length)]}
      </motion.div>
    ))}
  </div>
);

/* =================== FIRE BORDER ===================== */
export const FireBorder = ({ children }: { children: ReactNode }) => (
  <div className="relative">
    <motion.div
      className="absolute -inset-1 rounded-lg opacity-75"
      style={{
        background: 'linear-gradient(45deg, #ff6b6b, #feca57, #ff6b6b, #feca57)',
        backgroundSize: '400% 400%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <div className="relative">{children}</div>
  </div>
);

/* =================== MORPHING GRADIENT ===================== */
export const MorphingGradient = () => (
  <motion.div
    className="absolute inset-0 -z-20"
    animate={{
      background: [
        "linear-gradient(140deg,#667eea,#764ba2)",
        "linear-gradient(140deg,#f093fb,#f5576c)",
        "linear-gradient(140deg,#4facfe,#00f2fe)",
        "linear-gradient(140deg,#667eea,#764ba2)",
      ],
    }}
    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
  />
);

export default {
  GlitchText,
  RGBSplit,
  VHSEffect,
  TextPop,
  CameraShake,
  BeatPulse,
  ZoomBurst,
  FlashEffect,
  ZoomPunch,
  ParticleExplosion,
  SpeedLines,
  SwipeIn,
  BounceDrop,
  NeonText,
  CTAPulse,
  FloatingElement,
  Rotating3D,
  ChromaticSplit,
  TypewriterText,
  EmojiRain,
  FireBorder,
  MorphingGradient,
};
