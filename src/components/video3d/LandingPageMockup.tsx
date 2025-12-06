import { motion } from "framer-motion";
import sofaWithBackground from "@/assets/sofa-with-background.jpg";

interface LandingPageMockupProps {
  productImage?: string;
  productTitle?: string;
  productPrice?: string;
}

export const LandingPageMockup = ({
  productImage = sofaWithBackground,
  productTitle = "Premium Velvet Sofa",
  productPrice = "$1,299",
}: LandingPageMockupProps) => {
  return (
    <div className="relative perspective-1000">
      {/* Glow behind phone */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-purple-500/50 to-blue-500/50 rounded-[3rem] blur-3xl"
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Phone frame */}
      <motion.div
        className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl"
        initial={{ y: 100, rotateX: 30, opacity: 0 }}
        animate={{ y: 0, rotateX: 8, opacity: 1 }}
        transition={{ type: "spring", stiffness: 60 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Screen */}
        <div className="bg-white rounded-[2rem] overflow-hidden w-64 h-[450px]">
          {/* Status bar */}
          <div className="bg-gray-100 h-7 flex items-center justify-between px-6">
            <span className="text-xs font-semibold">9:41</span>
            <div className="w-20 h-5 bg-black rounded-full" />
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-gray-800 rounded-sm" />
            </div>
          </div>

          {/* Landing page content */}
          <div className="p-4 space-y-3">
            {/* Hero section */}
            <motion.div
              className="relative rounded-xl overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <img 
                src={productImage} 
                alt="Product" 
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <p className="text-white font-bold text-sm">{productTitle}</p>
                <p className="text-white/90 text-xs">AI-Generated Landing</p>
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl py-3 text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
            >
              <span className="text-white font-bold text-sm">Buy Now - {productPrice}</span>
            </motion.div>

            {/* Features */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              {[
                { icon: "✓", text: "Free Shipping", color: "bg-green-100 text-green-600" },
                { icon: "⚡", text: "AI-Optimized SEO", color: "bg-purple-100 text-purple-600" },
                { icon: "🛡️", text: "Secure Checkout", color: "bg-blue-100 text-blue-600" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className={`${item.color} rounded-lg px-3 py-2 flex items-center gap-2`}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  <span>{item.icon}</span>
                  <span className="text-xs font-semibold">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="flex justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              {["Shopify", "Secure", "Fast"].map((badge, i) => (
                <div key={i} className="bg-gray-100 px-2 py-1 rounded text-[10px] font-semibold text-gray-600">
                  {badge}
                </div>
              ))}
            </motion.div>

            {/* FAQ section preview */}
            <motion.div
              className="bg-gray-50 rounded-lg p-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <p className="text-[10px] font-bold text-gray-700 mb-1">FAQ</p>
              <div className="space-y-1">
                {["Shipping Info", "Returns Policy", "Size Guide"].map((q, i) => (
                  <div key={i} className="bg-white rounded px-2 py-1 text-[9px] text-gray-600 flex justify-between">
                    <span>{q}</span>
                    <span>+</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* AI badge */}
      <motion.div
        className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full shadow-xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
      >
        <span className="text-white font-bold text-sm">✨ AI Generated</span>
      </motion.div>
    </div>
  );
};

export default LandingPageMockup;
