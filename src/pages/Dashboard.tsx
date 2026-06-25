import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  ShoppingBag,
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Activity,
  Package,
} from "lucide-react";
import { useTranslation } from "@/lib/language";

const COPY = {
  fr: {
    title: "Tableau de bord",
    subtitle: "Interface de gestion Vendix",
    storeName: "Decora Home",
    storeEmail: "demo@decorahome.fr",
    kpis: [
      { label: "Produits Actifs", value: "0", hint: "Shopify connecté", icon: Package, color: "from-cyan-500 to-blue-600" },
      { label: "Conversations", value: "1 234", hint: "+23% ce mois", icon: MessageSquare, color: "from-purple-500 to-pink-600" },
      { label: "Taux Conversion", value: "28%", hint: "+5% ce mois", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
      { label: "Revenus", value: "€2 450", hint: "+12% ce mois", icon: DollarSign, color: "from-amber-500 to-orange-600" },
    ],
    shopifyTitle: "Connexion Shopify réussie !",
    shopifyFields: { shop: "Boutique", domain: "Domaine", plan: "Plan", currency: "Devise" },
    importedSuffix: "produits importés",
    activityTitle: "Activité récente",
    activity: [
      { text: "Shopify connecté avec succès — 0 produits importés", when: "Maintenant" },
      { text: "Robot Vendix entraîné avec nouveau catalogue", when: "Il y a 2 min" },
      { text: "15 nouvelles conversations client", when: "Il y a 1 h" },
    ],
    testVendix: "Tester Vendix",
  },
  en: {
    title: "Dashboard",
    subtitle: "Vendix management interface",
    storeName: "Decora Home",
    storeEmail: "demo@decorahome.fr",
    kpis: [
      { label: "Active Products", value: "0", hint: "Shopify connected", icon: Package, color: "from-cyan-500 to-blue-600" },
      { label: "Conversations", value: "1,234", hint: "+23% this month", icon: MessageSquare, color: "from-purple-500 to-pink-600" },
      { label: "Conversion Rate", value: "28%", hint: "+5% this month", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
      { label: "Revenue", value: "€2,450", hint: "+12% this month", icon: DollarSign, color: "from-amber-500 to-orange-600" },
    ],
    shopifyTitle: "Shopify successfully connected!",
    shopifyFields: { shop: "Store", domain: "Domain", plan: "Plan", currency: "Currency" },
    importedSuffix: "products imported",
    activityTitle: "Recent activity",
    activity: [
      { text: "Shopify connected successfully — 0 products imported", when: "Now" },
      { text: "Vendix robot trained with new catalogue", when: "2 min ago" },
      { text: "15 new customer conversations", when: "1 h ago" },
    ],
    testVendix: "Try Vendix",
  },
};

const shopify = {
  shop_name: "Decora Home",
  shop_domain: "decora-home.fr",
  plan: "basic",
  currency: "EUR",
  products_count: 0,
};

export default function Dashboard() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];

  useEffect(() => {
    document.title = `${t.title} — Vendix`;
  }, [t.title]);

  return (
    <div className="max-w-7xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">{t.title}</h1>
          <p className="text-cyan-200/80 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/30">
            D
          </div>
          <div>
            <p className="font-semibold text-white">{t.storeName}</p>
            <p className="text-xs text-cyan-200/70">{t.storeEmail}</p>
          </div>
          <Link
            to="/vendix-chat"
            className="ml-2 inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-cyan-500/30 transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            {t.testVendix}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {t.kpis.map((k) => (
          <div
            key={k.label}
            className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-cyan-500/50 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400">{k.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{k.value}</p>
                <p className="text-xs text-cyan-300/80 mt-1">{k.hint}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-lg`}>
                <k.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shopify Connection */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-400/30 rounded-2xl p-6 mb-8 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">{t.shopifyTitle}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400">{t.shopifyFields.shop}</p>
                <p className="font-semibold text-white">{shopify.shop_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t.shopifyFields.domain}</p>
                <p className="font-semibold text-white">{shopify.shop_domain}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t.shopifyFields.plan}</p>
                <p className="font-semibold text-white capitalize">{shopify.plan}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t.shopifyFields.currency}</p>
                <p className="font-semibold text-white">{shopify.currency}</p>
              </div>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <p className="text-4xl font-bold text-emerald-400">{shopify.products_count}</p>
            <p className="text-sm text-slate-300">{t.importedSuffix}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="border-b border-slate-700/50 px-6 py-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-white">{t.activityTitle}</h2>
        </div>
        <ul className="divide-y divide-slate-700/50">
          {t.activity.map((a, i) => (
            <li key={i} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-700/30 transition-colors">
              <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
              <p className="flex-1 text-slate-200 text-sm">{a.text}</p>
              <span className="text-xs text-slate-400 flex-shrink-0">{a.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
