import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Facebook, Instagram, Loader2, Trash2, Check, Lock } from "lucide-react";
import { FacebookPageSelector } from "./FacebookPageSelector";

interface SocialConnectionsProps {
  userId?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  token: string;
}

const SocialConnections = ({ userId }: SocialConnectionsProps) => {
  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<'facebook' | 'instagram' | null>(null);
  
  // React page selector state
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadConnections();
    }
  }, [userId]);

  const loadConnections = async () => {
    try {
      const [fbResult, igResult] = await Promise.all([
        supabase
          .from('facebook_page_connections')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('instagram_account_connections')
          .select('*')
          .eq('user_id', userId)
      ]);

      setFacebookPages(fbResult.data || []);
      setInstagramAccounts(igResult.data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectFacebook = async () => {
    setConnecting('facebook');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-page-oauth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'connect' }),
        }
      );

      const data = await response.json();

      if (data.authUrl) {
        // Redirect directly - no popup needed since we use URL redirects now
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Erreur de connexion');
      }
    } catch (error: any) {
      toast.error(error.message);
      setConnecting(null);
    }
  };

  const handlePageSelectorSuccess = (pageName: string, instagramName?: string | null) => {
    loadConnections();
  };

  const toggleAutoShare = async (type: 'facebook' | 'instagram', id: string, currentValue: boolean) => {
    try {
      const table = type === 'facebook' ? 'facebook_page_connections' : 'instagram_account_connections';
      
      const { error } = await supabase
        .from(table)
        .update({ auto_share_enabled: !currentValue })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentValue ? 'Auto-partage désactivé' : 'Auto-partage activé');
      loadConnections();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const disconnectAccount = async (type: 'facebook' | 'instagram', id: string) => {
    if (!confirm('Déconnecter ce compte ?')) return;

    try {
      const table = type === 'facebook' ? 'facebook_page_connections' : 'instagram_account_connections';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Compte déconnecté');
      loadConnections();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Facebook Page Selector Dialog */}
      <FacebookPageSelector
        open={showPageSelector}
        onOpenChange={setShowPageSelector}
        pages={availablePages}
        userId={pendingUserId || ''}
        onSuccess={handlePageSelectorSuccess}
      />

      {/* Facebook Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Facebook Pages</CardTitle>
                <CardDescription>
                  Connectez vos pages Facebook pour publier automatiquement
                </CardDescription>
              </div>
            </div>
            {facebookPages.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  Connecté
                </div>
                <Button
                  onClick={connectFacebook}
                  disabled={connecting === 'facebook'}
                  variant="outline"
                  size="sm"
                >
                  {connecting === 'facebook' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Ajouter'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={connectFacebook}
                disabled={connecting === 'facebook'}
              >
                {connecting === 'facebook' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4 mr-2" />
                )}
                Connecter Facebook
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {facebookPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Facebook className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Aucune page Facebook connectée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {facebookPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {page.page_name?.[0]?.toUpperCase() || 'F'}
                    </div>
                    <div>
                      <p className="font-medium">{page.page_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {page.page_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Auto-post</span>
                      <Switch
                        checked={page.auto_share_enabled}
                        onCheckedChange={() => toggleAutoShare('facebook', page.id, page.auto_share_enabled)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnectAccount('facebook', page.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instagram Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Instagram Business</CardTitle>
                <CardDescription>
                  Connecté automatiquement via vos pages Facebook
                </CardDescription>
              </div>
            </div>
            {instagramAccounts.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <Lock className="h-3.5 w-3.5" />
                {instagramAccounts.length} compte{instagramAccounts.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {instagramAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Instagram className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground mb-4">
                {facebookPages.length === 0 
                  ? "Connectez d'abord une page Facebook pour détecter votre Instagram Business"
                  : "Aucun compte Instagram Business détecté sur vos pages Facebook"
                }
              </p>
              {facebookPages.length === 0 ? (
                <Button onClick={connectFacebook} disabled={connecting === 'facebook'}>
                  {connecting === 'facebook' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Facebook className="h-4 w-4 mr-2" />
                  )}
                  Connecter Facebook
                </Button>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium mb-2">💡 Instagram non détecté ?</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Vérifiez que votre compte Instagram est de type "Business" ou "Créateur"</li>
                    <li>Liez votre Instagram à votre page Facebook dans les paramètres Facebook/Meta Business Suite</li>
                    <li>Reconnectez votre page Facebook ci-dessus</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {instagramAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {account.account_name?.[0]?.toUpperCase() || 'I'}
                    </div>
                    <div>
                      <p className="font-medium">@{account.account_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {account.account_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Auto-post</span>
                      <Switch
                        checked={account.auto_share_enabled}
                        onCheckedChange={() => toggleAutoShare('instagram', account.id, account.auto_share_enabled)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => disconnectAccount('instagram', account.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">ℹ️ Comment ça marche ?</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Connectez votre page Facebook pour publier des posts avec images</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Si votre page Facebook est liée à un compte Instagram Business, il sera automatiquement connecté</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Activez l'auto-post pour publier automatiquement les nouveaux articles</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialConnections;
