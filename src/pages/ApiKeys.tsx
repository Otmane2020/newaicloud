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
import { useTranslation } from "@/lib/language";

export default function ApiKeys() {
  const { t } = useTranslation();
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
        toast.error(t.apiKeys.toasts.enterpriseRequired);
        navigate("/pricing");
        return;
      }

      await loadApiKeys();
    } catch (error) {
      console.error("Error:", error);
      toast.error(t.apiKeys.toasts.loadError);
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
      toast.error(t.apiKeys.toasts.loadKeysError);
      return;
    }

    setApiKeys(data || []);
  }

  async function generateApiKey() {
    if (!newKeyName.trim()) {
      toast.error(t.apiKeys.toasts.noKeyName);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { keyName: newKeyName, environment: newEnvironment },
      });

      if (error) throw error;

      setGeneratedSecret(data.apiSecret);
      toast.success(t.apiKeys.toasts.keyCreated);
      await loadApiKeys();
      setNewKeyName("");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || t.apiKeys.toasts.keyCreationError);
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm(t.apiKeys.deleteConfirm)) return;

    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(t.apiKeys.toasts.keyDeletionError);
      return;
    }

    toast.success(t.apiKeys.toasts.keyDeleted);
    await loadApiKeys();
  }

  async function toggleKeyStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from("user_api_keys")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error(t.apiKeys.toasts.keyStatusError);
      return;
    }

    toast.success(currentStatus ? t.apiKeys.toasts.keyDeactivated : t.apiKeys.toasts.keyActivated);
    await loadApiKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t.apiKeys.toasts.copied);
  }

  if (loading) {
    return <div className="container mx-auto py-6">{t.toasts.info.processing}</div>;
  }

  if (!isEnterprise) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.apiKeys.title}</h1>
          <p className="text-muted-foreground">{t.apiKeys.description}</p>
        </div>
        <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.apiKeys.newKey}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.apiKeys.dialogs.createKey.title}</DialogTitle>
              <DialogDescription>
                {t.apiKeys.dialogs.createKey.description}
              </DialogDescription>
            </DialogHeader>
            {generatedSecret ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important :</strong> {t.apiKeys.dialogs.createKey.secretWarning}
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>{t.apiKeys.dialogs.createKey.secretLabel}</Label>
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
                  {t.apiKeys.dialogs.createKey.close}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.apiKeys.dialogs.createKey.keyName}</Label>
                  <Input
                    placeholder={t.apiKeys.dialogs.createKey.keyNamePlaceholder}
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.apiKeys.dialogs.createKey.environment}</Label>
                  <Select value={newEnvironment} onValueChange={(v: any) => setNewEnvironment(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">{t.apiKeys.dialogs.createKey.environmentProduction}</SelectItem>
                      <SelectItem value="test">{t.apiKeys.dialogs.createKey.environmentTest}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateApiKey} className="w-full">
                  {t.apiKeys.dialogs.createKey.generate}
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
              <p className="text-muted-foreground">{t.apiKeys.empty.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.apiKeys.empty.description}
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
