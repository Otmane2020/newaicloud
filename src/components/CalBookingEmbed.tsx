import { useTranslation } from "@/lib/language";
import { Calendar, Clock, Video, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CalBookingEmbedProps {
  className?: string;
  minimal?: boolean;
}

const CAL_LINK = "https://cal.com/new-ai-isgo1m/30min?overlayCalendar=true";

export function CalBookingEmbed({ className = "", minimal = false }: CalBookingEmbedProps) {
  const { language } = useTranslation();

  const title = language === 'fr' ? "Réserver une démo" : "Book a Demo";
  const subtitle = language === 'fr' 
    ? "Découvrez comment NewAI peut transformer votre boutique Shopify"
    : "Discover how NewAI can transform your Shopify store";
  const duration = language === 'fr' ? "30 minutes" : "30 minutes";
  const availability = language === 'fr' 
    ? "Lun-Ven, 10h30-16h30 (Paris)"
    : "Mon-Fri, 10:30AM-4:30PM (Paris)";
  const buttonText = language === 'fr' ? "Réserver maintenant" : "Book now";

  const handleBooking = () => {
    window.open(CAL_LINK, '_blank');
  };

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
          onClick={handleBooking}
          className="px-8"
        >
          <Video className="w-4 h-4 mr-2" />
          {buttonText}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
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

      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={handleBooking}
          className="px-8"
        >
          <Video className="w-4 h-4 mr-2" />
          {buttonText}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
