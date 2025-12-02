import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Facebook, FileText, Package, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ShareFacebookTest() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productCaption, setProductCaption] = useState<string>("");
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fbConnection, setFbConnection] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch articles
    const { data: articlesData } = await supabase
      .from("blog_articles")
      .select("id, title, featured_image, meta_description")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (articlesData) setArticles(articlesData);

    // Fetch products
    const { data: productsData } = await supabase
      .from("shopify_products")
      .select("id, title, seo_description")
      .eq("seller_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (productsData) setProducts(productsData);

    // Fetch FB connection
    const { data: fbData } = await supabase
      .from("facebook_page_connections")
      .select("*")
      .eq("user_id", user?.id)
      .eq("auto_share_enabled", true)
      .maybeSingle();
    
    setFbConnection(fbData);
  };

  // When product selected, fetch its image
  useEffect(() => {
    if (selectedProduct) {
      fetchProductImage();
    }
  }, [selectedProduct]);

  const fetchProductImage = async () => {
    const { data: images } = await supabase
      .from("product_images")
      .select("src")
      .eq("product_id", selectedProduct)
      .order("position", { ascending: true })
      .limit(1);
    
    if (images && images.length > 0) {
      setProductImageUrl(images[0].src);
    }

    const product = products.find(p => p.id === selectedProduct);
    if (product) {
      setProductCaption(product.seo_description || `Découvrez ${product.title}`);
    }
  };

  const handleShareArticle = async () => {
    if (!selectedArticle) {
      toast.error("Sélectionnez un article");
      return;
    }

    if (!fbConnection) {
      toast.error("Aucune page Facebook connectée");
      return;
    }

    setLoadingArticle(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("share-article-facebook", {
        body: { articleId: selectedArticle },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`
        }
      });

      console.log("Article share response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors du partage");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Article partagé sur Facebook!", {
        description: `Post ID: ${response.data?.postId}`
      });
    } catch (error: any) {
      console.error("Share article error:", error);
      toast.error("Erreur", { description: error.message });
    } finally {
      setLoadingArticle(false);
    }
  };

  const handleShareProduct = async () => {
    if (!selectedProduct) {
      toast.error("Sélectionnez un produit");
      return;
    }

    if (!productImageUrl) {
      toast.error("URL d'image requise");
      return;
    }

    if (!productCaption) {
      toast.error("Caption requise");
      return;
    }

    if (!fbConnection) {
      toast.error("Aucune page Facebook connectée");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);

    setLoadingProduct(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("share-article-facebook", {
        body: { 
          productId: selectedProduct,
          imageUrl: productImageUrl,
          caption: productCaption,
          productTitle: product?.title
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`
        }
      });

      console.log("Product share response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors du partage");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Produit partagé sur Facebook!", {
        description: `Post ID: ${response.data?.postId}`
      });
    } catch (error: any) {
      console.error("Share product error:", error);
      toast.error("Erreur", { description: error.message });
    } finally {
      setLoadingProduct(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link to="/social-media" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Retour Social Media
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Test Partage Facebook</h1>
      <p className="text-muted-foreground mb-8">
        Page de test pour vérifier les fonctions de partage Facebook
      </p>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Statut Connexion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fbConnection ? (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="font-medium text-green-600">✅ Connecté à: {fbConnection.page_name}</p>
              <p className="text-sm text-muted-foreground">Page ID: {fbConnection.page_id}</p>
            </div>
          ) : (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="font-medium text-red-600">❌ Aucune page Facebook connectée</p>
              <p className="text-sm text-muted-foreground">
                Connectez une page dans l'onglet Social Media
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Share Article */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Partager Article
            </CardTitle>
            <CardDescription>
              Teste le partage d'un article de blog
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sélectionner un article</Label>
              <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un article..." />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedArticle && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">Aperçu:</p>
                <p className="text-muted-foreground">
                  {articles.find(a => a.id === selectedArticle)?.meta_description || "Pas de description"}
                </p>
              </div>
            )}

            <Button 
              onClick={handleShareArticle} 
              disabled={loadingArticle || !fbConnection}
              className="w-full"
            >
              {loadingArticle ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Facebook className="h-4 w-4 mr-2" />
              )}
              Partager sur Facebook
            </Button>
          </CardContent>
        </Card>

        {/* Share Product */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Partager Produit
            </CardTitle>
            <CardDescription>
              Teste le partage d'un produit (Quick Post)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Sélectionner un produit</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un produit..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>URL Image</Label>
              <Input 
                value={productImageUrl} 
                onChange={(e) => setProductImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Caption</Label>
              <Textarea 
                value={productCaption}
                onChange={(e) => setProductCaption(e.target.value)}
                placeholder="Texte du post..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleShareProduct} 
              disabled={loadingProduct || !fbConnection}
              className="w-full"
            >
              {loadingProduct ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Facebook className="h-4 w-4 mr-2" />
              )}
              Partager sur Facebook
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
{JSON.stringify({
  userId: user?.id,
  articlesCount: articles.length,
  productsCount: products.length,
  fbConnection: fbConnection ? {
    pageId: fbConnection.page_id,
    pageName: fbConnection.page_name,
    autoShareEnabled: fbConnection.auto_share_enabled
  } : null
}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
