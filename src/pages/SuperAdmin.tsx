import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, TrendingUp, Mail, Inbox, Clock, Activity, BarChart3, Store, RefreshCw, LogIn } from 'lucide-react';
import { EmailInbox } from '@/components/admin/EmailInbox';
import { UserActivityHistory } from '@/components/admin/UserActivityHistory';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { EmailTemplates } from '@/components/admin/EmailTemplates';
import { EmailStatsDashboard } from '@/components/admin/EmailStatsDashboard';
import { SystemStatusDashboard } from '@/components/admin/SystemStatusDashboard';
import { UserInsightPanel } from '@/components/admin/UserInsightPanel';
import { SystemEventLogs } from '@/components/admin/SystemEventLogs';
import { AdminToolbox } from '@/components/admin/AdminToolbox';
import { AdminSmartSearch } from '@/components/admin/AdminSmartSearch';
import { GoogleAdsAdmin } from '@/components/admin/GoogleAdsAdmin';
import { BlogSeoManagementAdmin } from '@/components/admin/BlogSeoManagementAdmin';
import CodeTranslationAnalyzer from '@/components/admin/CodeTranslationAnalyzer';
import AutoTranslationScanner from '@/components/admin/AutoTranslationScanner';
import { useTranslation } from '@/lib/language';

interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  planId: string;
  productId: string;
  amount: number;
  currency: string;
  interval: string;
  cancelAtPeriodEnd: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_status: string;
  current_plan_id: string;
  trial_ends_at: string | null;
  created_at: string;
  stripeSubscriptions?: StripeSubscription[];
  hasStripeData?: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
}

interface EmailStats {
  total: number;
  received: number;
  sent: number;
  unread: number;
}

interface ShopifyStore {
  id: string;
  store_name: string | null;
  store_label: string | null;
  user_id: string;
}

