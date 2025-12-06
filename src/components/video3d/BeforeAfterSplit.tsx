import { motion } from "framer-motion";
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";

interface BeforeAfterSplitProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  conversionBoost?: string;
}

export const BeforeAfterSplit = ({
  beforeImage = sofaWhiteBackground,
  afterImage = sofaWithBackground,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  conversionBoost = "+68%",
}: BeforeAfterSplitProps) => {
  return (
    <div className="relative w-full max-w-sm perspective-1000">
      {/* Conversion boost badge */}
      <motion.div
        className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
        initial={{ scale: 0, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-2 rounded-full shadow-xl">
          <span className="text-white font-black text-lg">{conversionBoost} Conversions</span>
        </div>
      </motion.div>

      <div className="flex gap-4 mt-6">
        {/* Before Card - 3D effect */}
        <motion.div
          className="flex-1 relative"
          initial={{ x: -150, rotateY: -45, opacity: 0 }}
          animate={{ x: 0, rotateY: -8, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="bg-gray-200 rounded-2xl overflow-hidden shadow-2xl">
            {/* Label */}
            <div className="bg-gray-500 py-2 text-center">
              <span className="text-white font-bold text-sm">{beforeLabel}</span>
            </div>
            
            {/* Image */}
            <div className="relative h-40 bg-white">
              <img 
                src={beforeImage} 
                alt="Before" 
                className="w-full h-full object-cover opacity-80 grayscale-[30%]"
              />
              {/* Sad overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
            </div>
            
            {/* Info */}
            <div className="p-3 bg-gray-100 text-center">
              <p className="text-gray-500 text-xs">Plain white background</p>
              <p className="text-gray-400 font-bold">Low engagement</p>
              <div className="flex justify-center mt-2">
                <span className="text-red-500 text-xl">😔</span>
              </div>
            </div>
          </div>
          
          {/* X mark */}
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="text-white font-bold">✕</span>
          </motion.div>
        </motion.div>

        {/* After Card - 3D effect with glow */}
        <motion.div
          className="flex-1 relative"
          initial={{ x: 150, rotateY: 45, opacity: 0 }}
          animate={{ x: 0, rotateY: 8, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-400">
            {/* Label */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-2 text-center">
              <span className="text-white font-bold text-sm">✨ {afterLabel}</span>
            </div>
            
            {/* Image */}
            <div className="relative h-40">
              <motion.img 
                src={afterImage} 
                alt="After" 
                className="w-full h-full object-cover"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </div>
            
            {/* Info */}
            <div className="p-3 bg-gradient-to-b from-blue-50 to-white text-center">
              <p className="text-blue-600 text-xs font-semibold">Vision AI Enhanced</p>
              <p className="text-gray-900 font-bold">Professional staging</p>
              <div className="flex justify-center mt-2">
                <span className="text-2xl">🚀</span>
              </div>
            </div>
          </div>
          
          {/* Checkmark */}
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="text-white font-bold">✓</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Arrow between */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1, x: [0, 10, 0] }}
        transition={{ 
          scale: { delay: 0.6 },
          x: { duration: 1, repeat: Infinity }
        }}
      >
        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl">
          <span className="text-2xl">→</span>
        </div>
      </motion.div>
    </div>
  );
};

export default BeforeAfterSplit;
