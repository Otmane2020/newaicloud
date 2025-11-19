import { X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/language";

export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary via-primary-light to-primary-dark text-white py-2 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm md:text-base font-medium">
        <span className="animate-pulse">🎉</span>
        <span>{t.announcement.limitedSale}</span>
        <button
          onClick={() => navigate('/auth?mode=signup')}
          className="underline font-bold hover:text-primary-foreground/80 transition-colors"
        >
          {t.announcement.checkOut}
        </button>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-white/10 rounded-full p-1 transition-colors"
        aria-label="Close announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
