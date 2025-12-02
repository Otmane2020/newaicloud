import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export function FacebookPageSelector({ 
  open, 
  onOpenChange, 
  pages, 
  userId,
  onSuccess 
}: FacebookPageSelectorProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPage = async (page: FacebookPage) => {
    setLoading(page.id);
    
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
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-[#1877F2]" />
            Sélectionnez une page Facebook
          </DialogTitle>
          <DialogDescription>
            {pages.length} pages trouvées. Choisissez celle à connecter pour publier automatiquement vos articles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              disabled={loading !== null}
              className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold">
                  {page.name?.[0]?.toUpperCase() || 'F'}
                </div>
                <div className="text-left">
                  <p className="font-medium">{page.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {page.id}</p>
                </div>
              </div>
              
              {loading === page.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Check className="h-5 w-5 text-muted-foreground/30" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
