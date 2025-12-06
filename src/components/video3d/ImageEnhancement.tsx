import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";

interface ImageEnhancementProps {
  beforeImage?: string;
  afterImage?: string;
}

export const ImageEnhancement = ({
  beforeImage = sofaWhiteBackground,
  afterImage = sofaWithBackground,
}: ImageEnhancementProps) => {
  const [showAfter, setShowAfter] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Analyzing image...", icon: "🔍" },
    { label: "Detecting product...", icon: "📦" },
    { label: "Removing background...", icon: "✂️" },
    { label: "AI staging environment...", icon: "🏠" },
    { label: "Final enhancement...", icon: "✨" },
  ];

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressTimer);
          setTimeout(() => setShowAfter(true), 200);
          return 100;
        }
        return p + 2;
      });
    }, 50);

    return () => clearInterval(progressTimer);
  }, []);

  useEffect(() => {
    const stepIndex = Math.floor((progress / 100) * steps.length);
    setCurrentStep(Math.min(stepIndex, steps.length - 1));
  }, [progress]);

  return (
    <div className="relative w-full max-w-sm">
      {/* Main image container */}
      <motion.div
        className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-pink-500/30"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Image */}
        <div className="relative h-56">
          <AnimatePresence mode="wait">
            {!showAfter ? (
              <motion.div
                key="before"
                className="absolute inset-0"
                exit={{ opacity: 0, scale: 1.1 }}
              >
                <img 
                  src={beforeImage} 
                  alt="Before" 
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-400/30 via-transparent to-transparent"
                  style={{ height: "4px" }}
                  animate={{
                    top: ["0%", "100%", "0%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Grid overlay */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Processing indicator */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        {steps[currentStep].icon}
                      </motion.span>
                      <span className="text-white text-sm font-semibold">
                        {steps[currentStep].label}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-cyan-400 text-xs">{progress}%</span>
                      <span className="text-gray-400 text-xs">Vision AI</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="after"
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <img 
                  src={afterImage} 
                  alt="After" 
                  className="w-full h-full object-cover"
                />
                
                {/* Success overlay */}
                <motion.div
                  className="absolute inset-0 bg-green-500/20"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                />

                {/* Sparkles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.1,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                  />
                ))}

                {/* Success badge */}
                <motion.div
                  className="absolute top-4 right-4 bg-green-500 px-4 py-2 rounded-full shadow-lg"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <span className="text-white font-bold text-sm">✓ Enhanced</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Features list */}
      <motion.div
        className="mt-4 grid grid-cols-3 gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {[
          { icon: "📝", label: "Alt Text" },
          { icon: "🎨", label: "Background" },
          { icon: "📊", label: "SEO Tags" },
        ].map((feature, i) => (
          <motion.div
            key={i}
            className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1 }}
          >
            <div className="text-lg">{feature.icon}</div>
            <div className="text-white text-xs font-semibold">{feature.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ImageEnhancement;
