import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, Eye, Globe, MousePointer, Users, TrendingUp, 
  ShoppingCart, Send, Clock, ExternalLink, Monitor, Smartphone, Tablet 
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PageVisit {
  id: string;
  visitor_id: string;
  page_path: string;
  page_title: string | null;
  traffic_source: string;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  device_type: string;
  country: string | null;
  duration_seconds: number;
  created_at: string;
}

interface AbandonedCart {
  id: string;
  visitor_id: string;
  email: string | null;
  full_name: string | null;
  plan_name: string | null;
  billing_period: string | null;
  cart_value: number;
  step_reached: string;
  last_action: string | null;
  recovery_email_sent: boolean;
  converted: boolean;
  utm_source: string | null;
  created_at: string;
}

interface AnalyticsStats {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  avgDuration: number;
  bounceRate: number;
  conversionRate: number;
  sourceBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  topPages: { path: string; views: number }[];
  abandonedCarts: number;
  recoveredCarts: number;
}

export function SiteAnalytics() {
  const { toast } = useToast();
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async () => {
    try {
      setLoading(true);
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      const [visitsResult, cartsResult] = await Promise.all([
        supabase
          .from('page_visits')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('abandoned_carts')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .limit(200)
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (cartsResult.error) throw cartsResult.error;

      const visitsData = visitsResult.data || [];
      const cartsData = cartsResult.data || [];

      setVisits(visitsData);
      setCarts(cartsData);

      // Calculer les stats
      const uniqueVisitors = new Set(visitsData.map(v => v.visitor_id)).size;
      const totalDuration = visitsData.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
      const bounces = visitsData.filter(v => v.duration_seconds < 10).length;
      
      const sourceBreakdown: Record<string, number> = {};
      const deviceBreakdown: Record<string, number> = {};
      const pageCount: Record<string, number> = {};

      visitsData.forEach(v => {
        const source = v.traffic_source || 'direct';
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        
        const device = v.device_type || 'desktop';
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
        
        pageCount[v.page_path] = (pageCount[v.page_path] || 0) + 1;
      });

      const topPages = Object.entries(pageCount)
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      const abandonedTotal = cartsData.filter(c => !c.converted).length;
      const recoveredTotal = cartsData.filter(c => c.converted).length;

      setStats({
        totalVisits: visitsData.length,
        uniqueVisitors,
        pageViews: visitsData.length,
        avgDuration: visitsData.length > 0 ? Math.round(totalDuration / visitsData.length) : 0,
        bounceRate: visitsData.length > 0 ? Math.round((bounces / visitsData.length) * 100) : 0,
        conversionRate: uniqueVisitors > 0 ? Math.round((recoveredTotal / uniqueVisitors) * 100) : 0,
        sourceBreakdown,
        deviceBreakdown,
        topPages,
        abandonedCarts: abandonedTotal,
        recoveredCarts: recoveredTotal
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const sendCartRecoveryEmail = async (cart: AbandonedCart) => {
    if (!cart.email) {
      toast({ title: 'Erreur', description: 'Pas d\'email disponible', variant: 'destructive' });
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('send-recovery-email', {
        body: { 
          email: cart.email, 
          template: 'cart_abandoned',
          planName: cart.plan_name,
          cartValue: cart.cart_value
        }
      });
      
      if (error) throw error;

      await supabase
        .from('abandoned_carts')
        .update({ 
          recovery_email_sent: true, 
          recovery_email_sent_at: new Date().toISOString() 
        })
        .eq('id', cart.id);
      
      toast({ title: 'Succès', description: 'Email de récupération envoyé' });
      loadData();
    } catch (error) {
      console.error('Error sending recovery email:', error);
      toast({ title: 'Erreur', description: 'Échec de l\'envoi', variant: 'destructive' });
    }
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, React.ReactNode> = {
      google: <Globe className="w-4 h-4 text-blue-500" />,
      facebook: <Globe className="w-4 h-4 text-blue-600" />,
      instagram: <Globe className="w-4 h-4 text-pink-500" />,
      direct: <MousePointer className="w-4 h-4 text-gray-500" />,
      organic: <TrendingUp className="w-4 h-4 text-green-500" />,
    };
    return icons[source.toLowerCase()] || <Globe className="w-4 h-4" />;
  };

  const getDeviceIcon = (device: string) => {
    const icons: Record<string, React.ReactNode> = {
      desktop: <Monitor className="w-4 h-4" />,
      mobile: <Smartphone className="w-4 h-4" />,
      tablet: <Tablet className="w-4 h-4" />,
    };
    return icons[device.toLowerCase()] || <Monitor className="w-4 h-4" />;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStepBadge = (step: string) => {
    const colors: Record<string, string> = {
      view_plans: 'bg-blue-100 text-blue-800',
      select_plan: 'bg-yellow-100 text-yellow-800',
      checkout: 'bg-orange-100 text-orange-800',
      payment: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      view_plans: 'Voir plans',
      select_plan: 'Plan choisi',
      checkout: 'Checkout',
      payment: 'Paiement',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[step] || 'bg-gray-100 text-gray-800'}`}>
        {labels[step] || step}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Analytics & Conversions</h2>
            <p className="text-muted-foreground">Statistiques de trafic et paniers abandonnés</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Aujourd'hui</SelectItem>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Pages vues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pageViews}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Visiteurs uniques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.uniqueVisitors}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Durée moy.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taux rebond</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bounceRate}%</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Paniers abandonnés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.abandonedCarts}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Récupérés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.recoveredCarts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Globe className="w-4 h-4" />
            Sources de trafic
          </TabsTrigger>
          <TabsTrigger value="carts" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Paniers abandonnés ({carts.filter(c => !c.converted).length})
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-2">
            <Eye className="w-4 h-4" />
            Dernières visites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sources de trafic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sources de trafic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.sourceBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceIcon(source)}
                          <span className="capitalize">{source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${stats.totalVisits > 0 ? (count / stats.totalVisits) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  {(!stats || Object.keys(stats.sourceBreakdown).length === 0) && (
                    <p className="text-muted-foreground text-center py-4">Aucune donnée</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top pages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pages les plus visitées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topPages.map((page, i) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{i + 1}</span>
                        <span className="text-sm truncate max-w-[200px]">{page.path}</span>
                      </div>
                      <Badge variant="secondary">{page.views}</Badge>
                    </div>
                  ))}
                  {(!stats || stats.topPages.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">Aucune donnée</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appareils */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appareils</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.deviceBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device)}
                          <span className="capitalize">{device}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Visites</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats && Object.entries(stats.sourceBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([source, count]) => (
                      <TableRow key={source}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(source)}
                            <span className="capitalize font-medium">{source}</span>
                          </div>
                        </TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          {stats.totalVisits > 0 ? Math.round((count / stats.totalVisits) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Paniers abandonnés</CardTitle>
              <CardDescription>Utilisateurs ayant commencé le checkout sans finaliser</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Étape</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Relance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carts.filter(c => !c.converted).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Chargement...' : 'Aucun panier abandonné 🎉'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    carts.filter(c => !c.converted).map((cart) => (
                      <TableRow key={cart.id}>
                        <TableCell>
                          <span className="font-medium">{cart.email || cart.visitor_id.slice(0, 12) + '...'}</span>
                        </TableCell>
                        <TableCell>
                          {cart.plan_name && <Badge variant="secondary">{cart.plan_name}</Badge>}
                        </TableCell>
                        <TableCell>{getStepBadge(cart.step_reached)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {cart.utm_source || 'direct'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(cart.created_at), 'dd/MM HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {cart.recovery_email_sent ? (
                            <Badge variant="secondary">Envoyé</Badge>
                          ) : (
                            <Badge variant="outline">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cart.email && !cart.recovery_email_sent && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => sendCartRecoveryEmail(cart)}
                              className="gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Relancer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Appareil</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.slice(0, 50).map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell>
                        <span className="text-sm font-mono truncate max-w-[200px] block">
                          {visit.page_path}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getSourceIcon(visit.traffic_source)}
                          <span className="text-sm capitalize">{visit.traffic_source}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getDeviceIcon(visit.device_type)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(visit.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(visit.created_at), 'dd/MM HH:mm', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
