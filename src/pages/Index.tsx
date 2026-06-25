import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Clock,
  TrendingUp,
  Languages,
  MapPin,
  Calendar,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Quote,
  Store,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import robotHero from "@/assets/robot-hero.jpg";

const t = {
  nav: { features: "Fonctionnalités", integrations: "Intégrations", testimonials: "Témoignages", pricing: "Tarifs", demo: "Demander une démo" },
  hero: {
    badge: "Nouveau · Robot commercial IA",
    title1: "Vendix, le robot qui",
    title2: "vend à votre place",
    sub: "Votre assistant commercial IA 24/7 pour magasins et hôtels. Accueil, conseil expert, vitrine virtuelle et orientation clients — sans recruter une seule personne de plus.",
    cta1: "Voir une démo",
    cta2: "Essai gratuit 30 jours",
    trust: "Déjà adopté par des boutiques, hôtels, pharmacies et showrooms",
    stat: "+34% de ventes en moyenne",
  },
  why: {
    kicker: "Pourquoi Vendix",
    title: "Un vendeur qui ne dort jamais.",
    sub: "Trois superpouvoirs que vos meilleurs vendeurs n'auront jamais.",
    items: [
      { icon: Clock, title: "Disponible 24/7", desc: "Il accueille, répond et conseille — même quand vos vendeurs sont occupés ou que le magasin est fermé." },
      { icon: TrendingUp, title: "Augmente vos ventes", desc: "Conseils personnalisés, recommandations produits et passage en caisse direct sur votre catalogue." },
      { icon: Languages, title: "Multilingue", desc: "Français, Anglais, Espagnol, Arabe… Idéal pour le tourisme et la clientèle internationale." },
    ],
  },
  features: {
    kicker: "Ce qu'il sait faire",
    title: "Un collaborateur, neuf compétences.",
    items: [
      { icon: Bot, title: "Accueil automatique", desc: "Détection de présence et salutation immédiate." },
      { icon: Sparkles, title: "Conseil expert", desc: "Aligné sur votre catalogue Shopify ou WooCommerce." },
      { icon: Store, title: "Vitrine virtuelle", desc: "Photos HD et visualisation produits en direct." },
      { icon: MapPin, title: "Orientation en magasin", desc: "Plan interactif pour guider chaque client." },
      { icon: Calendar, title: "Prise de rendez-vous", desc: "Réservations directes avec un vendeur humain." },
      { icon: BarChart3, title: "Statistiques temps réel", desc: "Pilotez vos ventes et vos interactions à distance." },
    ],
  },
  integrations: {
    kicker: "Intégrations natives",
    title: "Branché directement à votre commerce.",
    sub: "Synchronisation automatique du catalogue, des stocks et des promotions. Aucun travail manuel.",
    list: ["Shopify", "WooCommerce", "Stripe", "Cal.com", "Google Sheets", "Mailchimp"],
  },
  testimonials: {
    kicker: "Témoignages",
    title: "Ils ont laissé Vendix s'occuper du reste.",
    items: [
      { quote: "Depuis l'installation de Vendix, notre boutique tourne même quand on est seul en caisse. Les clients adorent.", author: "Camille R.", role: "Concept store, Lyon" },
      { quote: "Mes touristes anglophones et espagnols sont enfin conseillés correctement. +41% de panier moyen.", author: "Hakim B.", role: "Hôtel boutique, Marseille" },
      { quote: "Installation en 24h, ROI atteint en 6 semaines. Honnêtement, je ne reviens plus en arrière.", author: "Sophie M.", role: "Pharmacie, Bordeaux" },
    ],
  },
  pricing: {
    kicker: "Tarifs",
    title: "Choisissez le plan qui vous ressemble.",
    sub: "Tous les plans incluent l'installation, la maintenance et les mises à jour IA. Sans engagement.",
    monthly: "/ mois",
    cta: "Choisir ce plan",
    popular: "Le plus populaire",
    plans: [
      {
        name: "Starter",
        price: "149€",
        desc: "Idéal pour les petites boutiques qui démarrent avec un vendeur IA.",
        features: [
          "1 robot Vendix (1 magasin)",
          "Jusqu'à 500 interactions / mois",
          "2 langues au choix",
          "Intégration Shopify ou WooCommerce",
          "Support par email",
        ],
        highlight: false,
      },
      {
        name: "Pro",
        price: "349€",
        desc: "Pour les commerces qui veulent vraiment booster leurs ventes.",
        features: [
          "Jusqu'à 3 robots Vendix",
          "Interactions illimitées",
          "4 langues (FR/EN/ES/AR)",
          "Vitrine virtuelle HD + recommandations IA",
          "Statistiques temps réel",
          "Support prioritaire 7j/7",
        ],
        highlight: true,
      },
      {
        name: "Entreprise",
        price: "Sur devis",
        desc: "Réseaux de magasins, chaînes d'hôtels et déploiements multi-sites.",
        features: [
          "Robots illimités, multi-sites",
          "Personnalisation voix & personnalité",
          "Intégrations sur mesure (ERP, CRM…)",
          "SLA et conformité RGPD avancée",
          "Account manager dédié en France",
        ],
        highlight: false,
      },
    ],
  },
  advantages: {
    title: "Pensé pour le commerce français.",
    items: [
      "Installation en moins de 48h",
      "Abonnement tout compris (maintenance + mises à jour IA)",
      "Compatible Shopify & WooCommerce",
      "100% conforme RGPD",
      "Voix et personnalité adaptées à votre marque",
      "Support humain basé en France",
    ],
  },
  cta: {
    title: "Prêt à avoir votre propre Vendix ?",
    sub: "Commencez avec un essai gratuit de 30 jours. Sans carte bancaire.",
    btn: "Demander une démo gratuite",
  },
  footer: "© 2026 Vendix — Solution française · RGPD compliant · Made in France",
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Vendix — Le robot qui vend à votre place";
    const desc = "Vendix, l'assistant commercial IA 24/7 pour magasins et hôtels. Accueil, conseil et vitrine virtuelle. Compatible Shopify & WooCommerce.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
    m.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden font-sans">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 shadow-[0_0_30px_rgba(255,90,50,0.5)]">
              <Bot className="h-5 w-5 text-white" />
            </span>
            <span className="text-base">Ven<span className="text-orange-400">dix</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">{t.nav.features}</a>
            <a href="#integrations" className="hover:text-white transition">{t.nav.integrations}</a>
            <a href="#pricing" className="hover:text-white transition">{t.nav.pricing}</a>
            <a href="#testimonials" className="hover:text-white transition">{t.nav.testimonials}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-white text-black hover:bg-orange-300 hover:text-black rounded-full px-5"
            >
              {t.nav.demo}
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge className="bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-orange-400" />
              {t.hero.badge}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
              {t.hero.title1}
              <br />
              <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-rose-500 bg-clip-text text-transparent">
                {t.hero.title2}
              </span>
            </h1>
            <p className="mt-7 text-lg md:text-xl text-white/65 max-w-xl leading-relaxed">
              {t.hero.sub}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="rounded-full px-8 h-14 text-base bg-gradient-to-r from-orange-400 to-rose-500 hover:opacity-90 shadow-[0_10px_40px_-10px_rgba(255,90,50,0.6)]"
              >
                {t.hero.cta1}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="rounded-full px-8 h-14 text-base border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                {t.hero.cta2}
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-white/50">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full border-2 border-[#0a0a0f] bg-gradient-to-br from-orange-300 to-rose-500"
                  />
                ))}
              </div>
              <div>
                <div className="text-white font-semibold text-base">{t.hero.stat}</div>
                <div className="text-xs">{t.hero.trust}</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gradient-to-br from-orange-500/30 to-rose-500/20 blur-3xl rounded-[3rem]" />
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
              <img
                src={robotHero}
                alt="Vendix, robot conseiller IA en magasin"
                width={1536}
                height={1536}
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-white/80">
                  En service · 412 clients accueillis aujourd'hui
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-400 mb-4">{t.why.kicker}</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.why.title}</h2>
            <p className="mt-4 text-white/60 text-lg">{t.why.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.why.items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 hover:border-orange-400/30 transition"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 mb-6">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-400 mb-4">{t.features.kicker}</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.features.title}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/10">
            {t.features.items.map((item, i) => (
              <div key={i} className="bg-[#0a0a0f] p-8 hover:bg-white/[0.03] transition group">
                <item.icon className="h-7 w-7 text-orange-400 mb-5 group-hover:scale-110 transition" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-orange-400 mb-4">{t.integrations.kicker}</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.integrations.title}</h2>
            <p className="mt-5 text-white/60 text-lg">{t.integrations.sub}</p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#95BF47]/10 border border-[#95BF47]/30">
                <ShoppingBag className="h-5 w-5 text-[#95BF47]" />
                <span className="font-semibold">Shopify</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#7F54B3]/10 border border-[#7F54B3]/30">
                <Store className="h-5 w-5 text-[#7F54B3]" />
                <span className="font-semibold">WooCommerce</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {t.integrations.list.map((name) => (
              <div
                key={name}
                className="aspect-square rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-center text-sm font-semibold text-white/80 hover:border-orange-400/40 hover:bg-white/[0.06] transition"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 border-t border-white/5 bg-gradient-to-b from-transparent via-orange-500/[0.04] to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-400 mb-4">{t.pricing.kicker}</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.pricing.title}</h2>
            <p className="mt-4 text-white/60 text-lg">{t.pricing.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.pricing.plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative p-8 rounded-3xl border transition flex flex-col ${
                  plan.highlight
                    ? "bg-gradient-to-b from-orange-500/15 to-rose-500/5 border-orange-400/40 shadow-[0_10px_60px_-10px_rgba(255,90,50,0.35)]"
                    : "bg-gradient-to-b from-white/[0.04] to-transparent border-white/10 hover:border-orange-400/30"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg whitespace-nowrap">
                    {t.pricing.popular}
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                  {plan.price !== "Sur devis" && (
                    <span className="text-white/50 text-sm">{t.pricing.monthly}</span>
                  )}
                </div>
                <p className="mt-3 text-white/60 text-sm leading-relaxed">{plan.desc}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => navigate("/auth")}
                  className={`mt-8 rounded-full h-12 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-orange-400 to-rose-500 hover:opacity-90 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  }`}
                >
                  {t.pricing.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-xs uppercase tracking-[0.3em] text-orange-400 mb-4">{t.testimonials.kicker}</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{t.testimonials.title}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.testimonials.items.map((tm, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10"
              >
                <Quote className="h-8 w-8 text-orange-400 mb-5" />
                <p className="text-white/85 leading-relaxed text-[15px]">"{tm.quote}"</p>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="font-semibold">{tm.author}</div>
                  <div className="text-sm text-white/50">{tm.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-12 text-center">{t.advantages.title}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {t.advantages.items.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <CheckCircle2 className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-white/85">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-rose-500/10 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-orange-500/20 blur-[150px]" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Zap className="h-12 w-12 text-orange-400 mx-auto mb-6" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">{t.cta.title}</h2>
          <p className="mt-5 text-lg text-white/70">{t.cta.sub}</p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="mt-10 rounded-full px-10 h-14 text-base bg-gradient-to-r from-orange-400 to-rose-500 hover:opacity-90 shadow-[0_10px_40px_-10px_rgba(255,90,50,0.6)]"
          >
            {t.cta.btn}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/50">
            <ShieldCheck className="h-4 w-4" />
            <span>Sans carte bancaire · Sans engagement</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-4 items-center justify-between text-sm text-white/40">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-orange-400" />
            <span>{t.footer}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="hover:text-white transition">Confidentialité</a>
            <a href="/terms" className="hover:text-white transition">Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
