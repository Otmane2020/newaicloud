import { PreferencesConfigurator } from '@/components/landing/PreferencesConfigurator';
import { PreferencesList } from '@/components/landing/PreferencesList';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LandingConfigurator() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/landingtest">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au test
            </Button>
          </Link>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurateur Landing Pages</h1>
          <p className="text-muted-foreground">
            Créez et gérez vos préférences pour la génération de landing pages produit
          </p>
        </div>
        
        <PreferencesConfigurator />
        
        <PreferencesList />
      </div>
    </div>
  );
}
