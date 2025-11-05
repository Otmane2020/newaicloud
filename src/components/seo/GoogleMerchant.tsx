import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  FileText,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Settings,
  Calendar,
  Sparkles,
  Zap,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FeedStatus {
  lastFetch: string | null;
  itemCount: number | null;
  status: "success" | "error" | "loading" | "idle";
  error?: string;
}

export function GoogleMerchant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>({
    lastFetch: null,
    itemCount: null,
    status: "idle",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [optimizationScore, setOptimizationScore] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [dbProductCount, setDbProductCount] = useState(0);

  // URL du flux avec le domaine NewAI (pour affichage final)
  const feedUrl = `https://newai.sale/shoppingfeed/${user?.id || "YOUR_SELLER_ID"}/xml`;
  
  // URL Supabase directe (fonctionne toujours)
  const directFeedUrl = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopping-feed/shoppingfeed/${user?.id || "YOUR_SELLER_ID"}/xml`;

  const handleCopy = () => {
    navigator.clipboard.writeText(directFeedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testFeed = async () => {
    setIsTesting(true);
    setFeedStatus((prev) => ({ ...prev, status: "loading" }));

    try {
      // Utiliser l'URL Supabase directe pour tester (fonctionne en preview)
      const testUrl = `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopping-feed/shoppingfeed/${user?.id}/xml`;
      const response = await fetch(testUrl);
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

  const regenerateFeed = async () => {
    setRegenerating(true);
    try {
      // Force une nouvelle génération en appelant le flux
      await testFeed();
      await fetchOptimizationScore(); // Recalculate score after regeneration
      toast.success("Flux XML régénéré avec succès ! 🎉");
    } catch (error) {
      console.error("Error regenerating feed:", error);
      toast.error("Erreur lors de la régénération du flux");
    } finally {
      setRegenerating(false);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info("Génération du fichier CSV...");
      
      // Fetch products from database
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .order('title');

      if (error) throw error;

      if (!products || products.length === 0) {
        toast.error("Aucun produit à exporter");
        return;
      }

      // CSV headers
      const headers = [
        'ID',
        'Titre',
        'Description',
        'Prix',
        'URL',
        'URL Image',
        'Disponibilité',
        'Marque',
        'Catégorie Google',
        'GTIN',
        'MPN',
        'Condition',
        'Fond blanc IA'
      ];

      // Convert products to CSV rows
      const rows = products.map((product: any) => [
        product.shopify_product_id || '',
        product.title || '',
        (product.body_html || product.description || '').replace(/"/g, '""').replace(/\n/g, ' '),
        product.price || '',
        product.handle ? `https://www.shopify.com/products/${product.handle}` : '',
        product.image_url || '',
        product.status === 'active' ? 'in stock' : 'out of stock',
        product.vendor || '',
        product.google_product_category || '',
        product.google_gtin || '',
        product.google_mpn || '',
        product.google_condition || 'new',
        product.google_white_background ? 'Oui' : 'Non'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `google-shopping-feed-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${products.length} produits exportés en CSV ! 📊`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error("Erreur lors de l'export CSV");
    }
  };

  useEffect(() => {
    // Tester automatiquement le flux au chargement
    testFeed();
    fetchOptimizationScore();
    
    // Auto-refresh score every 10 seconds to catch external updates
    const interval = setInterval(() => {
      fetchOptimizationScore();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchOptimizationScore = async () => {
    try {
      // Fetch total products
      const { count: total } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true });

      // Fetch optimized products (with category, gtin, and white background)
      const { count: optimized } = await supabase
        .from('shopify_products')
        .select('*', { count: 'exact', head: true })
        .not('google_product_category', 'is', null)
        .not('google_gtin', 'is', null)
        .eq('google_white_background', true);

      setTotalProducts(total || 0);
      setDbProductCount(total || 0);
      const score = total && total > 0 ? Math.round((optimized || 0) / total * 100) : 0;
      setOptimizationScore(score);
    } catch (error) {
      console.error('Error fetching optimization score:', error);
    }
  };

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
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Google Merchant Center</h1>
              <p className="text-white/90 text-lg">
                Synchronisez vos produits avec Google Shopping pour maximiser votre visibilité
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge()}
              <div className="mt-2 flex items-baseline gap-2">
                {feedStatus.itemCount !== null && (
                  <span className="text-2xl font-bold">{feedStatus.itemCount}</span>
                )}
                {dbProductCount > 0 && (
                  <span className="text-sm text-white/70">({dbProductCount} en base)</span>
                )}
                <span className="text-sm text-white/70">produits</span>
              </div>
            </div>
          </div>

          {/* Optimization Score */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Score d'optimisation</span>
              <span className="text-2xl font-bold">{optimizationScore}%</span>
            </div>
            <Progress value={optimizationScore} className="h-2 bg-white/20" />
            <p className="text-xs text-white/70 mt-2">
              {totalProducts > 0 
                ? `${Math.round(totalProducts * optimizationScore / 100)} produits sur ${totalProducts} optimisés (Catégorie + GTIN + Fond blanc)`
                : 'Aucun produit à optimiser'
              }
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/shopping')}
              className="bg-white text-purple-600 hover:bg-white/90"
            >
              <Zap className="w-5 h-5 mr-2" />
              Optimiser tout
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={testFeed}
              disabled={isTesting}
              className="border-white text-white hover:bg-white/10"
            >
              {isTesting ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5 mr-2" />
              )}
              Tester le flux
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={regenerateFeed}
              disabled={regenerating}
              className="border-white text-white hover:bg-white/10"
            >
              {regenerating ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              Régénérer XML
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
      </div>

      {/* Warning Alert */}
      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <strong className="font-semibold">Enrichissez vos données Google Shopping</strong>
              <p className="mt-1 text-sm">
                Optimisez vos produits avec les catégories Google, GTIN, et fond blanc IA pour créer un flux optimisé et augmenter votre visibilité.
              </p>
            </div>
            <Button
              onClick={() => navigate('/shopping')}
              variant="default"
              size="sm"
              className="ml-4 gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Optimiser maintenant
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Status Card */}
      <Card className="p-6 border-l-4 border-l-primary">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Statut du Flux</h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Erreur: {feedStatus.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={testFeed} disabled={isTesting} variant="default" size="lg">
              <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? "animate-spin" : ""}`} />
              {isTesting ? "Test en cours..." : "Tester le flux"}
            </Button>

            {feedStatus.status === "success" && (
              <>
                <Button asChild variant="outline" size="lg">
                  <a href={directFeedUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger XML
                  </a>
                </Button>
                <Button onClick={exportToCSV} variant="outline" size="lg">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exporter CSV
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* URL Card */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-bold mb-1">URL du Flux XML</h3>
                <p className="text-sm text-muted-foreground">
                  Copiez cette URL pour Google Merchant Center
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">URL de votre flux Google Shopping</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={feedUrl} 
                    className="flex-1 font-mono text-sm bg-background"
                  />
                  <Button onClick={handleCopy} variant="default" size="lg">
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

              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Cette URL newai.sale fonctionnera après publication. En preview, le test utilise l'URL Supabase directe.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button asChild variant="default" size="lg">
                  <a href={directFeedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Prévisualiser le flux
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="https://business.google.com/fr/merchant-center/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Accéder à Merchant Center
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold">Format</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            XML Google Shopping Feed conforme aux spécifications officielles
          </p>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="font-semibold">Mise à jour</h4>
          </div>
          <p className="text-sm text-muted-foreground">Flux mis à jour automatiquement en temps réel</p>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="font-semibold">Planification</h4>
          </div>
          <p className="text-sm text-muted-foreground">Synchronisation quotidienne automatique</p>
        </Card>
      </div>
    </div>
  );
}
