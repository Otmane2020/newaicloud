import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingConnection {
  id: string;
  shop_url: string;
  commercial_name: string;
  pending_token: string;
  expires_at: string;
  created_at: string;
  status: 'active' | 'expiring_soon' | 'expired';
  hours_until_expiry: number;
}

export default function ShopifyRecover() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pendingConnections, setPendingConnections] = useState<PendingConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingTokens, setClaimingTokens] = useState<Set<string>>(new Set());
  const tokenFromUrl = searchParams.get('token');

  useEffect(() => {
    loadPendingConnections();
  }, []);

  const loadPendingConnections = async () => {
    try {
      setIsLoading(true);
      
      // Si un token est passé dans l'URL, essayer de le claim directement
      if (tokenFromUrl) {
        await handleClaim(tokenFromUrl);
        return;
      }

      // Charger toutes les pending connections de l'utilisateur
      const { data, error } = await supabase
        .from('shopify_pending_connections_status')
        .select('*')
        .eq('is_claimed', false)
        .order('expires_at', { ascending: true });

      if (error) throw error;

      // Cast le status au bon type
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'active' | 'expiring_soon' | 'expired'
      }));

      setPendingConnections(typedData);
    } catch (error) {
      console.error("Error loading pending connections:", error);
      toast.error("Erreur de chargement", {
        description: "Impossible de charger les connexions en attente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async (pendingToken: string) => {
    setClaimingTokens(prev => new Set(prev).add(pendingToken));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("Authentification requise", {
          description: "Veuillez vous connecter pour finaliser la connexion."
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'claim-shopify-connection',
        { 
          body: { pendingToken },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (error) throw error;

      toast.success("Boutique connectée avec succès !", {
        description: data.message || "Vos produits sont en cours d'importation."
      });

      // Recharger la liste ou rediriger
      if (tokenFromUrl) {
        setTimeout(() => navigate('/integration'), 1500);
      } else {
        await loadPendingConnections();
      }

    } catch (error: any) {
      console.error("Error claiming connection:", error);
      
      const errorMessage = error.message || '';
      if (errorMessage.includes('expired') || errorMessage.includes('Token expired')) {
        toast.error("Token expiré", {
          description: "Ce lien d'installation a expiré. Réinstallez l'application depuis Shopify."
        });
      } else if (errorMessage.includes('Invalid or expired token')) {
        toast.error("Token invalide", {
          description: "Ce lien est invalide ou a déjà été utilisé."
        });
      } else {
        toast.error("Échec de la connexion", {
          description: errorMessage || "Veuillez réessayer ou contacter le support."
        });
      }
    } finally {
      setClaimingTokens(prev => {
        const next = new Set(prev);
        next.delete(pendingToken);
        return next;
      });
    }
  };

  const getStatusBadge = (connection: PendingConnection) => {
    switch (connection.status) {
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Expiré</Badge>;
      case 'expiring_soon':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> Expire bientôt</Badge>;
      case 'active':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Actif</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des connexions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Récupération de connexions Shopify</h1>
          <p className="text-muted-foreground">
            Finalisez vos connexions Shopify en attente avant leur expiration.
          </p>
        </div>

        {pendingConnections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Aucune connexion en attente</p>
              <p className="text-muted-foreground text-center mb-6">
                Toutes vos connexions Shopify sont finalisées ou expirées.
              </p>
              <Button onClick={() => navigate('/integration')}>
                Aller aux intégrations
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingConnections.map((connection) => (
              <Card key={connection.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {connection.commercial_name || connection.shop_url}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {connection.shop_url}
                      </CardDescription>
                    </div>
                    {getStatusBadge(connection)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Créé:</span>
                      <span className="font-medium">
                        {format(new Date(connection.created_at), 'PPp', { locale: fr })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Expire:</span>
                      <span className={`font-medium ${
                        connection.status === 'expired' ? 'text-destructive' : 
                        connection.status === 'expiring_soon' ? 'text-orange-500' : ''
                      }`}>
                        {connection.status === 'expired' 
                          ? 'Expiré'
                          : formatDistanceToNow(new Date(connection.expires_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })
                        }
                      </span>
                    </div>
                  </div>

                  {connection.status !== 'expired' && (
                    <Button 
                      onClick={() => handleClaim(connection.pending_token)}
                      disabled={claimingTokens.has(connection.pending_token)}
                      className="w-full gap-2"
                    >
                      {claimingTokens.has(connection.pending_token) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Finaliser la connexion
                        </>
                      )}
                    </Button>
                  )}

                  {connection.status === 'expired' && (
                    <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                      <p className="text-sm text-destructive">
                        Cette connexion a expiré. Veuillez réinstaller l'application depuis votre tableau de bord Shopify Partner.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}