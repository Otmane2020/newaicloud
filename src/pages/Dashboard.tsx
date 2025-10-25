import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  FileText,
  BarChart3,
  Zap,
  ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Gestion des Produits',
      description: 'Gérez vos produits, variantes, et GTIN',
      icon: ShoppingBag,
      path: '/products',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Blog & SEO AI',
      description: 'Créez du contenu optimisé automatiquement',
      icon: FileText,
      path: '/blog',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Google Merchant',
      description: 'Générez et synchronisez vos flux XML',
      icon: BarChart3,
      path: '/merchant',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Optimisation SEO',
      description: 'Optimisez vos meta tags et keywords',
      icon: Zap,
      path: '/seo',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">
            Bienvenue, {user?.user_metadata?.full_name || 'Utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez votre boutique Shopify avec l'intelligence artificielle
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {cards.map((card, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-primary transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 cursor-pointer group"
              onClick={() => navigate(card.path)}
            >
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center mb-4 shadow-glow`}
              >
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-muted-foreground mb-4">{card.description}</p>
              <Button variant="ghost" className="group-hover:translate-x-2 transition-transform">
                Accéder
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Produits</p>
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Articles Blog</p>
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Optimisations</p>
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Taux SEO</p>
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              0%
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}