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
    <div className="bg-gradient-dark border-b border-primary/20 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary-light/10 to-primary/10 animate-pulse" />
      <div className="container mx-auto flex items-center justify-center gap-3 py-3 px-4 relative z-10">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-sm md:text-base font-medium text-foreground">
          {t.announcement.limitedSale}
        </span>
        <button
          onClick={() => navigate('/auth?mode=signup')}
          className="px-4 py-1.5 rounded-lg bg-gradient-primary text-white font-semibold text-sm hover:shadow-glow transition-all hover:scale-105"
        >
          {t.announcement.checkOut}
        </button>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-muted rounded-full p-1.5 transition-colors z-20"
        aria-label="Close announcement"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
};
