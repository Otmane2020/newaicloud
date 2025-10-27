import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, FileText, Sparkles, CheckCircle } from 'lucide-react';

interface ShopifyPage {
  id: string;
  title: string;
  handle: string;
  body_html: string;
  seo_title: string | null;
  seo_description: string | null;
  optimized: boolean;
}

export function PageOptimization() {
  const [pages, setPages] = useState<ShopifyPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      // For now, show empty state - will be implemented with Shopify pages import
      setPages([]);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Erreur lors du chargement des pages');
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter((page) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return page.title.toLowerCase().includes(term);
  });

  const handleSelectAll = () => {
    if (selectedPages.size === filteredPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(filteredPages.map((p) => p.id)));
    }
  };

  const handleSelectPage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <Card className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950 dark:via-blue-950 dark:to-cyan-950 border-2 border-indigo-200 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Optimisation des Pages
              </h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Optimisez le référencement de vos pages Shopify avec des meta tags générés par IA
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{pages.length}</p>
              <p className="text-sm text-muted-foreground">Total pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-success">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-success" />
            <div>
              <p className="text-2xl font-bold">{pages.filter(p => p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">Optimisées</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-warning">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{pages.filter(p => !p.optimized).length}</p>
              <p className="text-sm text-muted-foreground">À optimiser</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher une page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={pages.length === 0}
            >
              {selectedPages.size === filteredPages.length ? 'Désélectionner' : 'Tout sélectionner'}
            </Button>
            <Button
              size="sm"
              disabled={selectedPages.size === 0}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Optimiser ({selectedPages.size})
            </Button>
          </div>
        </div>
      </Card>

      {/* Pages List */}
      {pages.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucune page trouvée</h3>
          <p className="text-muted-foreground mb-6">
            Connectez votre boutique Shopify pour importer vos pages
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPages.map((page) => (
            <Card key={page.id} className="p-4 hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedPages.has(page.id)}
                  onChange={() => handleSelectPage(page.id)}
                  className="w-5 h-5"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{page.title}</h3>
                  <p className="text-sm text-muted-foreground">/{page.handle}</p>
                  {page.seo_title && (
                    <p className="text-xs text-green-600 mt-1">✓ SEO optimisé</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={page.optimized ? 'default' : 'secondary'}>
                    {page.optimized ? 'Optimisé' : 'En attente'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
