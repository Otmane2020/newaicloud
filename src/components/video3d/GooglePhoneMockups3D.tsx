import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Star, TrendingUp, Eye, ShoppingBag } from "lucide-react";

// Google Logo SVG
const GoogleLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Discover Logo
const DiscoverLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <div className={`${className} bg-blue-600 rounded-full flex items-center justify-center`}>
    <span className="text-white font-bold text-xs">D</span>
  </div>
);

// Product data
const PRODUCTS = {
  search: {
    title: "Canapé Velours Vert",
    price: "€899,00",
    reviews: 127,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=200&fit=crop",
    secondaryItems: [
      { title: "Fauteuil Scandinave", price: "€349,00", image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=100&h=80&fit=crop" }
    ]
  },
  shopping: {
    title: "Nike Air Max 90",
    subtitle: "Nike Store",
    price: "€149,99",
    reviews: "2.3k reviews",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop",
    bgColor: "bg-red-500",
    secondaryItems: [
      { price: "€89,00", image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=100&h=80&fit=crop" },
      { price: "€129,00", image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=100&h=80&fit=crop" }
    ]
  },
  discover: {
    title: "Trending luxury watches 2024",
    subtitle: "Fashion Magazine",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=200&fit=crop",
    secondaryItems: [
      { title: "Scandinavian...", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=100&h=100&fit=crop" },
      { title: "Design Modern", image: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=100&h=100&fit=crop" }
    ]
  }
};

interface GooglePhoneMockups3DProps {
  activeTab?: "search" | "shopping" | "discover";
  autoRotate?: boolean;
}

export const GooglePhoneMockups3D = ({ 
  activeTab: externalTab, 
  autoRotate = true 
}: GooglePhoneMockups3DProps) => {
  const [activeTab, setActiveTab] = useState<"search" | "shopping" | "discover">(externalTab || "search");
  
  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
      return;
    }
    
    if (!autoRotate) return;
    
    const tabs: ("search" | "shopping" | "discover")[] = ["search", "shopping", "discover"];
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = tabs.indexOf(prev);
        return tabs[(currentIndex + 1) % tabs.length];
      });
    }, 2500);
    
    return () => clearInterval(interval);
  }, [autoRotate, externalTab]);

  return (
    <motion.div 
      className="relative w-72 h-[480px]"
      style={{ perspective: 1500 }}
    >
      {/* Phone Frame */}
      <motion.div
        className="absolute inset-0 bg-white rounded-[40px] shadow-2xl overflow-hidden border-8 border-gray-800"
        style={{ 
          transformStyle: "preserve-3d",
          boxShadow: "0 50px 100px -20px rgba(0,0,0,0.4), 0 30px 60px -30px rgba(0,0,0,0.3)"
        }}
        animate={{ 
          rotateY: activeTab === "search" ? -8 : activeTab === "shopping" ? 0 : 8,
          rotateX: 5,
          scale: 1
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {/* Phone Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-full z-20" />
        
        {/* Screen Content */}
        <div className="absolute inset-0 pt-10 bg-gray-50 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "search" && (
              <motion.div
                key="search"
                className="h-full p-4"
                initial={{ opacity: 0, rotateY: 90, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -90, x: -100 }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                {/* Search Bar */}
                <motion.div 
                  className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md mb-4"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <GoogleLogo className="w-5 h-5" />
                  <span className="text-gray-600 text-sm">canapé velours vert</span>
                </motion.div>
                
                {/* Main Result Card */}
                <motion.div 
                  className="bg-white rounded-2xl shadow-lg overflow-hidden mb-3"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="p-3 bg-gray-100">
                    <motion.img 
                      src={PRODUCTS.search.image} 
                      alt="Sofa"
                      className="w-full h-32 object-cover rounded-lg"
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    />
                  </div>
                  <div className="p-3">
                    <motion.h3 
                      className="font-semibold text-gray-900 text-sm"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {PRODUCTS.search.title}
                    </motion.h3>
                    <motion.div 
                      className="flex items-center gap-1 mt-1"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="flex">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-gray-500 text-xs">({PRODUCTS.search.reviews})</span>
                    </motion.div>
                    <motion.p 
                      className="text-green-600 font-bold mt-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: "spring" }}
                    >
                      {PRODUCTS.search.price}
                    </motion.p>
                  </div>
                </motion.div>
                
                {/* Secondary Result */}
                {PRODUCTS.search.secondaryItems.map((item, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-3 bg-white rounded-xl p-2 shadow-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded-lg" />
                    <div>
                      <p className="text-xs text-gray-700">{item.title}</p>
                      <p className="text-green-600 text-xs font-bold">{item.price}</p>
                    </div>
                  </motion.div>
                ))}
                
                {/* Label */}
                <motion.p 
                  className="text-center text-blue-500 text-xs mt-4 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Rich Results
                </motion.p>
              </motion.div>
            )}
            
            {activeTab === "shopping" && (
              <motion.div
                key="shopping"
                className="h-full p-4"
                initial={{ opacity: 0, rotateY: 90, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -90, x: -100 }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                {/* Shopping Header */}
                <motion.div 
                  className="flex items-center gap-2 bg-green-500 rounded-full px-4 py-2 mb-4 w-fit"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <GoogleLogo className="w-4 h-4" />
                  <span className="text-white text-sm font-medium">Shopping</span>
                </motion.div>
                
                {/* Main Product Card */}
                <motion.div 
                  className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4 border-2 border-red-400"
                  initial={{ scale: 0.8, opacity: 0, rotateX: 30 }}
                  animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`${PRODUCTS.shopping.bgColor} p-4`}>
                    <motion.img 
                      src={PRODUCTS.shopping.image} 
                      alt="Shoes"
                      className="w-full h-36 object-contain"
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <motion.h3 
                          className="font-bold text-gray-900"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          {PRODUCTS.shopping.title}
                        </motion.h3>
                        <motion.p 
                          className="text-gray-500 text-xs"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.6 }}
                        >
                          {PRODUCTS.shopping.subtitle}
                        </motion.p>
                      </div>
                      <motion.div 
                        className="flex items-center gap-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7, type: "spring" }}
                      >
                        <div className="flex">
                          {[1,2,3,4].map(i => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                          <Star className="w-3 h-3 fill-yellow-200 text-yellow-400" />
                        </div>
                        <span className="text-gray-400 text-xs">{PRODUCTS.shopping.reviews}</span>
                      </motion.div>
                    </div>
                    <motion.p 
                      className="text-green-600 font-bold text-lg mt-1"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                    >
                      {PRODUCTS.shopping.price}
                    </motion.p>
                  </div>
                </motion.div>
                
                {/* Secondary Products */}
                <div className="flex gap-3">
                  {PRODUCTS.shopping.secondaryItems.map((item, i) => (
                    <motion.div 
                      key={i}
                      className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden"
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
                      whileHover={{ y: -3 }}
                    >
                      <img src={item.image} alt="Product" className="w-full h-20 object-cover" />
                      <p className="text-green-600 text-xs font-bold p-2">{item.price}</p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Label */}
                <motion.p 
                  className="text-center text-green-500 text-xs mt-4 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Google Shopping
                </motion.p>
              </motion.div>
            )}
            
            {activeTab === "discover" && (
              <motion.div
                key="discover"
                className="h-full p-4"
                initial={{ opacity: 0, rotateY: 90, x: 100 }}
                animate={{ opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: -90, x: -100 }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              >
                {/* Discover Header */}
                <motion.div 
                  className="flex items-center gap-2 mb-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <DiscoverLogo className="w-7 h-7" />
                  <span className="text-gray-800 font-medium">Discover</span>
                </motion.div>
                
                {/* Main Card */}
                <motion.div 
                  className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <motion.img 
                    src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=160&fit=crop"
                    alt="Featured"
                    className="w-full h-40 object-cover"
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  />
                  <div className="p-3">
                    <motion.h3 
                      className="font-semibold text-gray-900"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      {PRODUCTS.discover.title}
                    </motion.h3>
                    <motion.p 
                      className="text-blue-500 text-sm"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {PRODUCTS.discover.subtitle}
                    </motion.p>
                  </div>
                </motion.div>
                
                {/* Secondary Cards */}
                <div className="flex gap-3">
                  {PRODUCTS.discover.secondaryItems.map((item, i) => (
                    <motion.div 
                      key={i}
                      className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden"
                      initial={{ y: 30, opacity: 0, rotateY: i === 0 ? -20 : 20 }}
                      animate={{ y: 0, opacity: 1, rotateY: 0 }}
                      transition={{ delay: 0.8 + i * 0.15, type: "spring" }}
                      whileHover={{ y: -3, scale: 1.02 }}
                    >
                      <img src={item.image} alt={item.title} className="w-full h-24 object-cover" />
                      <p className="text-gray-700 text-xs p-2 truncate">{item.title}</p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Label */}
                <motion.p 
                  className="text-center text-blue-500 text-xs mt-4 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Discover
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full" />
      </motion.div>
      
      {/* Tab Indicators */}
      <motion.div 
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {(["search", "shopping", "discover"] as const).map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeTab === tab 
                ? "bg-white text-blue-600 shadow-lg" 
                : "bg-white/20 text-white/70 hover:bg-white/30"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab === "search" ? "Search" : tab === "shopping" ? "Shopping" : "Discover"}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};
