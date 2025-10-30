import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Globe } from "lucide-react";

export const LanguageSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentLang = location.pathname.startsWith('/fr') ? 'fr' : 'en';
  
  const switchLanguage = (lang: 'en' | 'fr') => {
    const currentPath = location.pathname;
    if (lang === 'fr' && !currentPath.startsWith('/fr')) {
      navigate('/fr' + currentPath);
    } else if (lang === 'en' && currentPath.startsWith('/fr')) {
      navigate(currentPath.replace('/fr', ''));
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Globe className="w-4 h-4" />
      <Button
        variant={currentLang === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => switchLanguage('en')}
      >
        🇬🇧 EN
      </Button>
      <Button
        variant={currentLang === 'fr' ? 'default' : 'outline'}
        size="sm"
        onClick={() => switchLanguage('fr')}
      >
        🇫🇷 FR
      </Button>
    </div>
  );
};
