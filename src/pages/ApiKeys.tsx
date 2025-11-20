import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Eye, EyeOff, Trash2, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ApiKeys() {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newEnvironment, setNewEnvironment] = useState<"production" | "test">("production");
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkEnterpriseAndLoadKeys();
  }, []);

  async function checkEnterpriseAndLoadKeys() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("current_plan_id, subscription_status")
        .eq("id", user.id)
        .single();

      const hasEnterprise = profile?.current_plan_id?.includes("enterprise") && 
                           profile?.subscription_status === "active";
      
      setIsEnterprise(hasEnterprise);

      if (!hasEnterprise) {
        toast.error("L'accès API nécessite un abonnement Enterprise");
        navigate("/pricing");
        return;
      }

      await loadApiKeys();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  async function loadApiKeys() {
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement des clés");
      return;
    }

    setApiKeys(data || []);
  }

  async function generateApiKey() {
    if (!newKeyName.trim()) {
      toast.error("Veuillez entrer un nom pour la clé");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { keyName: newKeyName, environment: newEnvironment },
      });

      if (error) throw error;

      setGeneratedSecret(data.apiSecret);
      toast.success("Clé API créée avec succès");
      await loadApiKeys();
      setNewKeyName("");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erreur de création");
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette clé ?")) return;

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur de suppression");
      return;
    }

    toast.success("Clé supprimée");
    await loadApiKeys();
  }

  async function toggleKeyStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("user_api_keys")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erreur de mise à jour");
      return;
    }

    toast.success(currentStatus ? "Clé désactivée" : "Clé activée");
    await loadApiKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers");
  }

  if (loading) {
    return <div className="container mx-auto py-6">Chargement...</div>;
  }

  if (!isEnterprise) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accès API</h1>
          <p className="text-muted-foreground">Gérez vos clés API pour l'automatisation</p>
        </div>
        <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle clé API
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une clé API</DialogTitle>
              <DialogDescription>
                Générez une nouvelle clé pour accéder à l'API programmatiquement
              </DialogDescription>
            </DialogHeader>
            {generatedSecret ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important :</strong> Copiez ce secret maintenant. Il ne sera plus affiché.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Secret API</Label>
                  <div className="flex gap-2">
                    <Input value={generatedSecret} readOnly className="font-mono text-sm" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedSecret)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={() => {
                  setGeneratedSecret(null);
                  setNewKeyDialog(false);
                }} className="w-full">
                  Fermer
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la clé</Label>
                  <Input
                    placeholder="Production, Dev, Webhook..."
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Environnement</Label>
                  <Select value={newEnvironment} onValueChange={(v: any) => setNewEnvironment(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateApiKey} className="w-full">
                  Générer la clé
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune clé API créée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Créez votre première clé pour commencer à utiliser l'API
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5" />
                    <div>
                      <CardTitle className="text-lg">{key.key_name}</CardTitle>
                      <CardDescription>
                        Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{key.environment}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Clé publique</Label>
                    <div className="flex gap-2">
                      <Input
                        value={showSecrets[key.id] ? key.api_key : "•".repeat(48)}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setShowSecrets({ ...showSecrets, [key.id]: !showSecrets[key.id] })}
                      >
                        {showSecrets[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(key.api_key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Limite: {key.rate_limit_per_minute} req/min</span>
                    {key.last_used_at && (
                      <span>• Dernière utilisation: {new Date(key.last_used_at).toLocaleString('fr-FR')}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyStatus(key.id, key.is_active)}
                    >
                      {key.is_active ? "Désactiver" : "Activer"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
