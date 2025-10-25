import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

export function BillingPortal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleOpenPortal = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail de facturation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturation</CardTitle>
        <CardDescription>
          Gérez vos moyens de paiement et consultez vos factures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleOpenPortal}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ouverture...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir le portail de facturation
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Vous serez redirigé vers le portail Stripe pour gérer vos informations de paiement et télécharger vos factures.
        </p>
      </CardContent>
    </Card>
  );
}
