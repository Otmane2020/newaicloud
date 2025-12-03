import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Loader2, Check, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface FacebookPage {
  id: string;
  name: string;
  token: string;
}

interface FacebookPageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: FacebookPage[];
  userId: string;
  onSuccess: (pageName: string, instagramName?: string | null) => void;
  multiSelect?: boolean; // Allow multiple page selection
}

export function FacebookPageSelector({ 
  open, 
  onOpenChange, 
  pages, 
  userId,
  onSuccess,
  multiSelect = true // Default to multi-select
}: FacebookPageSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  const togglePage = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const selectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map(p => p.id)));
    }
  };

  const handleSavePages = async () => {
    if (selectedPages.size === 0) {
      toast.error('Veuillez sélectionner au moins une page');
      return;
    }

    setLoading(true);
    
    try {
      const selectedPagesList = pages.filter(p => selectedPages.has(p.id));
      let successCount = 0;
      let lastPageName = '';
      let lastInstagramName: string | null = null;

      for (const page of selectedPagesList) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-page-oauth`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_page',
              userId,
              pageId: page.id,
              pageToken: page.token,
              pageName: page.name
            })
          }
        );

        const result = await response.json();

        if (result.success) {
          successCount++;
          lastPageName = result.pageName;
          lastInstagramName = result.instagramName;
        }
      }

      if (successCount > 0) {
        const message = successCount > 1 
          ? `${successCount} pages Facebook connectées avec succès !`
          : `Page "${lastPageName}" connectée avec succès !`;
        toast.success(message);
        onSuccess(lastPageName, lastInstagramName);
        onOpenChange(false);
      } else {
        toast.error('Erreur lors de la connexion des pages');
      }
    } catch (error: any) {
      console.error('Error saving pages:', error);
      toast.error('Erreur de connexion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Single page selection (legacy mode)
  const handleSelectSinglePage = async (page: FacebookPage) => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-page-oauth`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_page',
            userId,
            pageId: page.id,
            pageToken: page.token,
            pageName: page.name
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Page connectée avec succès !');
        onSuccess(result.pageName, result.instagramName);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Erreur lors de la connexion');
      }
    } catch (error: any) {
      console.error('Error saving page:', error);
      toast.error('Erreur de connexion: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            Sélectionnez vos pages Facebook
          </DialogTitle>
          <DialogDescription>
            {pages.length} pages trouvées. {multiSelect ? 'Sélectionnez les pages à connecter pour le partage automatique.' : 'Choisissez celle à connecter.'}
          </DialogDescription>
        </DialogHeader>
        
        {multiSelect && (
          <div className="flex items-center justify-between border-b pb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={selectAll}
              className="text-sm"
            >
              {selectedPages.size === pages.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Tout sélectionner
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedPages.size} / {pages.length} sélectionnées
            </span>
          </div>
        )}
        
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 py-2 pr-4">
            {pages.map((page) => (
              <div
                key={page.id}
                onClick={() => multiSelect ? togglePage(page.id) : handleSelectSinglePage(page)}
                className={`w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-all cursor-pointer ${
                  selectedPages.has(page.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {multiSelect && (
                    <Checkbox 
                      checked={selectedPages.has(page.id)}
                      onCheckedChange={() => togglePage(page.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold">
                    {page.name?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{page.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {page.id}</p>
                  </div>
                </div>
                
                {!multiSelect && (
                  loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Check className="h-5 w-5 text-muted-foreground/30" />
                  )
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {multiSelect && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button 
              onClick={handleSavePages} 
              disabled={loading || selectedPages.size === 0}
              className="bg-[#1877F2] hover:bg-[#1877F2]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Connecter {selectedPages.size > 0 ? `(${selectedPages.size})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
