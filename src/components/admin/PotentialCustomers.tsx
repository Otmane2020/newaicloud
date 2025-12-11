import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Mail, UserPlus, Calendar, Globe, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

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

export function PotentialCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<PotentialCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les prospects',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
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

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || 
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: customers.length,
    leads: customers.filter(c => c.status === 'lead').length,
    contacted: customers.filter(c => c.status === 'contacted').length,
    converted: customers.filter(c => c.status === 'converted').length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      lead: "outline",
      contacted: "secondary",
      converted: "default",
      lost: "destructive"
    };
    const labels: Record<string, string> = {
      lead: "Nouveau",
      contacted: "Contacté",
      converted: "Converti",
      lost: "Perdu"
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Prospects Mobile Ads</h2>
            <p className="text-muted-foreground">Emails capturés depuis le checkout</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadCustomers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.leads}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contactés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.contacted}</div>
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
            placeholder="Rechercher par email ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="lead">Nouveau</SelectItem>
            <SelectItem value="contacted">Contacté</SelectItem>
            <SelectItem value="converted">Converti</SelectItem>
            <SelectItem value="lost">Perdu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Plan intéressé</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      {customer.plan_interest && (
                        <Badge variant="outline">{customer.plan_interest}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.billing_period && (
                        <span className="text-xs">
                          {customer.billing_period === 'yearly' ? 'Annuel' : 'Mensuel'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.country && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span className="text-xs">{customer.country}</span>
                        </div>
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
    </div>
  );
}
