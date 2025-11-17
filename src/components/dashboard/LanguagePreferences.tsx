import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/language";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";

export function LanguagePreferences() {
  const { language, setLanguage, t } = useTranslation();

  const handleLanguageChange = (lang: 'en' | 'fr') => {
    setLanguage(lang);
    const langName = lang === 'en' ? t.account.language.english : t.account.language.french;
    toast.success(t.account.language.changeSuccess.replace('{{language}}', langName));
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Globe className="w-6 h-6 text-primary" />
        {t.account.language.title}
      </h2>
      
      <p className="text-muted-foreground mb-6">
        {t.account.language.description}
      </p>

      <div className="flex gap-4">
        <Button
          variant={language === 'en' ? 'default' : 'outline'}
          className="flex-1 h-16 relative"
          onClick={() => handleLanguageChange('en')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold px-3 py-1 bg-primary/10 rounded">EN</span>
            <span className="font-semibold">{t.account.language.english}</span>
            {language === 'en' && <Check className="w-5 h-5 ml-2" />}
          </div>
        </Button>

        <Button
          variant={language === 'fr' ? 'default' : 'outline'}
          className="flex-1 h-16 relative"
          onClick={() => handleLanguageChange('fr')}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold px-3 py-1 bg-primary/10 rounded">FR</span>
            <span className="font-semibold">{t.account.language.french}</span>
            {language === 'fr' && <Check className="w-5 h-5 ml-2" />}
          </div>
        </Button>
      </div>
    </Card>
  );
}
