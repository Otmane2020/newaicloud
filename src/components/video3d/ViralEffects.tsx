import { motion } from "framer-motion";
import { ReactNode } from "react";

/* ===========================================================
   🔥 ULTRA EFFECT PACK FOR VIDEO ADS - NEWAI EDITION
   Use inside your video like:
   <GlitchText>NewAI Boosts Your SEO</GlitchText>
   <CameraShake intensity={8}><img/></CameraShake>
   <FlashEffect trigger={true}/>
   <ZoomPunch delay={0.1}><h1>TRY FREE</h1></ZoomPunch>
===========================================================*/

/* ====================== GLITCH TEXT ====================== */
export const GlitchText = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`relative font-black tracking-wide ${className}`}>
    <motion.span
      animate={{ x: [0, -1, 1, 0], opacity: [1, 0.9, 1] }}
      transition={{ duration: 0.35, repeat: Infinity, repeatDelay: 0.8 }}
    >
      {children}
    </motion.span>
    <motion.span
      className="absolute top-0 left-0 text-red-500 opacity-60"
      style={{ clipPath: "inset(0 0 55% 0)" }}
      animate={{ x: [0, 3, -2, 0], opacity: [0, 0.7, 0] }}
      transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 0.8 }}
    >
      {children}
    </motion.span>
    <motion.span
      className="absolute top-0 left-0 text-cyan-400 opacity-60"
      style={{ clipPath: "inset(45% 0 0 0)" }}
      animate={{ x: [0, -3, 2, 0], opacity: [0, 0.7, 0] }}
      transition={{ duration: 0.25, delay: 0.05, repeat: Infinity, repeatDelay: 0.8 }}
    >
      {children}
    </motion.span>
  </div>
);

/* ===================== CAMERA SHAKE ====================== */
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
            x: [0, -intensity, intensity, -intensity, intensity, 0],
            y: [0, intensity, -intensity, intensity, -intensity, 0],
            rotate: [0, -1, 1, -1, 1, 0],
          }
        : {}
    }
    transition={{ duration: 0.4, ease: "easeInOut", repeat: Infinity }}
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
    transition={{ duration: 0.25 }}
  />
);

/* ====================== ZOOM HIT ========================= */
export const ZoomPunch = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ scale: 0.4, opacity: 0 }}
    animate={{ scale: [0.4, 1.25, 1], opacity: [0, 1, 1] }}
    transition={{ duration: 0.45, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

/* ================= PARTICLE EXPLOSION ==================== */
export const ParticleExplosion = ({
  count = 25,
  trigger = true,
  sizeMin = 4,
  sizeMax = 10,
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
        const velocity = 120 + Math.random() * 200;
        const size = sizeMin + Math.random() * (sizeMax - sizeMin);
        const color = ["#FFD700", "#FF5C5C", "#4ECDC4", "#9B59B6", "#3498DB"][i % 5];
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
              boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(angle) * velocity, y: Math.sin(angle) * velocity, scale: 0, opacity: 0 }}
            transition={{ duration: 0.8 + Math.random() * 0.4, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
};

/* ==================== SPEED LINES FX ===================== */
export const SpeedLines = ({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute bg-gradient-to-${direction === "horizontal" ? "r" : "b"} from-transparent via-white/40 to-transparent`}
          style={
            direction === "horizontal"
              ? {
                  height: 2,
                  width: `${40 + Math.random() * 120}px`,
                  top: `${Math.random() * 100}%`,
                  left: "-150px",
                }
              : {
                  width: 2,
                  height: `${40 + Math.random() * 120}px`,
                  left: `${Math.random() * 100}%`,
                  top: "-150px",
                }
          }
          animate={direction === "horizontal" ? { x: ["0vw", "200vw"] } : { y: ["0vh", "200vh"] }}
          transition={{ duration: 0.3 + Math.random() * 0.2, delay: i * 0.02, repeat: Infinity }}
        />
      ))}
    </div>
  );
};

/* ================= GRADIENT BACKGROUND =================== */
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

/* ===================== NEON GLOW TEXT ==================== */
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
      textShadow: `0 0 8px ${color},0 0 16px ${color},0 0 32px ${color}`,
    }}
    animate={{ opacity: [1, 0.7, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
  >
    {children}
  </motion.span>
);

/* ===================== CTA PULSE ========================= */
export const CTAPulse = ({ children }: { children: ReactNode }) => (
  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
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
    animate={{ y: [-amp, amp, -amp], rotate: [-1, 1, -1] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
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
    animate={{ filter: ["drop-shadow(2px 0 red)", "drop-shadow(-2px 0 cyan)", "none"] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    {children}
  </motion.div>
);

export default {
  GlitchText,
  CameraShake,
  FlashEffect,
  ZoomPunch,
  ParticleExplosion,
  SpeedLines,
  MorphingGradient,
  Rotating3D,
  FloatingElement,
  NeonText,
  CTAPulse,
  ChromaticSplit,
};
