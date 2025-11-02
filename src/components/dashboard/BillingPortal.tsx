import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/language";

export function BillingPortal() {
  const { toast } = useToast();
  const { t } = useTranslation();
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
        title: "Error",
        description: t.account.billing.error,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.billing.title}</CardTitle>
        <CardDescription>
          {t.account.billing.description}
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
              {t.account.billing.loading}
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t.account.billing.openPortal}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {t.account.billing.redirectInfo}
        </p>
      </CardContent>
    </Card>
  );
}