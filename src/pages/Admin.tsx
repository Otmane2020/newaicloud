import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Users, TrendingUp, TrendingDown, RefreshCw, Languages, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/language';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_status: string | null;
  current_plan_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_status, current_plan_id, trial_ends_at, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .order('price_monthly', { ascending: true });

      if (plansError) throw plansError;

      setUsers(usersData || []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t.admin.errors.loadData);
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlanId: string) => {
    try {
      setUpdating(userId);

      const { error } = await supabase
        .from('profiles')
        .update({ current_plan_id: newPlanId })
        .eq('id', userId);

      if (error) throw error;

      toast.success(t.admin.success.planUpdated);
      loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error(t.admin.errors.updatePlan);
    } finally {
      setUpdating(null);
    }
  };

  const updateSubscriptionStatus = async (userId: string, newStatus: string) => {
    try {
      setUpdating(userId);

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(t.admin.success.statusUpdated);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(t.admin.errors.updateStatus);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <h1 className="text-2xl md:text-4xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-lg">
              User and subscription management
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/translations')} variant="outline" size="sm" className="text-xs md:text-sm">
              <Languages className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Translations
            </Button>
            <Button onClick={loadData} variant="outline" size="sm" className="text-xs md:text-sm">
              <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="col-span-1">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-green-600">
                {users.filter(u => u.subscription_status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Free Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-blue-600">
                {users.filter(u => u.subscription_status === 'trialing').length}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">No Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-muted-foreground">
                {users.filter(u => !u.subscription_status || u.subscription_status === 'cancelled').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              User List
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              Manage user subscriptions and plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">User</TableHead>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Current Plan</TableHead>
                      <TableHead className="whitespace-nowrap">Signup Date</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.full_name || 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs md:text-sm">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.subscription_status)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.current_plan_id || 'None'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs md:text-sm whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString('en-US')}
                        </TableCell>
                        <TableCell>
                          {/* Desktop Actions */}
                          <div className="hidden md:flex flex-col gap-2">
                            <Select
                              value={user.current_plan_id || ''}
                              onValueChange={(value) => updateUserPlan(user.id, value)}
                              disabled={updating === user.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Change plan" />
                              </SelectTrigger>
                              <SelectContent>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSubscriptionStatus(user.id, 'active')}
                                disabled={updating === user.id || user.subscription_status === 'active'}
                              >
                                <TrendingUp className="w-3 h-3 mr-1" />
                                Activate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSubscriptionStatus(user.id, 'cancelled')}
                                disabled={updating === user.id || user.subscription_status === 'cancelled'}
                              >
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>

                          {/* Mobile Actions */}
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => updateSubscriptionStatus(user.id, 'active')}>
                                  Activate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSubscriptionStatus(user.id, 'cancelled')}>
                                  Cancel
                                </DropdownMenuItem>
                                <Select
                                  value={user.current_plan_id || ''}
                                  onValueChange={(value) => updateUserPlan(user.id, value)}
                                  disabled={updating === user.id}
                                >
                                  <SelectTrigger className="w-full border-none">
                                    <SelectValue placeholder="Change plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {plans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}