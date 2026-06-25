import { useState } from "react";
import { Store, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "@/lib/language";

const COPY = {
  fr: {
    title: "Intégration WooCommerce",
    desc: "Connectez votre boutique WooCommerce pour synchroniser produits et commandes avec Vendix.",
    url: "URL de la boutique",
    urlPh: "https://maboutique.com",
    key: "Consumer Key",
    secret: "Consumer Secret",
    connect: "Connecter WooCommerce",
    testing: "Test de connexion…",
    success: "WooCommerce connecté avec succès !",
    error: "Connexion impossible. Vérifiez l'URL et les clés.",
    help: "Créez vos clés API dans WooCommerce > Réglages > Avancé > REST API",
  },
  en: {
    title: "WooCommerce integration",
    desc: "Connect your WooCommerce store to sync products and orders with Vendix.",
    url: "Store URL",
    urlPh: "https://mystore.com",
    key: "Consumer Key",
    secret: "Consumer Secret",
    connect: "Connect WooCommerce",
    testing: "Testing connection…",
    success: "WooCommerce connected successfully!",
    error: "Unable to connect. Check your URL and keys.",
    help: "Create your API keys in WooCommerce > Settings > Advanced > REST API",
  },
};

export function WooCommerceIntegration() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!url || !key || !secret) {
      toast.error(t.error);
      return;
    }
    setLoading(true);
    try {
      // Test connection by calling WooCommerce products endpoint
      const auth = btoa(`${key}:${secret}`);
      const cleanUrl = url.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=1`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) throw new Error("Bad credentials");
      try {
        localStorage.setItem(
          "vendix_woo_config",
          JSON.stringify({ url: cleanUrl, key, secret })
        );
      } catch {}
      setConnected(true);
      toast.success(t.success);
    } catch (e) {
      console.error(e);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 text-slate-100">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white flex items-center gap-2">
            {t.title}
            {connected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </h3>
          <p className="text-sm text-slate-300">{t.desc}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-slate-200">{t.url}</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.urlPh}
            className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label className="text-slate-200">{t.key}</Label>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ck_xxxxxxxxxxxx"
            className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <Label className="text-slate-200">{t.secret}</Label>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="cs_xxxxxxxxxxxx"
            className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <p className="text-xs text-slate-400">{t.help}</p>
      </div>

      <Button
        onClick={handleConnect}
        disabled={loading}
        className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t.testing}
          </>
        ) : (
          t.connect
        )}
      </Button>
    </Card>
  );
}
