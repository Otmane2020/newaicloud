import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  ShoppingBag,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Activity,
  Globe,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/language";

const COPY = {
  fr: {
    title: "Tableau de bord Vendix",
    subtitle:
      "Pilotez vos robots vendeurs IA déployés en magasin et en hôtel — en temps réel.",
    kpis: [
      { label: "Conversations 24h", value: "1 248", icon: MessageSquare, trend: "+18%" },
      { label: "Ventes assistées", value: "€ 7 320", icon: TrendingUp, trend: "+12%" },
      { label: "Robots actifs", value: "6 / 8", icon: Bot, trend: "75%" },
      { label: "Clients servis", value: "412", icon: Users, trend: "+34" },
    ],
    quickTitle: "Accès rapide",
    quick: [
      {
        title: "Tester Vendix",
        desc: "Ouvrir l'interface assistant",
        href: "/vendix-chat",
        icon: Sparkles,
      },
      {
        title: "Catalogue produits",
        desc: "Gérer le catalogue connecté",
        href: "/products",
        icon: ShoppingBag,
      },
      {
        title: "Mon compte",
        desc: "Abonnement et intégrations",
        href: "/account?tab=integrations",
        icon: Users,
      },
    ],
    activityTitle: "Activité récente",
    activity: [
      { who: "Robot Lyon — Centre", what: "12 conversations clôturées", when: "il y a 5 min", icon: MessageSquare },
      { who: "Robot Paris — Marais", what: "Recommandé 3 articles canapé", when: "il y a 12 min", icon: ShoppingBag },
      { who: "Robot Hôtel Riviera", what: "Demande conciergerie traitée", when: "il y a 28 min", icon: Globe },
      { who: "Robot Lyon — Confluence", what: "Synchronisé 184 produits", when: "il y a 1 h", icon: Activity },
    ],
    integrationsTitle: "Intégrations e-commerce",
    integrations: [
      { name: "Shopify", status: "Connecté", color: "bg-green-100 text-green-700" },
      { name: "WooCommerce", status: "Connecté", color: "bg-green-100 text-green-700" },
      { name: "Prestashop", status: "À configurer", color: "bg-amber-100 text-amber-700" },
    ],
  },
  en: {
    title: "Vendix Dashboard",
    subtitle:
      "Run your AI sales robots in shops and hotels — in real time.",
    kpis: [
      { label: "Conversations 24h", value: "1,248", icon: MessageSquare, trend: "+18%" },
      { label: "Assisted sales", value: "€7,320", icon: TrendingUp, trend: "+12%" },
      { label: "Active robots", value: "6 / 8", icon: Bot, trend: "75%" },
      { label: "Customers served", value: "412", icon: Users, trend: "+34" },
    ],
    quickTitle: "Quick access",
    quick: [
      { title: "Try Vendix", desc: "Open the assistant interface", href: "/vendix-chat", icon: Sparkles },
      { title: "Product catalogue", desc: "Manage your connected catalogue", href: "/products", icon: ShoppingBag },
      { title: "My account", desc: "Subscription and integrations", href: "/account?tab=integrations", icon: Users },
    ],
    activityTitle: "Recent activity",
    activity: [
      { who: "Robot Lyon — Center", what: "12 conversations closed", when: "5 min ago", icon: MessageSquare },
      { who: "Robot Paris — Marais", what: "Recommended 3 sofa items", when: "12 min ago", icon: ShoppingBag },
      { who: "Robot Hotel Riviera", what: "Concierge request handled", when: "28 min ago", icon: Globe },
      { who: "Robot Lyon — Confluence", what: "Synced 184 products", when: "1 h ago", icon: Activity },
    ],
    integrationsTitle: "E-commerce integrations",
    integrations: [
      { name: "Shopify", status: "Connected", color: "bg-green-100 text-green-700" },
      { name: "WooCommerce", status: "Connected", color: "bg-green-100 text-green-700" },
      { name: "Prestashop", status: "To configure", color: "bg-amber-100 text-amber-700" },
    ],
  },
};

export default function Dashboard() {
  const { language } = useTranslation();
  const t = COPY[language === "fr" ? "fr" : "en"];

  useEffect(() => {
    document.title = t.title;
  }, [t.title]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.title}</h1>
        </div>
        <p className="text-gray-600 ml-13">{t.subtitle}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {t.kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <k.icon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {k.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-sm text-gray-600 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.quickTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {t.quick.map((q) => (
          <Link
            key={q.title}
            to={q.href}
            className="group bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow">
                <q.icon className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-semibold text-gray-900">{q.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Activity + Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">{t.activityTitle}</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {t.activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <a.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{a.who}</p>
                  <p className="text-sm text-gray-600">{a.what}</p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">{a.when}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">{t.integrationsTitle}</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {t.integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between px-5 py-4">
                <span className="font-medium text-gray-900">{i.name}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${i.color}`}>
                  {i.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
