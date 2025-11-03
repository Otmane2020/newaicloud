import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Database, Eye, Download, Sparkles, TrendingUp, Package, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductSourceData {
  id: string;
  title: string;
  image_url: string | null;
  ai_color: string | null;
  ai_material: string | null;
  ai_shape: string | null;
  ai_texture: string | null;
  ai_pattern: string | null;
  ai_finish: string | null;
  ai_design_elements: string | null;
  ai_vision_analysis: string | null;
  ai_vision_model: string | null;
  ai_vision_timestamp: string | null;
  ai_vision_confidence: number | null;
  ai_presentation_quality: number | null;
  ai_craftsmanship_level: string | null;
  ai_lighting_type: string | null;
  ai_background_style: string | null;
  ai_condition_notes: string | null;
  smart_length: number | null;
  smart_length_unit: string | null;
  smart_width: number | null;
  smart_width_unit: string | null;
  smart_height: number | null;
  smart_height_unit: string | null;
  smart_diameter: number | null;
  smart_diameter_unit: string | null;
  smart_depth: number | null;
  smart_depth_unit: string | null;
  smart_weight: number | null;
  smart_weight_unit: string | null;
  smart_seat_height: number | null;
  smart_seat_height_unit: string | null;
  category: string | null;
  sub_category: string | null;
  style: string | null;
  room: string | null;
  functionality: string | null;
  characteristics: string | null;
  enrichment_status: string;
  last_enriched_at: string | null;
  chat_text: string | null;
}

