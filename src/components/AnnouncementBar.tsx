import { X, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";

export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-announcement border-b border-primary-light/30 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 py-3 pr-8 sm:pr-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse flex-shrink-0" />
            <span className="text-xs sm:text-sm md:text-base font-medium text-white">
              {t.announcement.limitedSale}
            </span>
          </div>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-primary text-white font-semibold text-xs sm:text-sm hover:shadow-glow transition-all hover:scale-105 whitespace-nowrap"
          >
            {t.announcement.checkOut}
          </button>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 hover:bg-white/10 rounded-full p-1.5 transition-colors z-20"
        aria-label="Close announcement"
      >
        <X className="w-4 h-4 text-white/70 hover:text-white" />
      </button>
    </div>
  );
};
