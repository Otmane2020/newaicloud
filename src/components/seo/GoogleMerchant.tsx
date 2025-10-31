import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Settings,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FeedStatus {
  lastFetch: string | null;
  itemCount: number | null;
  status: "success" | "error" | "loading" | "idle";
  error?: string;
}

export function GoogleMerchant() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    lastFetch: null,
    itemCount: null,
    status: "idle",
  });
  const [isTesting, setIsTesting] = useState(false);

  // URL du flux avec le domaine NewAI
  const feedUrl = `https://newai.sale/shoppingfeed/${user?.id || "YOUR_SELLER_ID"}/xml`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testFeed = async () => {
    setIsTesting(true);
    setFeedStatus((prev) => ({ ...prev, status: "loading" }));

    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      // Vérifier si c'est un XML valide
      if (!text.includes("<?xml") || !text.includes("<rss")) {
        throw new Error("Format XML invalide");
      }

      // Compter les items
      const itemCount = (text.match(/<item>/g) || []).length;

      setFeedStatus({
        lastFetch: new Date().toISOString(),
        itemCount,
        status: "success",
      });
    } catch (error) {
      setFeedStatus({
        lastFetch: null,
        itemCount: null,
        status: "error",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    // Tester automatiquement le flux au chargement
    testFeed();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const getStatusBadge = () => {
    switch (feedStatus.status) {
      case "success":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            ✓ Opérationnel
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            ✗ Erreur
          </Badge>
        );
      case "loading":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            ⟳ Test en cours
          </Badge>
        );
      default:
        return <Badge variant="outline">⏳ Non testé</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Google Merchant Center</h2>
        <p className="text-muted-foreground">
          Générez et configurez votre flux XML Google Shopping pour synchroniser vos produits avec Google Merchant
          Center
        </p>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Flux XML
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Guide de configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-6">
          {/* Status Card */}
          <Card className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Statut du Flux</h3>
              {getStatusBadge()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Dernier test</p>
                <p className="text-lg font-semibold">
                  {feedStatus.status === "loading" ? "..." : formatDate(feedStatus.lastFetch)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Produits détectés</p>
                <p className="text-lg font-semibold">
                  {feedStatus.status === "loading" ? "..." : feedStatus.itemCount || "0"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Format</p>
                <p className="text-lg font-semibold">XML Google Shopping</p>
              </div>
            </div>

            {feedStatus.status === "error" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Erreur lors du test du flux: {feedStatus.error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={testFeed} disabled={isTesting} variant="outline" className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isTesting ? "animate-spin" : ""}`} />
                {isTesting ? "Test en cours..." : "Tester le flux"}
              </Button>

              {feedStatus.status === "success" && (
                <Button asChild variant="default">
                  <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger XML
                  </a>
                </Button>
              )}
            </div>
          </Card>

          {/* XML Feed URL Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Configuration du Flux</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Utilisez cette URL pour configurer votre flux de produits dans Google Merchant Center
                </p>

                {/* Feed URL */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">URL du flux XML</label>
                    <div className="flex gap-2">
                      <Input readOnly value={feedUrl} className="flex-1 font-mono text-sm" />
                      <Button onClick={handleCopy} variant="default" className="shrink-0">
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
                  </div>

                  <div className="bg-muted rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Paramètres recommandés Google Merchant</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fréquence:</span>
                        <span className="font-medium">Quotidienne</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Heure:</span>
                        <span className="font-medium">04:00 (GMT+1)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-medium">XML 2.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Encodage:</span>
                        <span className="font-medium">UTF-8</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <Button asChild variant="default">
                    <a href={feedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Prévisualiser le flux
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Accéder à Merchant Center
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold">Format</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                XML Google Shopping Feed conforme aux spécifications officielles
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold">Mise à jour</h4>
              </div>
              <p className="text-sm text-muted-foreground">Flux mis à jour automatiquement en temps réel</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-semibold">Planification</h4>
              </div>
              <p className="text-sm text-muted-foreground">Synchronisation quotidienne automatique</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guide">
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
                          Si vous n'avez pas encore de compte, créez-en un sur{" "}
                          <a
                            href="https://merchants.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                          >
                            merchants.google.com
                          </a>
                        </p>
                        <div className="bg-secondary rounded p-2 text-xs">
                          <strong>✓ Important:</strong> Vérifiez que votre compte Shopify est bien lié à votre Merchant
                          Center
                        </div>
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
                          Dans Google Merchant Center, allez dans <strong>Produits → Flux</strong> puis cliquez sur le
                          bouton <strong>+ (Ajouter un flux)</strong>
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
                          <li>
                            • Méthode: <strong>URL planifiée récupérée</strong>
                          </li>
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
                        <div className="bg-secondary rounded p-2 text-xs font-mono break-all mb-2">{feedUrl}</div>
                        <Button onClick={handleCopy} variant="outline" size="sm" className="flex items-center gap-2">
                          <Copy className="w-3 h-3" />
                          Copier l'URL
                        </Button>
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
                          Cliquez sur <strong>"Récupérer maintenant"</strong> pour tester votre flux. Google validera
                          automatiquement le format et les données.
                        </p>
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-3 mt-2">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>✓ Astuce:</strong> La première récupération peut prendre quelques minutes.
                            Surveillez les erreurs dans l'onglet "Diagnostics".
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Support Section */}
                <Card className="p-4 mt-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-2">Besoin d'aide ?</h4>
                      <p className="text-sm text-muted-foreground">
                        Si vous rencontrez des problèmes de configuration, consultez la{" "}
                        <a
                          href="https://support.google.com/merchants"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          documentation officielle Google Merchant Center
                        </a>{" "}
                        ou contactez notre support.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
