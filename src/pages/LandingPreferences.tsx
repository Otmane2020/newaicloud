import { PreferencesConfigurator } from '@/components/landing/PreferencesConfigurator';
import { PreferencesList } from '@/components/landing/PreferencesList';

export default function LandingPreferences() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Préférences Landing Pages</h1>
        <p className="text-muted-foreground">
          Configurez vos préférences par défaut pour la génération de landing pages produit
        </p>
      </div>
      
      <PreferencesConfigurator />
      
      <PreferencesList />
    </div>
  );
}
