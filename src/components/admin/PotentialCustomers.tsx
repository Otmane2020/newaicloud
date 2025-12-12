import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Mail, UserPlus, Calendar, Globe, Clock, AlertTriangle, TrendingDown, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PotentialCustomer {
  id: string;
  email: string;
  full_name: string | null;
  country: string | null;
  plan_interest: string | null;
  billing_period: string | null;
  source: string | null;
  status: string;
  converted_at: string | null;
  created_at: string;
}

interface AbandonedUser {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string;
  current_plan_id: string | null;
  has_used_trial: boolean;
  onboarding_completed: boolean;
  created_at: string;
  hours_since_signup: number;
}

export function PotentialCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<PotentialCustomer[]>([]);
  const [abandonedUsers, setAbandonedUsers] = useState<AbandonedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('abandoned');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('potential_customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading potential customers:', error);
    }
  };

  const loadAbandonedUsers = async () => {
    try {
      // Use edge function to get abandoned users with their emails
      const { data, error } = await supabase.functions.invoke('get-abandoned-users');
      
      if (error) {
        console.error('Edge function error:', error);
        // Fallback: query profiles directly (without emails)
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, subscription_status, current_plan_id, has_used_trial, onboarding_completed, created_at')
          .eq('subscription_status', 'inactive')
          .is('current_plan_id', null)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (profileError) throw profileError;
        
        const usersWithEmail: AbandonedUser[] = (profiles || []).map(profile => {
          const hoursSinceSignup = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60);
          return {
            ...profile,
            email: `ID: ${profile.id.slice(0, 8)}...`,
            hours_since_signup: hoursSinceSignup
          };
        });
        
        setAbandonedUsers(usersWithEmail);
        return;
      }
      
      setAbandonedUsers(data?.users || []);
    } catch (error) {
      console.error('Error loading abandoned users:', error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadCustomers(), loadAbandonedUsers()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'converted') {
        updateData.converted_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('potential_customers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      loadCustomers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    }
  };

  const sendRecoveryEmail = async (email: string) => {
    try {
      toast({ title: 'Envoi...', description: `Email de relance vers ${email}` });
      
      // Call edge function to send recovery email
      const { error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email, template: 'onboarding_abandoned' }
      });
      
      if (error) throw error;
      
      toast({ title: 'Succès', description: 'Email de relance envoyé' });
    } catch (error) {
      console.error('Error sending recovery email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email',
        variant: 'destructive'
      });
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || 
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAbandoned = abandonedUsers.filter(u => {
    return !search || u.email.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: customers.length,
    leads: customers.filter(c => c.status === 'lead').length,
    viewingPlans: customers.filter(c => c.status === 'viewing_plans').length,
    converted: customers.filter(c => c.status === 'converted').length,
    abandoned: abandonedUsers.length,
    abandonedLast24h: abandonedUsers.filter(u => u.hours_since_signup <= 24).length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      lead: "outline",
      viewing_plans: "secondary",
      contacted: "secondary",
      converted: "default",
      lost: "destructive"
    };
    const labels: Record<string, string> = {
      lead: "Nouveau",
      viewing_plans: "Regarde les plans",
      contacted: "Contacté",
      converted: "Converti",
      lost: "Perdu"
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getAbandonmentRisk = (hours: number) => {
    if (hours < 1) return { label: 'Chaud 🔥', color: 'text-red-500', priority: 'high' };
    if (hours < 24) return { label: 'Tiède', color: 'text-orange-500', priority: 'medium' };
    if (hours < 72) return { label: 'Froid', color: 'text-blue-500', priority: 'low' };
    return { label: 'Perdu', color: 'text-muted-foreground', priority: 'lost' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-destructive" />
          <div>
            <h2 className="text-2xl font-bold">Conversion & Abandons</h2>
            <p className="text-muted-foreground">Utilisateurs qui n'ont pas converti</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { loadCustomers(); loadAbandonedUsers(); }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Abandons Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.abandoned}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dernières 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.abandonedLast24h}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regardent les plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.viewingPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prospects Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Convertis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="abandoned" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Abandons Onboarding ({stats.abandoned})
          </TabsTrigger>
          <TabsTrigger value="prospects" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Prospects Ads ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="abandoned" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Inscrit il y a</TableHead>
                    <TableHead>Risque</TableHead>
                    <TableHead>Trial utilisé</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbandoned.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Chargement...' : 'Aucun abandon trouvé 🎉'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAbandoned.map((user) => {
                      const risk = getAbandonmentRisk(user.hours_since_signup);
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.full_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: fr })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${risk.color}`}>
                              {risk.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.has_used_trial ? "secondary" : "outline"}>
                              {user.has_used_trial ? 'Oui' : 'Non'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendRecoveryEmail(user.email)}
                              className="gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Relancer
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prospects" className="mt-4">
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="lead">Nouveau</SelectItem>
                <SelectItem value="viewing_plans">Regarde plans</SelectItem>
                <SelectItem value="contacted">Contacté</SelectItem>
                <SelectItem value="converted">Converti</SelectItem>
                <SelectItem value="lost">Perdu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Plan intéressé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Chargement...' : 'Aucun prospect trouvé'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {customer.source || 'direct'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.plan_interest && (
                            <Badge variant="secondary">{customer.plan_interest}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(customer.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                        <TableCell>
                          <Select 
                            value={customer.status} 
                            onValueChange={(value) => updateStatus(customer.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Nouveau</SelectItem>
                              <SelectItem value="viewing_plans">Regarde plans</SelectItem>
                              <SelectItem value="contacted">Contacté</SelectItem>
                              <SelectItem value="converted">Converti</SelectItem>
                              <SelectItem value="lost">Perdu</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
