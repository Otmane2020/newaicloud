import { useState } from 'react';
import { Download, FileText, Copy, Check, ExternalLink, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function GoogleMerchant() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Générer l'URL du flux selon le nouveau format
  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopping-feed/shoppingfeed/${user?.id || 'YOUR_SELLER_ID'}/xml`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Google Merchant Center</h2>
        <p className="text-muted-foreground">
          Générez et configurez votre flux XML Google Shopping pour synchroniser vos produits avec Google Merchant Center
        </p>
      </div>

      {/* XML Feed URL Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Votre Flux XML Google Shopping</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Utilisez cette URL pour configurer votre flux de produits dans Google Merchant Center
            </p>

            {/* Feed URL */}
            <div className="bg-secondary rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium mb-2">URL du flux XML</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={feedUrl}
                  className="flex-1 font-mono text-sm"
                />
                <Button onClick={handleCopy} variant="default">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copié!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Format: <code className="bg-muted px-1 rounded">&#123;SUPABASE_URL&#125;/functions/v1/shopping-feed/shoppingfeed/&#123;SELLER_ID&#125;/xml</code>
              </p>
            </div>

            {/* Test Feed Button */}
            <div className="flex gap-3">
              <Button asChild variant="default">
                <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le flux XML
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Prévisualiser
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Setup Guide */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-4">Guide de Configuration Google Merchant Center</h3>

            <div className="space-y-4">
              {/* Step 1 */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Créer un compte Google Merchant Center</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Si vous n'avez pas encore de compte, créez-en un sur{' '}
                      <a
                        href="https://merchants.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        merchants.google.com
                      </a>
                    </p>
                  </div>
                </div>
              </Card>

              {/* Step 2 */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Ajouter un flux de produits</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Dans Google Merchant Center, allez dans <strong>Produits → Flux</strong> puis cliquez sur le bouton <strong>+ (Ajouter un flux)</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Sélectionnez votre pays cible</li>
                      <li>• Choisissez la langue de vos produits</li>
                      <li>• Nommez votre flux (ex: "Mon Catalogue Shopify")</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Step 3 */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Configurer la méthode d'import</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Choisissez <strong>"Flux planifiés"</strong> comme méthode d'import
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Méthode: <strong>URL planifiée récupérée</strong></li>
                      <li>• Fréquence: Quotidienne (recommandé)</li>
                      <li>• Heure: Choisissez une heure creuse</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Step 4 */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Coller l'URL du flux XML</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Collez l'URL de votre flux XML (copiée ci-dessus) dans le champ prévu à cet effet
                    </p>
                    <div className="bg-secondary rounded p-2 text-xs font-mono break-all">
                      {feedUrl}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format de l'URL du flux XML Google Shopping
                    </p>
                  </div>
                </div>
              </Card>

              {/* Step 5 */}
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Récupérer et valider</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cliquez sur <strong>"Récupérer maintenant"</strong> pour tester votre flux. Google validera automatiquement le format et les données.
                    </p>
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-3 mt-2">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>✓ Astuce:</strong> La première récupération peut prendre quelques minutes. Surveillez les erreurs dans l'onglet "Diagnostics".
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Card>

      {/* Feed Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold">Format</h4>
          </div>
          <p className="text-sm text-muted-foreground">XML Google Shopping Feed conforme aux spécifications officielles</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold">Mise à jour</h4>
          </div>
          <p className="text-sm text-muted-foreground">Flux mis à jour automatiquement en temps réel avec vos produits</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold">Compatibilité</h4>
          </div>
          <p className="text-sm text-muted-foreground">Compatible avec tous les pays et langues supportés par Google Merchant</p>
        </Card>
      </div>
    </div>
  );
}