interface SuperAdminProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function SuperAdmin({ activeTab, setActiveTab }: SuperAdminProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, received: 0, sent: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasNewEmail, setHasNewEmail] = useState(false);
  const [billingFilter, setBillingFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trialing' | 'inactive' | 'canceled'>('all');
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadEmailStats();

    // Notifications en temps réel pour nouveaux emails
    const emailChannel = supabase
      .channel('new-admin-emails')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_emails',
        filter: 'direction=eq.incoming'
      }, (payload) => {
        setHasNewEmail(true);
        loadEmailStats();
        toast({
          title: '📧 Nouveau message',
          description: `Email reçu de ${payload.new.from_email}`,
          duration: 5000,
        });
      })
      .subscribe();

    return () => {
      emailChannel.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResult, plansResult, storesResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('id, name').eq('is_active', true),
        supabase.from('shopify_connections').select('id, store_name, store_label, user_id').eq('is_active', true)
      ]);

      if (usersResult.error) throw usersResult.error;
      if (plansResult.error) throw plansResult.error;
      if (storesResult.error) throw storesResult.error;

      // Récupérer les données Stripe
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke('admin-get-user-subscriptions');
        
        if (stripeError) {
          console.error('Error loading Stripe data:', stripeError);
          throw stripeError;
        }

        console.log('✅ Stripe data loaded successfully:', {
          totalUsers: stripeData?.users?.length || 0,
          usersWithSubscriptions: stripeData?.users?.filter((u: any) => u.subscriptions?.length > 0).length || 0,
          sampleUser: stripeData?.users?.[0]
        });

        // Merger les données
        const usersWithStripe = (usersResult.data || []).map(user => {
          const stripeUser = stripeData?.users?.find((u: any) => u.email === user.email);
          return {
            ...user,
            stripeSubscriptions: stripeUser?.subscriptions || [],
            hasStripeData: stripeUser?.hasStripeData || false,
            customerId: stripeUser?.customerId
          };
        });

        setUsers(usersWithStripe);
      } catch (stripeError) {
        console.error('Stripe data unavailable:', stripeError);
        // Fallback sans données Stripe
        setUsers((usersResult.data || []).map(user => ({
          ...user,
          stripeSubscriptions: [],
          hasStripeData: false
        })));
        toast({
          title: t.common.error,
          description: "Impossible de charger les données Stripe",
          variant: "destructive"
        });
      }
      
      setPlans(plansResult.data || []);
      setStores(storesResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: t.common.error,
        description: "Erreur lors du chargement des données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailStats = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('direction, status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        received: data?.filter(e => e.direction === 'incoming').length || 0,
        sent: data?.filter(e => e.direction === 'outgoing').length || 0,
        unread: data?.filter(e => e.direction === 'incoming' && e.status !== 'read').length || 0,
      };

      setEmailStats(stats);
    } catch (error) {
      console.error('Error loading email stats:', error);
    }
  };

  const updateUserPlan = async (userId: string, planId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_plan_id: planId })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: 'Plan mis à jour avec succès'
      });
      loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: t.common.error,
        description: 'Impossible de mettre à jour le plan',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateSubscriptionStatus = async (userId: string, status: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: 'Statut mis à jour avec succès'
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: t.common.error,
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const forceChangePlan = async (userId: string, targetPlanId: string) => {
    setUpdating(true);
    try {
      const targetPlan = plans.find(p => p.id === targetPlanId);
      if (!targetPlan) {
        toast({
          title: t.common.error,
          description: 'Plan introuvable',
          variant: 'destructive'
        });
        setUpdating(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          current_plan_id: targetPlan.id,
          subscription_status: 'active'
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Changement de plan réussi',
        description: `Plan changé vers ${targetPlan.name}`,
      });
      loadData();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast({
        title: t.common.error,
        description: 'Impossible de changer le plan',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const loginAsUser = async (userId: string, email: string) => {
    setLoggingInAs(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-login-as', {
        body: { targetUserId: userId, targetEmail: email }
      });

      if (error) throw error;

      if (data?.loginUrl) {
        // Open login link in new tab
        window.open(data.loginUrl, '_blank');
        toast({
          title: 'Lien de connexion généré',
          description: `Connexion en tant que ${email} dans un nouvel onglet`,
        });
      } else {
        throw new Error('Lien de connexion non reçu');
      }
    } catch (error) {
      console.error('Error logging in as user:', error);
      toast({
        title: t.common.error,
        description: 'Impossible de générer le lien de connexion',
        variant: 'destructive'
      });
    } finally {
      setLoggingInAs(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      inactive: "destructive",
      canceled: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.subscription_status === 'active').length,
    trialing: users.filter(u => u.subscription_status === 'trialing').length,
    inactive: users.filter(u => u.subscription_status === 'inactive').length,
    totalStores: stores.length,
    storesPerUser: stores.length > 0 ? (stores.length / users.length).toFixed(1) : '0'
  };

  return (
    <div className="space-y-8">
      {activeTab === 'dashboard' && (
        <>
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Tableau de Bord Admin</h1>
              <p className="text-muted-foreground">Gestion centralisée de la plateforme</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                <Users className="w-5 h-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Comptes créés</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-success">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Actifs</CardTitle>
                <TrendingUp className="w-5 h-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% du total
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Essai Gratuit</CardTitle>
                <Clock className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{stats.trialing}</div>
                <p className="text-xs text-muted-foreground mt-1">En période d'Essai</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500 relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <div className="relative">
                  <Mail className="w-5 h-5 text-orange-500" />
                  {hasNewEmail && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{emailStats.unread}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {emailStats.received} messages reçus
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Boutiques</CardTitle>
                <Store className="w-5 h-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">{stats.totalStores}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.storesPerUser} boutiques/utilisateur
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105" onClick={() => setActiveTab('users')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Gestion Utilisateurs
                </CardTitle>
                <CardDescription>Gérer les comptes et abonnements</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105" onClick={() => setActiveTab('emails')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-500" />
                  Messagerie
                  {hasNewEmail && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-1" />
                  )}
                </CardTitle>
                <CardDescription>Consulter et répondre aux emails</CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105" onClick={() => setActiveTab('analytics')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-success" />
                  Analytics
                </CardTitle>
                <CardDescription>Statistiques et rapports détaillés</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Stats Cards - Clickable Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === 'all' ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === 'active' ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter('active')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{users.filter(u => u.subscription_status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === 'trialing' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter('trialing')}
            >
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.subscription_status === 'trialing').length}</div>
                <p className="text-xs text-muted-foreground">Essai</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === 'inactive' ? 'ring-2 ring-gray-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter('inactive')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-600">{users.filter(u => u.subscription_status === 'inactive').length}</div>
                <p className="text-xs text-muted-foreground">Inactifs</p>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === 'canceled' ? 'ring-2 ring-red-500 shadow-lg' : 'hover:shadow-md'}`}
              onClick={() => setStatusFilter('canceled')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{users.filter(u => u.subscription_status === 'canceled').length}</div>
                <p className="text-xs text-muted-foreground">Annulés</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Card */}
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Utilisateurs
                    <Badge variant="secondary" className="ml-2">
                      {users.filter(user => {
                        if (statusFilter !== 'all' && user.subscription_status !== statusFilter) return false;
                        if (billingFilter === 'all') return true;
                        if (!user.stripeSubscriptions || user.stripeSubscriptions.length === 0) return false;
                        const activeSub = user.stripeSubscriptions.find(s => s.status === 'active' || s.status === 'trialing');
                        if (!activeSub) return false;
                        return billingFilter === 'monthly' ? activeSub.interval === 'month' : activeSub.interval === 'year';
                      }).length} résultats
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Contrôle des abonnements et actions administratives
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={billingFilter} onValueChange={(value: any) => setBillingFilter(value)}>
                    <SelectTrigger className="w-[130px] bg-background">
                      <SelectValue placeholder="Facturation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={loadData}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Rafraîchir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile view - Cards */}
              <div className="block lg:hidden p-4 space-y-3">
                {users
                  .filter(user => {
                    if (statusFilter !== 'all' && user.subscription_status !== statusFilter) return false;
                    if (billingFilter === 'all') return true;
                    if (!user.stripeSubscriptions || user.stripeSubscriptions.length === 0) return false;
                    const activeSub = user.stripeSubscriptions.find(s => s.status === 'active' || s.status === 'trialing');
                    if (!activeSub) return false;
                    return billingFilter === 'monthly' ? activeSub.interval === 'month' : activeSub.interval === 'year';
                  })
                  .map((user) => {
                    const activeSub = user.stripeSubscriptions?.find(s => s.status === 'active' || s.status === 'trialing');
                    const userStores = stores.filter(s => s.user_id === user.id);
                    return (
                      <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="break-all text-sm font-medium truncate flex-1">{user.email}</div>
                            {getStatusBadge(user.subscription_status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                            {userStores.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Store className="w-3 h-3 mr-1" />
                                {userStores.length} boutique{userStores.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {activeSub && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold">{Math.round(activeSub.amount / 100)} {activeSub.currency.toUpperCase()}</span>
                              <span className="text-muted-foreground">/{activeSub.interval === 'month' ? 'mois' : 'an'}</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loginAsUser(user.id, user.email)}
                            disabled={loggingInAs === user.id}
                            className="w-full"
                          >
                            <LogIn className="w-3 h-3 mr-2" />
                            Se connecter
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>

              {/* Desktop view - Table with horizontal scroll */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider sticky left-0 bg-muted/50 z-10">Email</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Créé le</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Boutique</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Statut</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Stripe</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Plan actuel</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Changer statut</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Forcer plan</th>
                      <th className="text-center p-3 font-semibold text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users
                      .filter(user => {
                        if (statusFilter !== 'all' && user.subscription_status !== statusFilter) return false;
                        if (billingFilter === 'all') return true;
                        if (!user.stripeSubscriptions || user.stripeSubscriptions.length === 0) return false;
                        const activeSub = user.stripeSubscriptions.find(s => s.status === 'active' || s.status === 'trialing');
                        if (!activeSub) return false;
                        return billingFilter === 'monthly' ? activeSub.interval === 'month' : activeSub.interval === 'year';
                      })
                      .map((user) => {
                        const activeSub = user.stripeSubscriptions?.find(s => s.status === 'active' || s.status === 'trialing');
                        const userStores = stores.filter(s => s.user_id === user.id);
                        
                        return (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 sticky left-0 bg-background z-10">
                              <div className="font-medium text-sm max-w-[200px] truncate" title={user.email}>
                                {user.email}
                              </div>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(user.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3">
                              {userStores.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex flex-col gap-1 max-w-[180px]">
                                  {userStores.slice(0, 2).map(store => (
                                    <Badge key={store.id} variant="secondary" className="text-xs w-fit truncate max-w-full">
                                      <Store className="w-3 h-3 mr-1 shrink-0" />
                                      <span className="truncate">{store.store_label || store.store_name || 'Sans nom'}</span>
                                    </Badge>
                                  ))}
                                  {userStores.length > 2 && (
                                    <span className="text-xs text-muted-foreground">+{userStores.length - 2} autre(s)</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3">{getStatusBadge(user.subscription_status)}</td>
                            <td className="p-3">
                              {user.hasStripeData && activeSub ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant={activeSub.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                      {activeSub.status}
                                    </Badge>
                                    <span className="text-sm font-semibold">
                                      {Math.round(activeSub.amount / 100)}€
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {activeSub.interval === 'month' ? 'Mensuel' : 'Annuel'} • {new Date(activeSub.currentPeriodEnd * 1000).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              <Select
                                value={user.current_plan_id || ''}
                                onValueChange={(value) => updateUserPlan(user.id, value)}
                                disabled={updating}
                              >
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {plans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id} className="text-xs">
                                      {plan.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={user.subscription_status}
                                onValueChange={(value) => updateSubscriptionStatus(user.id, value)}
                                disabled={updating}
                              >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                                  <SelectItem value="trialing" className="text-xs">Trialing</SelectItem>
                                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                                  <SelectItem value="canceled" className="text-xs">Canceled</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value=""
                                onValueChange={(value) => forceChangePlan(user.id, value)}
                                disabled={updating}
                              >
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                  <SelectValue placeholder="Forcer vers..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {plans.map((plan) => (
                                    <SelectItem 
                                      key={plan.id} 
                                      value={plan.id}
                                      disabled={plan.id === user.current_plan_id}
                                      className="text-xs"
                                    >
                                      {plan.name} {plan.id === user.current_plan_id ? '✓' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => loginAsUser(user.id, user.email)}
                                disabled={loggingInAs === user.id}
                                className="h-8 px-3"
                              >
                                {loggingInAs === user.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <LogIn className="w-4 h-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'emails' && (
        <>
          {hasNewEmail && setHasNewEmail(false)}
          <EmailInbox />
        </>
      )}

      {activeTab === 'templates' && (
        <EmailTemplates />
      )}

      {activeTab === 'email-stats' && (
        <EmailStatsDashboard />
      )}

      {activeTab === 'analytics' && (
        <AdvancedAnalytics />
      )}

      {activeTab === 'system-status' && (
        <SystemStatusDashboard />
      )}

      {activeTab === 'insights' && (
        <UserInsightPanel />
      )}

      {activeTab === 'logs' && (
        <SystemEventLogs />
      )}

      {activeTab === 'toolbox' && (
        <AdminToolbox />
      )}

      {activeTab === 'search' && (
        <AdminSmartSearch />
      )}

      {activeTab === 'google-ads' && (
        <GoogleAdsAdmin />
      )}

      {activeTab === 'blog-seo' && (
        <BlogSeoManagementAdmin />
      )}

      {activeTab === 'translation-analyzer' && (
        <CodeTranslationAnalyzer />
      )}

      {activeTab === 'auto-translation-scanner' && (
        <AutoTranslationScanner />
      )}
    </div>
  );
}
