import { motion } from "framer-motion";
import { ReactNode } from "react";

// Glitch Text Effect
export const GlitchText = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Main text */}
      <motion.span
        className="relative z-10"
        animate={{
          x: [0, -2, 2, 0],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 0.15,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        {children}
      </motion.span>
      
      {/* Red ghost */}
      <motion.span
        className="absolute top-0 left-0 text-red-500 opacity-70"
        style={{ clipPath: "inset(0 0 50% 0)" }}
        animate={{
          x: [0, 4, -2, 0],
          opacity: [0, 0.7, 0],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        {children}
      </motion.span>
      
      {/* Cyan ghost */}
      <motion.span
        className="absolute top-0 left-0 text-cyan-400 opacity-70"
        style={{ clipPath: "inset(50% 0 0 0)" }}
        animate={{
          x: [0, -4, 2, 0],
          opacity: [0, 0.7, 0],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: 2,
          delay: 0.05,
        }}
      >
        {children}
      </motion.span>
    </div>
  );
};

// Camera Shake Container
export const CameraShake = ({ 
  children, 
  intensity = 5,
  active = true 
}: { 
  children: ReactNode;
  intensity?: number;
  active?: boolean;
}) => {
  return (
    <motion.div
      animate={active ? {
        x: [0, -intensity, intensity, -intensity, intensity, 0],
        y: [0, intensity, -intensity, intensity, -intensity, 0],
        rotate: [0, -1, 1, -1, 1, 0],
      } : {}}
      transition={{
        duration: 0.4,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// White Flash Effect
export const FlashEffect = ({ trigger }: { trigger: boolean }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-white pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: trigger ? [0, 1, 0] : 0 }}
      transition={{ duration: 0.3 }}
    />
  );
};

// Zoom Punch Effect
export const ZoomPunch = ({ 
  children, 
  delay = 0 
}: { 
  children: ReactNode;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ 
        scale: [0.5, 1.3, 1],
        opacity: [0, 1, 1],
      }}
      transition={{
        duration: 0.4,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Particle Explosion
export const ParticleExplosion = ({ 
  particleCount = 20,
  colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6", "#3498DB"],
  trigger = true,
}: {
  particleCount?: number;
  colors?: string[];
  trigger?: boolean;
}) => {
  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(particleCount)].map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 100 + Math.random() * 150;
        const color = colors[i % colors.length];
        const size = 4 + Math.random() * 8;
        
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
              top: "50%",
              left: "50%",
              boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * velocity,
              y: Math.sin(angle) * velocity,
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
};

// Speed Lines (like in anime)
export const SpeedLines = ({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute bg-gradient-to-${direction === "horizontal" ? "r" : "b"} from-transparent via-white/50 to-transparent`}
          style={direction === "horizontal" ? {
            height: 2,
            width: `${50 + Math.random() * 100}px`,
            top: `${Math.random() * 100}%`,
            left: "-100px",
          } : {
            width: 2,
            height: `${50 + Math.random() * 100}px`,
            left: `${Math.random() * 100}%`,
            top: "-100px",
          }}
          animate={direction === "horizontal" ? {
            x: ["0vw", "200vw"],
          } : {
            y: ["0vh", "200vh"],
          }}
          transition={{
            duration: 0.3 + Math.random() * 0.2,
            delay: i * 0.02,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </div>
  );
};

// Morphing Gradient Background
export const MorphingGradient = () => {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        background: [
          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        ],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

// 3D Rotating Container
export const Rotating3D = ({ 
  children,
  rotateX = 15,
  rotateY = 15,
}: { 
  children: ReactNode;
  rotateX?: number;
  rotateY?: number;
}) => {
  return (
    <motion.div
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      animate={{
        rotateX: [-rotateX, rotateX, -rotateX],
        rotateY: [-rotateY, rotateY, -rotateY],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Floating Elements
export const FloatingElement = ({ 
  children,
  delay = 0,
  amplitude = 10,
}: { 
  children: ReactNode;
  delay?: number;
  amplitude?: number;
}) => {
  return (
    <motion.div
      animate={{
        y: [-amplitude, amplitude, -amplitude],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Neon Glow Text
export const NeonText = ({ 
  children, 
  color = "#00ff88",
  className = "" 
}: { 
  children: ReactNode;
  color?: string;
  className?: string;
}) => {
  return (
    <motion.span
      className={className}
      style={{
        textShadow: `
          0 0 5px ${color},
          0 0 10px ${color},
          0 0 20px ${color},
          0 0 40px ${color}
        `,
        color: color,
      }}
      animate={{
        textShadow: [
          `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
          `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}, 0 0 80px ${color}`,
          `0 0 5px ${color}, 0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
      }}
    >
      {children}
    </motion.span>
  );
};

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
};
