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
import { Shield, Users, TrendingUp, Mail, Inbox, Clock, Activity, BarChart3, Store } from 'lucide-react';
import { EmailInbox } from '@/components/admin/EmailInbox';
import { UserActivityHistory } from '@/components/admin/UserActivityHistory';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_status: string;
  current_plan_id: string;
  trial_ends_at: string | null;
  created_at: string;
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, received: 0, sent: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasNewEmail, setHasNewEmail] = useState(false);
  const { toast } = useToast();

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
      const [usersResult, plansResult, storesResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('id, name').eq('is_active', true),
        supabase.from('shopify_connections').select('id, store_name, store_label, user_id').eq('is_active', true)
      ]);

      if (usersResult.error) throw usersResult.error;
      if (plansResult.error) throw plansResult.error;
      if (storesResult.error) throw storesResult.error;

      setUsers(usersResult.data || []);
      setPlans(plansResult.data || []);
      setStores(storesResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
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
        title: 'Succès',
        description: 'Plan mis à jour avec succès'
      });
      loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Erreur',
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
        title: 'Succès',
        description: 'Statut mis à jour avec succès'
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const forceUpgrade = async (userId: string, currentPlanId: string) => {
    setUpdating(true);
    try {
      // Find next higher plan
      const currentPlanIndex = plans.findIndex(p => p.id === currentPlanId);
      if (currentPlanIndex === -1 || currentPlanIndex === plans.length - 1) {
        toast({
          title: 'Info',
          description: 'L\'utilisateur est déjà au plan le plus élevé',
          variant: 'default'
        });
        setUpdating(false);
        return;
      }

      const nextPlan = plans[currentPlanIndex + 1];
      const { error } = await supabase
        .from('profiles')
        .update({ 
          current_plan_id: nextPlan.id,
          subscription_status: 'active'
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Upgrade forcé',
        description: `Plan changé vers ${nextPlan.name}`,
      });
      loadData();
    } catch (error) {
      console.error('Error forcing upgrade:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de forcer l\'upgrade',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const forceDowngrade = async (userId: string, currentPlanId: string) => {
    setUpdating(true);
    try {
      // Find next lower plan
      const currentPlanIndex = plans.findIndex(p => p.id === currentPlanId);
      if (currentPlanIndex === -1 || currentPlanIndex === 0) {
        toast({
          title: 'Info',
          description: 'L\'utilisateur est déjà au plan le plus bas',
          variant: 'default'
        });
        setUpdating(false);
        return;
      }

      const previousPlan = plans[currentPlanIndex - 1];
      const { error } = await supabase
        .from('profiles')
        .update({ 
          current_plan_id: previousPlan.id,
          subscription_status: 'active'
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Downgrade forcé',
        description: `Plan changé vers ${previousPlan.name}`,
      });
      loadData();
    } catch (error) {
      console.error('Error forcing downgrade:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de forcer le downgrade',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
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
                <p className="text-xs text-muted-foreground mt-1">En période d'essai</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <CardDescription>
              Liste complète des utilisateurs avec contrôle des abonnements et actions forcées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Nom</th>
                    <th className="text-left p-4">Statut</th>
                    <th className="text-left p-4">Plan</th>
                    <th className="text-left p-4">Date création</th>
                    <th className="text-left p-4">Actions</th>
                    <th className="text-left p-4">Force Upgrade/Downgrade</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">{user.full_name || '-'}</td>
                      <td className="p-4">{getStatusBadge(user.subscription_status)}</td>
                      <td className="p-4">
                        <Select
                          value={user.current_plan_id || ''}
                          onValueChange={(value) => updateUserPlan(user.id, value)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Choisir un plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4">
                        <Select
                          value={user.subscription_status}
                          onValueChange={(value) => updateSubscriptionStatus(user.id, value)}
                          disabled={updating}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="trialing">Trialing</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="canceled">Canceled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => forceUpgrade(user.id, user.current_plan_id)}
                            disabled={updating}
                          >
                            ⬆️ Upgrade
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => forceDowngrade(user.id, user.current_plan_id)}
                            disabled={updating}
                          >
                            ⬇️ Downgrade
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'emails' && (
        <>
          {hasNewEmail && setHasNewEmail(false)}
          <EmailInbox />
        </>
      )}

      {activeTab === 'analytics' && (
        <AdvancedAnalytics />
      )}
    </div>
  );
}
