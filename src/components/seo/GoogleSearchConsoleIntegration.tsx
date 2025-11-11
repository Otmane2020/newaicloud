import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';
import {
  Globe,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  BarChart3,
} from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

interface GoogleSearchConsoleIntegrationProps {
  isConnected: boolean;
  googleConsoleEmail: string | null;
  selectedDomain: string;
  onDomainSelect: (domain: string) => void;
  onConnectionChange: () => void;
}

export function GoogleSearchConsoleIntegration({
  isConnected,
  googleConsoleEmail,
  selectedDomain,
  onDomainSelect,
  onConnectionChange
}: GoogleSearchConsoleIntegrationProps) {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showAddDomainDialog, setShowAddDomainDialog] = useState(false);
  const [showAvailableSitesDialog, setShowAvailableSitesDialog] = useState(false);
  const [availableSites, setAvailableSites] = useState<string[]>([]);
  const [loadingAvailableSites, setLoadingAvailableSites] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    if (isConnected) {
      loadDomains();
    }
  }, [isConnected]);

  const loadDomains = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_search_console_domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDomains(data || []);
      if (data && data.length > 0 && !selectedDomain) {
        onDomainSelect(data[0].domain);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    }
  };

  const connectWithGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/seo?tab=google-console`;
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('google-oauth-url', {
        body: { redirectUri },
      });
      
      if (urlError || !urlData?.url) {
        throw new Error('Failed to generate OAuth URL');
      }
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        urlData.url,
        'Google Search Console Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      if (!popup) {
        toast.error('Veuillez autoriser les popups pour ce site');
        return;
      }
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage);
          
          const { data, error } = await supabase.functions.invoke('google-oauth-token', {
            body: {
              code: event.data.code,
              state: redirectUri,
            },
          });
          
          if (error || !data?.success) {
            console.error('Error exchanging code:', error);
            toast.error('Erreur lors de la connexion à Google');
            return;
          }
          
          toast.success('Connexion à Google Search Console réussie !');
          onConnectionChange();
          await loadDomains();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erreur lors de la connexion à Google');
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          google_oauth_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
          google_console_email: null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Google Search Console déconnecté avec succès');
      onConnectionChange();
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Impossible de déconnecter Google Search Console');
    }
  };

  const checkAvailableSites = async () => {
    try {
      setLoadingAvailableSites(true);
      const { data, error } = await supabase.functions.invoke('list-search-console-sites');

      if (error) throw error;

      if (data?.sites && data.sites.length > 0) {
        const siteUrls = data.sites.map((s: any) => s.siteUrl.replace('sc-domain:', ''));
        setAvailableSites(siteUrls);
        setShowAvailableSitesDialog(true);
      } else {
        toast.error('Aucun site trouvé dans votre Google Search Console');
      }
    } catch (error) {
      console.error('Error fetching available sites:', error);
      toast.error('Erreur lors de la récupération des sites disponibles');
    } finally {
      setLoadingAvailableSites(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Veuillez saisir un domaine');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('google_search_console_domains')
        .insert({
          user_id: user.id,
          domain: newDomain.trim(),
        });

      if (error) throw error;

      toast.success('Domaine ajouté avec succès');
      setNewDomain('');
      setShowAddDomainDialog(false);
      await loadDomains();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Erreur lors de l\'ajout du domaine');
    }
  };

  const removeDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('google_search_console_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Domaine supprimé');
      if (selectedDomain === domains.find(d => d.id === domainId)?.domain) {
        onDomainSelect('');
      }
      loadDomains();
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Globe className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Connecter Console Google Search</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connectez votre compte Google pour importer les données Search Console
              et suivre l'évolution de votre trafic et l'impact de vos optimisations SEO.
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={connectWithGoogle}
              size="lg"
              className="gap-2"
            >
              <Globe className="h-5 w-5" />
              {t.seo.googleSearchConsole.connectWithGoogle}
            </Button>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Analyse de performance SEO</p>
              <p>✓ Évolution du trafic par période</p>
              <p>✓ Support multi-domaines</p>
              <p>✓ Mesure de l'impact des optimisations</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection info card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Connexion Google</h3>
            {googleConsoleEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span>Connecté avec : <span className="font-medium text-foreground">{googleConsoleEmail}</span></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkAvailableSites}
              disabled={loadingAvailableSites}
              className="gap-2"
            >
              {loadingAvailableSites ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Mes sites
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectGoogle}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Déconnecter
            </Button>
          </div>
        </div>
      </Card>

      {/* Domain management */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <Label>Domaines connectés</Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDomainDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter domaine
            </Button>
          </div>
          
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun domaine configuré</p>
              <p className="text-sm">Ajoutez votre premier domaine pour commencer</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedDomain === domain.domain
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onDomainSelect(domain.domain)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{domain.domain}</span>
                    </div>
                    <Badge variant={domain.verified ? 'default' : 'secondary'}>
                      {domain.verified ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Vérifié
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Non vérifié
                        </>
                      )}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDomain(domain.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Add domain dialog */}
      <Dialog open={showAddDomainDialog} onOpenChange={setShowAddDomainDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un domaine</DialogTitle>
            <DialogDescription>
              Entrez le domaine que vous souhaitez connecter à la Console Google Search
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domaine</Label>
              <Input
                id="domain"
                placeholder="exemple.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDomainDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addDomain}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Available sites dialog */}
      <Dialog open={showAvailableSitesDialog} onOpenChange={setShowAvailableSitesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sites disponibles dans la Console Google Search</DialogTitle>
            <DialogDescription>
              Voici les domaines auxquels votre compte Google a accès dans Search Console
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableSites.length > 0 ? (
              availableSites.map((site) => (
                <div
                  key={site}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{site}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewDomain(site);
                      setShowAvailableSitesDialog(false);
                      setShowAddDomainDialog(true);
                    }}
                  >
                    Ajouter
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Aucun site trouvé dans votre Google Search Console</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
