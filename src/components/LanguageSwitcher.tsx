import { useTranslation } from '@/lib/language';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export function LanguageSwitcher() {
  const { language, setLanguage, t, tf } = useTranslation();
  const { toast } = useToast();

  const handleLanguageChange = (lang: 'en' | 'fr') => {
    console.log('🌐 Changing language to:', lang);
    setLanguage(lang);
    
    const langName = lang === 'en' ? 'English' : 'Français';
    
    toast({
      title: t.toasts.languageChanged,
      description: tf('toasts.languageChangedDesc', { language: langName }),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-primary/20 rounded-full transition-all duration-300 hover:scale-105"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={`rounded-lg cursor-pointer transition-all ${
            language === 'en' 
              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold' 
              : 'hover:bg-accent/50'
          }`}
        >
          <span className="text-xl mr-3">🇬🇧</span>
          <span className="flex-1">English</span>
          {language === 'en' && <span className="ml-2 text-lg">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('fr')}
          className={`rounded-lg cursor-pointer transition-all ${
            language === 'fr' 
              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold' 
              : 'hover:bg-accent/50'
          }`}
        >
          <span className="text-xl mr-3">🇫🇷</span>
          <span className="flex-1">Français</span>
          {language === 'fr' && <span className="ml-2 text-lg">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
