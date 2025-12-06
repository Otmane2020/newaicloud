import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SEOScoreCircleProps {
  startScore?: number;
  endScore?: number;
  duration?: number;
}

export const SEOScoreCircle = ({ 
  startScore = 34, 
  endScore = 95, 
  duration = 2 
}: SEOScoreCircleProps) => {
  const [score, setScore] = useState(startScore);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsAnimating(true);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    
    const steps = 60;
    const increment = (endScore - startScore) / steps;
    let current = startScore;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= endScore) {
        setScore(endScore);
        clearInterval(timer);
      } else {
        setScore(Math.floor(current));
      }
    }, (duration * 1000) / steps);
    
    return () => clearInterval(timer);
  }, [isAnimating, startScore, endScore, duration]);

  const circumference = 2 * Math.PI * 90;
  const progress = (score / 100) * circumference;
  const isLow = score < 50;
  const isMedium = score >= 50 && score < 80;

  const getColor = () => {
    if (isLow) return "#ef4444"; // red
    if (isMedium) return "#f59e0b"; // amber
    return "#22c55e"; // green
  };

  return (
    <div className="relative">
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ backgroundColor: getColor() }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Main circle */}
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="12"
            fill="none"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            stroke={getColor()}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 0.1 }}
            style={{
              filter: `drop-shadow(0 0 10px ${getColor()})`,
            }}
          />
        </svg>
        
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-black text-white drop-shadow-lg"
            animate={{ scale: isAnimating && score === endScore ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            {score}%
          </motion.span>
          <span className="text-white/70 text-sm font-semibold">SEO Score</span>
        </div>
      </div>

      {/* Sparkle effects when complete */}
      {score === endScore && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-yellow-400 rounded-full"
              style={{
                top: "50%",
                left: "50%",
              }}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 100,
                y: Math.sin((i * Math.PI * 2) / 8) * 100,
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.05,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default SEOScoreCircle;
