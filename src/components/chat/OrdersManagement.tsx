import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Package, MessageSquare, ExternalLink, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/language";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  total_price: number;
  currency: string;
  financial_status: string | null;
  fulfillment_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  order_date: string;
}

export default function OrdersManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('chat_order_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('order_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('fulfillment_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders');
      
      if (error) throw error;

      toast({
        title: "Synchronisation réussie",
        description: data.message,
      });

      await loadOrders();
    } catch (error) {
      console.error('Error syncing orders:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les commandes Shopify",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'unfulfilled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'Livrée';
      case 'partial':
        return 'Partielle';
      case 'unfulfilled':
        return 'En attente';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gestion des Commandes
            </CardTitle>
            <CardDescription>
              Suivez et gérez vos commandes Shopify
            </CardDescription>
          </div>
          <Button onClick={syncOrders} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Synchroniser
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une commande..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="fulfilled">Livrée</SelectItem>
              <SelectItem value="partial">Partielle</SelectItem>
              <SelectItem value="unfulfilled">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucune commande trouvée</p>
            <p className="text-sm mt-2">
              {orders.length === 0 
                ? "Synchronisez vos commandes Shopify pour commencer"
                : "Aucune commande ne correspond à votre recherche"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Commande</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Livraison</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        {order.customer_name && (
                          <div className="font-medium">{order.customer_name}</div>
                        )}
                        {order.customer_email && (
                          <div className="text-sm text-muted-foreground">
                            {order.customer_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.total_price?.toFixed(2)} {order.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.fulfillment_status)}>
                        {getStatusLabel(order.fulfillment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.tracking_url ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => window.open(order.tracking_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Suivre
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Discuter
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}