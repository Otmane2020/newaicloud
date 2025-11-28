import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, RefreshCw, Wrench, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

interface WebhookStatus {
  topic: string;
  exists: boolean;
  id: number | null;
  address: string | null;
  correctUrl: boolean;
  format: string | null;
  created_at: string | null;
}

interface StoreWebhooksData {
  id: string;
  store_url: string;
  store_name: string | null;
  loading: boolean;
  checking: boolean;
  registering: boolean;
  gdprWebhooks?: WebhookStatus[];
  allGdprWebhooksOk?: boolean;
  totalWebhooks?: number;
  error?: string;
}

export default function ShopifyWebhooksAdmin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stores, setStores] = useState<StoreWebhooksData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.adminShopifyWebhooks.toasts.notAuthenticated);
        navigate("/auth");
        return;
      }

      const { data: connections, error } = await supabase
        .from("shopify_connections")
        .select("id, store_url, store_name")
        .eq("user_id", user.id);

      if (error) throw error;

      setStores((connections || []).map(c => ({
        id: c.id,
        store_url: c.store_url,
        store_name: c.store_name,
        loading: false,
        checking: false,
        registering: false,
      })));
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error(t.adminShopifyWebhooks.toasts.loadError);
    } finally {
      setLoading(false);
    }
  };

  const checkWebhooks = async (storeId: string) => {
    setStores(prev => prev.map(s => 
      s.id === storeId ? { ...s, checking: true, error: undefined } : s
    ));

    try {
      const { data, error } = await supabase.functions.invoke("check-shopify-webhooks", {
        body: { storeId },
      });

      if (error) throw error;

      setStores(prev => prev.map(s => 
        s.id === storeId ? {
          ...s,
          checking: false,
          gdprWebhooks: data.gdprWebhooks,
          allGdprWebhooksOk: data.allGdprWebhooksOk,
          totalWebhooks: data.totalWebhooks,
        } : s
      ));

      if (data.allGdprWebhooksOk) {
        toast.success(t.adminShopifyWebhooks.toasts.allConfigured);
      } else {
        toast.warning(t.adminShopifyWebhooks.toasts.someMissing);
      }
    } catch (error) {
      console.error("Error checking webhooks:", error);
      setStores(prev => prev.map(s => 
        s.id === storeId ? { 
          ...s, 
          checking: false, 
          error: error instanceof Error ? error.message : t.toasts.error.generic 
        } : s
      ));
      toast.error(t.adminShopifyWebhooks.toasts.checkError);
    }
  };

  const registerWebhooks = async (storeId: string, deleteExisting = false) => {
    setStores(prev => prev.map(s => 
      s.id === storeId ? { ...s, registering: true, error: undefined } : s
    ));

    try {
      const { data, error } = await supabase.functions.invoke("register-gdpr-webhooks", {
        body: { storeId, deleteExisting },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(t.adminShopifyWebhooks.toasts.registerSuccess);
        await checkWebhooks(storeId);
      } else {
        toast.error(t.adminShopifyWebhooks.toasts.registerPartial);
      }

      setStores(prev => prev.map(s => 
        s.id === storeId ? { ...s, registering: false } : s
      ));
    } catch (error) {
      console.error("Error registering webhooks:", error);
      setStores(prev => prev.map(s => 
        s.id === storeId ? { 
          ...s, 
          registering: false, 
          error: error instanceof Error ? error.message : t.toasts.error.generic 
        } : s
      ));
      toast.error(t.adminShopifyWebhooks.toasts.registerError);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t.adminShopifyWebhooks.title}</h1>
            <p className="text-muted-foreground">
              {t.adminShopifyWebhooks.description}
            </p>
          </div>
        </div>

        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-4">
            <p className="text-sm">
              <strong>{t.adminShopifyWebhooks.important} :</strong> {t.adminShopifyWebhooks.shopifyRequires}
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li><code>customers/data_request</code> - {t.adminShopifyWebhooks.webhookTopics.customersDataRequest}</li>
              <li><code>customers/redact</code> - {t.adminShopifyWebhooks.webhookTopics.customersRedact}</li>
              <li><code>shop/redact</code> - {t.adminShopifyWebhooks.webhookTopics.shopRedact}</li>
            </ul>
          </CardContent>
        </Card>

        {stores.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">{t.adminShopifyWebhooks.noStoresConnected}</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard")}>
                {t.adminShopifyWebhooks.connectStore}
              </Button>
            </CardContent>
          </Card>
        ) : (
          stores.map(store => (
            <Card key={store.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {store.store_name || store.store_url}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {store.store_url}
                      <a 
                        href={`https://${store.store_url}/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardDescription>
                  </div>
                  {store.allGdprWebhooksOk !== undefined && (
                    <Badge variant={store.allGdprWebhooksOk ? "default" : "destructive"}>
                      {store.allGdprWebhooksOk ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> {t.adminShopifyWebhooks.status.ok}</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> {t.adminShopifyWebhooks.status.problem}</>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {store.error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                    {store.error}
                  </div>
                )}

                {store.gdprWebhooks && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t.adminShopifyWebhooks.gdprWebhooks}</p>
                    <div className="grid gap-2">
                      {store.gdprWebhooks.map(webhook => (
                        <div 
                          key={webhook.topic}
                          className={`p-3 rounded border ${
                            webhook.exists && webhook.correctUrl 
                              ? "bg-green-500/10 border-green-500/30" 
                              : "bg-red-500/10 border-red-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-sm">{webhook.topic}</code>
                            {webhook.exists && webhook.correctUrl ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {webhook.exists && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              URL: {webhook.address}
                              {!webhook.correctUrl && (
                                <span className="text-red-500 ml-2">{t.adminShopifyWebhooks.incorrectUrl}</span>
                              )}
                            </p>
                          )}
                          {!webhook.exists && (
                            <p className="text-xs text-red-500 mt-1">{t.adminShopifyWebhooks.notRegistered}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {store.totalWebhooks !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {t.adminShopifyWebhooks.totalWebhooksRegistered} {store.totalWebhooks}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkWebhooks(store.id)}
                    disabled={store.checking}
                  >
                    {store.checking ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {t.adminShopifyWebhooks.buttons.check}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => registerWebhooks(store.id)}
                    disabled={store.registering}
                  >
                    {store.registering ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wrench className="h-4 w-4 mr-2" />
                    )}
                    {t.adminShopifyWebhooks.buttons.repair}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => registerWebhooks(store.id, true)}
                    disabled={store.registering}
                  >
                    {t.adminShopifyWebhooks.buttons.recreateAll}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
