import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileText, ExternalLink, RefreshCw } from 'lucide-react';

interface HomepageAltGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HomepageAltGuide({ open, onOpenChange }: HomepageAltGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6" />
            Guide : Modifier les ALT Texts Homepage
          </DialogTitle>
          <DialogDescription>
            Instructions complètes pour mettre à jour manuellement les textes ALT de votre page d'accueil dans Shopify
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1: Pourquoi cette limitation */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">📋 Pourquoi cette limitation ?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Les images de votre homepage sont intégrées dans le <strong>code Liquid de votre thème Shopify</strong>. 
                    Contrairement aux images produits qui ont un ID unique dans l'API, les images de la homepage font partie 
                    de sections de thème et nécessitent une modification directe via le Theme Editor.
                  </p>
                  <Alert>
                    <AlertDescription>
                      <strong>Note technique :</strong> L'API Shopify ne permet pas de modifier les attributs ALT des images 
                      intégrées dans les sections de thème. Seules les images produits ont un endpoint API pour la modification.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Exporter les ALT texts */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">📥 Exporter les ALT texts générés</h3>
                  
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-2">
                      <Badge variant="outline" className="flex-shrink-0">1</Badge>
                      <span>Cliquez sur le bouton <strong>"Exporter CSV"</strong> dans la section images homepage</span>
                    </li>
                    <li className="flex gap-2">
                      <Badge variant="outline" className="flex-shrink-0">2</Badge>
                      <span>Le fichier téléchargé contient :</span>
                    </li>
                  </ol>

                  <div className="bg-muted p-4 rounded-lg text-xs font-mono">
                    <div className="grid grid-cols-4 gap-2 font-semibold mb-2">
                      <div>Image URL</div>
                      <div>ALT Actuel</div>
                      <div>ALT Recommandé</div>
                      <div>Section Thème</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-muted-foreground">
                      <div>https://cdn.shopify...</div>
                      <div>-</div>
                      <div>Bannière Nike Air Max...</div>
                      <div>hero-section</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Modifier dans Shopify */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">🛠️ Modifier dans Shopify Theme Editor</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Badge className="mb-2">Étape 1</Badge>
                      <p className="text-sm ml-2">
                        <strong>Accéder au Theme Editor</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground ml-6 mt-1 space-y-1">
                        <li>• Allez dans Shopify Admin → Boutique en ligne → Thèmes</li>
                        <li>• Cliquez sur <strong>"Personnaliser"</strong> sur votre thème actif</li>
                      </ul>
                    </div>

                    <div>
                      <Badge className="mb-2">Étape 2</Badge>
                      <p className="text-sm ml-2">
                        <strong>Identifier la section</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground ml-6 mt-1 space-y-1">
                        <li>• Les sections homepage sont listées dans le panneau de gauche</li>
                        <li>• Exemples courants : "Image avec texte", "Carrousel", "Bannière héro", "Featured products"</li>
                        <li>• Utilisez le CSV pour trouver la section correspondante</li>
                      </ul>
                    </div>

                    <div>
                      <Badge className="mb-2">Étape 3</Badge>
                      <p className="text-sm ml-2">
                        <strong>Modifier l'ALT text</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground ml-6 mt-1 space-y-1">
                        <li>• Cliquez sur la section contenant l'image</li>
                        <li>• Cherchez le champ <strong>"Texte alternatif"</strong> ou <strong>"ALT text"</strong></li>
                        <li>• Copiez-collez le texte recommandé depuis le CSV</li>
                      </ul>
                    </div>

                    <div>
                      <Badge className="mb-2">Étape 4</Badge>
                      <p className="text-sm ml-2">
                        <strong>Sauvegarder et vérifier</strong>
                      </p>
                      <ul className="text-sm text-muted-foreground ml-6 mt-1 space-y-1">
                        <li>• Cliquez sur <strong>"Enregistrer"</strong> en haut à droite</li>
                        <li>• Prévisualisez la homepage pour vérifier les changements</li>
                        <li>• Inspectez l'élément avec les outils de développement (F12) pour confirmer l'ALT text</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Bonnes pratiques */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">💡 Bonnes Pratiques SEO</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium text-green-700 dark:text-green-300">✅ À faire :</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Utilisez les ALT texts générés par l'IA (optimisés SEO)</li>
                        <li>• Priorisez : logo, bannière principale, produits mis en avant</li>
                        <li>• Soyez descriptif et incluez des mots-clés pertinents</li>
                        <li>• Gardez les ALT texts entre 10-125 caractères</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-red-700 dark:text-red-300">❌ À éviter :</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• ALT texts génériques ("image", "photo", "bannière")</li>
                        <li>• Laisser des images importantes sans ALT text</li>
                        <li>• Bourrage de mots-clés (keyword stuffing)</li>
                        <li>• Descriptions trop longues ou non pertinentes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Re-scanner */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">🔄 Re-scanner après modification</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Une fois vos modifications terminées dans Shopify, revenez dans cet outil et cliquez sur 
                    <strong> "Importer les images homepage"</strong> pour re-scanner votre page d'accueil et vérifier 
                    que les ALT texts ont bien été pris en compte. Le score SEO sera automatiquement mis à jour.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
