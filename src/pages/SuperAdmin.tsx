import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Shield, Users, CreditCard, TrendingUp } from 'lucide-react';

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

export default function SuperAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
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
        <Shield className="w-8 h-8 text-orange-600" />
        <h1 className="text-3xl font-bold">Super Admin Panel</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trialing</CardTitle>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trialing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Users className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Utilisateurs</CardTitle>
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
    </div>
  );
}
