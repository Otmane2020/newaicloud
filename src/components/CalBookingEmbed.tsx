import { useEffect, useRef } from "react";
import { useTranslation } from "@/lib/language";
import { Calendar, Clock, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CalBookingEmbedProps {
  className?: string;
  minimal?: boolean;
}

export function CalBookingEmbed({ className = "", minimal = false }: CalBookingEmbedProps) {
  const { language, t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Cal.com embed script
    const script = document.createElement("script");
    script.src = "https://app.cal.com/embed/embed.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // @ts-ignore - Cal is loaded from external script
      if (window.Cal) {
        // @ts-ignore
        window.Cal("init", { origin: "https://cal.com" });
        // @ts-ignore
        window.Cal("inline", {
          elementOrSelector: "#cal-booking-embed",
          calLink: "new-ai-isgo1m/30min",
          layout: "month_view",
          config: {
            theme: "light",
          },
        });
      }
    };

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const title = language === 'fr' ? "Réserver une démo" : "Book a Demo";
  const subtitle = language === 'fr' 
    ? "Découvrez comment NewAI peut transformer votre boutique Shopify"
    : "Discover how NewAI can transform your Shopify store";
  const duration = language === 'fr' ? "30 minutes" : "30 minutes";
  const availability = language === 'fr' 
    ? "Lun-Ven, 10h30-16h30 (Paris)"
    : "Mon-Fri, 10:30AM-4:30PM (Paris)";

  if (minimal) {
    return (
      <div className={`w-full ${className}`}>
        <div 
          id="cal-booking-embed" 
          ref={containerRef}
          className="w-full h-[350px] rounded-xl overflow-hidden"
        />
      </div>
    );
  }

  return (
    <Card className={`p-6 sm:p-8 space-y-6 ${className}`}>
      <div className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Video className="w-3 h-3 mr-1.5" />
          {language === 'fr' ? "Appel vidéo" : "Video call"}
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-bold">{title}</h3>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{availability}</span>
        </div>
      </div>

      <div 
        id="cal-booking-embed" 
        ref={containerRef}
        className="w-full h-[400px] rounded-xl overflow-hidden border"
      />
    </Card>
  );
}
