import { motion } from "framer-motion";
import sofaWhiteBackground from "@/assets/sofa-white-background.jpg";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";

interface BeforeAfterSplitProps {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  conversionBoost?: string;
  subtitle?: string;
}

export const BeforeAfterSplit = ({
  beforeImage = sofaWhiteBackground,
  afterImage = sofaWithBackground,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  conversionBoost = "+68%",
  subtitle = "Vision AI turns boring product photos into high-converting visuals",
}: BeforeAfterSplitProps) => {
  return (
    <motion.div
      className="relative w-full max-w-xs sm:max-w-sm mx-auto py-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Subtitle Text */}
      <motion.p
        className="text-center text-white font-semibold mb-6 text-sm sm:text-md tracking-wide drop-shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {subtitle}
      </motion.p>

      {/* Conversion Badge */}
      <motion.div
        className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
        initial={{ scale: 0, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      >
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-2 rounded-full shadow-2xl border border-white/20">
          <span className="text-white font-black text-lg">{conversionBoost} Conversions 🚀</span>
        </div>
      </motion.div>

      <div className="flex gap-4 mt-10">
        {/* BEFORE */}
        <motion.div
          initial={{ x: -140, rotateY: -40, opacity: 0 }}
          animate={{ x: 0, rotateY: -6, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
          className="flex-1 relative group"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="rounded-2xl overflow-hidden shadow-[0_0_25px_-5px_rgba(255,0,0,0.4)] bg-neutral-200 border border-red-400/30">
            <div className="bg-red-500 text-white text-xs font-bold py-1 text-center">{beforeLabel}</div>

            <div className="relative h-40 bg-white">
              <img src={beforeImage} className="w-full h-full object-cover opacity-[.85] grayscale" />
              <div className="absolute inset-0 bg-black/30" />
            </div>

            <div className="p-2 text-center text-xs text-gray-300">Plain / Low Engagement</div>
          </div>

          {/* Sad Icon */}
          <motion.div
            className="absolute -top-2 -right-2 bg-red-500 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm shadow-xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            ✕
          </motion.div>
        </motion.div>

        {/* AFTER */}
        <motion.div
          initial={{ x: 140, rotateY: 40, opacity: 0 }}
          animate={{ x: 0, rotateY: 6, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 80 }}
          className="flex-1 relative group"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Neon Glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl blur-xl bg-blue-400 opacity-40"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <div className="rounded-2xl overflow-hidden shadow-[0_0_25px_-5px_rgba(0,200,255,0.6)] border-2 border-blue-400/60 bg-white">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold py-1 text-center">
              ✨ {afterLabel}
            </div>

            <div className="relative h-40">
              <motion.img
                src={afterImage}
                className="w-full h-full object-cover"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* Shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </div>

            <div className="p-2 text-center text-xs font-bold text-blue-600">AI Background • High Conversion</div>
          </div>

          {/* Checkmark */}
          <motion.div
            className="absolute -top-2 -right-2 bg-green-500 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm shadow-xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.55 }}
          >
            ✓
          </motion.div>
        </motion.div>
      </div>

      {/* Transition Arrow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
        transition={{ delay: 0.45, duration: 1.2, repeat: Infinity }}
      >
        <div className="w-11 h-11 bg-yellow-400 rounded-full flex items-center justify-center text-xl shadow-xl">→</div>
      </motion.div>
    </motion.div>
  );
};

export default BeforeAfterSplit;