const ProductSource = () => {
  const { user } = useAuth();
  const { t, tf } = useTranslation();
  const [products, setProducts] = useState<ProductSourceData[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductSourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductSourceData | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, statusFilter, categoryFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopify_products")
        .select("*")
        .eq("seller_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(t.seo.productSource.errors.loadProducts, {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(p => p.enrichment_status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(filteredProducts, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `produits-enrichis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t.seo.productSource.success.dataExported);
  };

  const handleEnrichProduct = async (productId: string) => {
    try {
      toast.info("Enrichissement en cours...");
      
      const { data, error } = await supabase.functions.invoke('enrich-product', {
        body: { productId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t.seo.productSource.success.productEnriched);
        await loadProducts();
        
        // Update selected product if it's the one being enriched
        if (selectedProduct?.id === productId) {
          const { data: updatedProduct, error: fetchError } = await supabase
            .from("shopify_products")
            .select("*")
            .eq("id", productId)
            .single();
          
          if (!fetchError && updatedProduct) {
            setSelectedProduct(updatedProduct);
          }
        }
      } else {
        throw new Error(data?.error || t.seo.productSource.errors.enrichProduct);
      }
    } catch (error: any) {
      console.error("Error enriching product:", error);
      toast.error(error.message || t.seo.productSource.errors.enrichProduct);
    }
  };

  const handleEnrichAll = async () => {
    const pendingProducts = products.filter(p => p.enrichment_status === "pending");
    
    if (pendingProducts.length === 0) {
      toast.info(t.seo.productSource.info.allEnriched);
      return;
    }

    setEnriching(true);
    toast.info(tf('seo.productSource.info.enriching', { count: pendingProducts.length }));
    
    for (const product of pendingProducts) {
      await handleEnrichProduct(product.id);
    }
    setEnriching(false);
  };

  const handleEnrichSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.info(t.seo.productSource.info.noSelection);
      return;
    }

    setEnriching(true);
    toast.info(tf('seo.productSource.info.enriching', { count: selectedProducts.size }));
    
    for (const productId of Array.from(selectedProducts)) {
      await handleEnrichProduct(productId);
    }
    setSelectedProducts(new Set());
    setEnriching(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.size === 0) {
      toast.info(t.seo.productSource.info.noSelection);
      return;
    }

    try {
      const { error } = await supabase
        .from("shopify_products")
        .delete()
        .in("id", Array.from(selectedProducts));

      if (error) throw error;

      toast.success(tf('seo.productSource.success.productsDeleted', { count: selectedProducts.size }));
      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error: any) {
      toast.error(error.message || t.seo.productSource.errors.deleteProducts);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Titre", "Catégorie", "Couleur", "Matériau", "Forme", 
      "Longueur", "Largeur", "Hauteur", "Qualité", "Status"
    ];
    
    const rows = filteredProducts.map(p => [
      p.title,
      p.category || "",
      p.ai_color || "",
      p.ai_material || "",
      p.ai_shape || "",
      p.smart_length ? `${p.smart_length} ${p.smart_length_unit}` : "",
      p.smart_width ? `${p.smart_width} ${p.smart_width_unit}` : "",
      p.smart_height ? `${p.smart_height} ${p.smart_height_unit}` : "",
      p.ai_presentation_quality || "",
      p.enrichment_status
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-enriched-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t.seo.productSource.success.csvExported);
  };

  const enrichedCount = products.filter(p => p.enrichment_status === "enriched").length;
  const enrichmentRate = products.length > 0 ? (enrichedCount / products.length) * 100 : 0;
  const avgQuality = products.filter(p => p.ai_presentation_quality).reduce((sum, p) => sum + (p.ai_presentation_quality || 0), 0) / enrichedCount || 0;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            {t.seo.productSource.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.seo.productSource.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <>
              <Button onClick={handleEnrichSelected} variant="default" disabled={enriching}>
                <Sparkles className="w-4 h-4 mr-2" />
                {tf('seo.productSource.actions.enrichSelection', { count: selectedProducts.size })}
              </Button>
              <Button onClick={handleDeleteSelected} variant="destructive">
                {tf('seo.productSource.actions.deleteSelection', { count: selectedProducts.size })}
              </Button>
            </>
          )}
          <Button onClick={handleEnrichAll} variant="secondary" disabled={enriching}>
            <Sparkles className="w-4 h-4 mr-2" />
            {enriching ? t.seo.productSource.actions.enriching : t.seo.productSource.actions.enrichAll}
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t.seo.productSource.actions.exportCSV}
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t.seo.productSource.actions.exportJSON}
          </Button>
          <Button onClick={loadProducts} disabled={enriching}>
            <TrendingUp className="w-4 h-4 mr-2" />
            {t.seo.productSource.actions.refresh}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taux d'enrichissement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrichmentRate.toFixed(1)}%</div>
            <Progress value={enrichmentRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qualité Moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgQuality.toFixed(1)}/10</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Vision AI Actif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.ai_vision_model).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium">
                Tout sélectionner ({selectedProducts.size}/{filteredProducts.length})
              </span>
            </div>
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="enriched">Enrichis</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">
              {filteredProducts.length} produit(s) affiché(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow relative">
            <div className="absolute top-4 left-4 z-10">
              <Checkbox
                checked={selectedProducts.has(product.id)}
                onCheckedChange={() => toggleProductSelection(product.id)}
                className="bg-card"
              />
            </div>
            <CardHeader>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
              <div className="flex gap-1 mt-2">
                <Badge variant={product.enrichment_status === "enriched" ? "default" : "secondary"}>
                  {product.enrichment_status}
                </Badge>
                {product.ai_vision_model && (
                  <Badge variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    Vision AI
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* AI Attributes */}
              <div className="space-y-2">
                {product.ai_color && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">🎨 Couleur:</span>
                    <Badge variant="outline">{product.ai_color}</Badge>
                  </div>
                )}
                {product.ai_material && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">🔧 Matériau:</span>
                    <Badge variant="outline">{product.ai_material}</Badge>
                  </div>
                )}
                {product.ai_shape && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">📐 Forme:</span>
                    <Badge variant="outline">{product.ai_shape}</Badge>
                  </div>
                )}
              </div>

              {/* Dimensions */}
              {(product.smart_length || product.smart_width || product.smart_height) && (
                <div className="text-sm">
                  <div className="text-muted-foreground mb-1">📏 Dimensions:</div>
                  <div className="flex flex-wrap gap-2">
                    {product.smart_length && (
                      <span className="text-xs">L: {product.smart_length}{product.smart_length_unit}</span>
                    )}
                    {product.smart_width && (
                      <span className="text-xs">l: {product.smart_width}{product.smart_width_unit}</span>
                    )}
                    {product.smart_height && (
                      <span className="text-xs">H: {product.smart_height}{product.smart_height_unit}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Quality Score */}
              {product.ai_presentation_quality && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">✨ Qualité:</span>
                    <span className="font-medium">{product.ai_presentation_quality}/10</span>
                  </div>
                  <Progress value={product.ai_presentation_quality * 10} />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {product.enrichment_status !== "enriched" && (
                  <Button
                    size="sm"
                    onClick={() => handleEnrichProduct(product.id)}
                    className="flex-1"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Enrichir IA
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Détails
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{product.title}</DialogTitle>
                  </DialogHeader>
                  {selectedProduct && (
                    <Tabs defaultValue="attributes" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="attributes">Attributs IA</TabsTrigger>
                        <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                        <TabsTrigger value="vision">Vision AI</TabsTrigger>
                        <TabsTrigger value="category">Catégorie</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="attributes" className="space-y-4">
                        {selectedProduct.image_url && (
                          <img 
                            src={selectedProduct.image_url} 
                            alt={selectedProduct.title}
                            className="w-full h-64 object-cover rounded-lg"
                          />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Couleur</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_color || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Matériau</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_material || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Forme</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_shape || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Texture</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_texture || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Motif</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_pattern || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Finition</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_finish || "N/A"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Éléments de design</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.ai_design_elements || "N/A"}</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="dimensions" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {selectedProduct.smart_length && (
                            <div>
                              <p className="text-sm font-medium">Longueur</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_length} {selectedProduct.smart_length_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_width && (
                            <div>
                              <p className="text-sm font-medium">Largeur</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_width} {selectedProduct.smart_width_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_height && (
                            <div>
                              <p className="text-sm font-medium">Hauteur</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_height} {selectedProduct.smart_height_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_diameter && (
                            <div>
                              <p className="text-sm font-medium">Diamètre</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_diameter} {selectedProduct.smart_diameter_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_depth && (
                            <div>
                              <p className="text-sm font-medium">Profondeur</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_depth} {selectedProduct.smart_depth_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_weight && (
                            <div>
                              <p className="text-sm font-medium">Poids</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_weight} {selectedProduct.smart_weight_unit}
                              </p>
                            </div>
                          )}
                          {selectedProduct.smart_seat_height && (
                            <div>
                              <p className="text-sm font-medium">Hauteur d'assise</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.smart_seat_height} {selectedProduct.smart_seat_height_unit}
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="vision" className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium">Analyse Vision AI</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {selectedProduct.ai_vision_analysis || "Aucune analyse disponible"}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium">Modèle utilisé</p>
                              <p className="text-sm text-muted-foreground">{selectedProduct.ai_vision_model || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Confiance</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.ai_vision_confidence ? `${selectedProduct.ai_vision_confidence}%` : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Qualité de présentation</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedProduct.ai_presentation_quality ? `${selectedProduct.ai_presentation_quality}/10` : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Niveau d'artisanat</p>
                              <p className="text-sm text-muted-foreground">{selectedProduct.ai_craftsmanship_level || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Type d'éclairage</p>
                              <p className="text-sm text-muted-foreground">{selectedProduct.ai_lighting_type || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Style de fond</p>
                              <p className="text-sm text-muted-foreground">{selectedProduct.ai_background_style || "N/A"}</p>
                            </div>
                          </div>
                          {selectedProduct.ai_condition_notes && (
                            <div>
                              <p className="text-sm font-medium">Notes sur l'état</p>
                              <p className="text-sm text-muted-foreground">{selectedProduct.ai_condition_notes}</p>
                            </div>
                          )}
                          {selectedProduct.ai_vision_timestamp && (
                            <div>
                              <p className="text-sm font-medium">Date d'analyse</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(selectedProduct.ai_vision_timestamp).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="category" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">Catégorie</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.category || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Sous-catégorie</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.sub_category || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Style</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.style || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Pièce</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.room || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Fonctionnalité</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.functionality || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Caractéristiques</p>
                            <p className="text-sm text-muted-foreground">{selectedProduct.characteristics || "N/A"}</p>
                          </div>
                        </div>
                        {selectedProduct.chat_text && (
                          <div>
                            <p className="text-sm font-medium">Texte optimisé pour le chat</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProduct.chat_text}</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucun produit trouvé</p>
            <p className="text-sm text-muted-foreground">
              Essayez de modifier vos filtres de recherche
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductSource;
