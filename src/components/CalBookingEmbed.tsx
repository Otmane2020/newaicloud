import { useEffect } from "react";
import { useTranslation } from "@/lib/language";
import { Calendar, Clock, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Cal?: any;
  }
}

interface CalBookingEmbedProps {
  className?: string;
  minimal?: boolean;
}

export function CalBookingEmbed({ className = "", minimal = false }: CalBookingEmbedProps) {
  const { language } = useTranslation();

  const title = language === "fr" ? "Réserver une démo" : "Book a Demo";
  const subtitle =
    language === "fr"
      ? "Découvrez comment NewAI peut transformer votre boutique Shopify"
      : "Discover how NewAI can transform your Shopify store";
  const duration = language === "fr" ? "30 minutes" : "30 minutes";
  const availability = language === "fr" ? "Lun-Ven" : "Mon-Fri";
  const buttonText = language === "fr" ? "Réserver maintenant" : "Book now";

  useEffect(() => {
    // Load Cal.com embed script
    (function (C: any, A: string, L: string) {
      let p = function (a: any, ar: any) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const script = d.head.appendChild(d.createElement("script"));
          script.src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          (api as any).q = (api as any).q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal?.("init", "30min", { origin: "https://app.cal.com" });
    window.Cal?.ns?.["30min"]?.("ui", { 
      hideEventTypeDetails: false, 
      layout: "month_view" 
    });
  }, []);

  if (minimal) {
    return (
      <div className={`w-full flex flex-col items-center gap-4 ${className}`}>
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
        <Button 
          size="lg" 
          className="px-8"
          data-cal-link="new-ai-isgo1m/30min"
          data-cal-namespace="30min"
          data-cal-config='{"layout":"month_view"}'
        >
          <Video className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`p-6 sm:p-8 space-y-6 ${className}`}>
      <div className="text-center space-y-3">
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Video className="w-3 h-3 mr-1.5" />
          {language === "fr" ? "Appel vidéo" : "Video call"}
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

      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="px-8"
          data-cal-link="new-ai-isgo1m/30min"
          data-cal-namespace="30min"
          data-cal-config='{"layout":"month_view"}'
        >
          <Video className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}
