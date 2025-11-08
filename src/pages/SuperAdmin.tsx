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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, TrendingUp, Mail, Inbox, Clock, Activity } from 'lucide-react';
import { EmailInbox } from '@/components/admin/EmailInbox';

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

export default function SuperAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
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
      const [usersResult, plansResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('subscription_plans').select('id, name').eq('is_active', true)
      ]);

      if (usersResult.error) throw usersResult.error;
      if (plansResult.error) throw plansResult.error;

      setUsers(usersResult.data || []);
      setPlans(plansResult.data || []);
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
    inactive: users.filter(u => u.subscription_status === 'inactive').length
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="w-10 h-10 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Admin</h1>
          <p className="text-muted-foreground">Gestion centralisée de la plateforme</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Utilisateurs</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Comptes créés</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actifs</CardTitle>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Essai Gratuit</CardTitle>
            <Clock className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.trialing}</div>
            <p className="text-xs text-muted-foreground mt-1">En période d'essai</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
            <div className="relative">
              <Mail className="w-5 h-5 text-orange-600" />
              {hasNewEmail && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{emailStats.received}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {emailStats.unread > 0 && `${emailStats.unread} non lus`}
            </p>
          </CardContent>
          {hasNewEmail && (
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
          )}
        </Card>
      </div>

      {/* Email Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Reçus</CardTitle>
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats.received}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Envoyés</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activité Récente</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principale */}
      <Tabs 
        defaultValue="users" 
        className="w-full"
        onValueChange={(value) => {
          if (value === 'emails') {
            setHasNewEmail(false);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            <span>Clients & Abonnements</span>
            <Badge variant="secondary" className="ml-2">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-2 relative">
            <Mail className="w-4 h-4" />
            <span>Messagerie</span>
            {emailStats.received > 0 && (
              <Badge variant="secondary" className="ml-2">{emailStats.received}</Badge>
            )}
            {hasNewEmail && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>
                Liste complète des utilisateurs avec contrôle des abonnements
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <EmailInbox />
        </TabsContent>
      </Tabs>
    </div>
  );
}
