import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, RefreshCw, Search, CheckCircle, XCircle, 
  Clock, Send, Filter, Calendar, MailOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string | null;
  template_code: string | null;
  status: string;
  sent_at: string | null;
  created_at: string | null;
  error_message: string | null;
}

export function AutomationEmailsTab() {
  const { toast } = useToast();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      const { data: logs, error } = await query;
      
      if (error) throw error;
      setEmailLogs(logs || []);
    } catch (error) {
      console.error('Error loading email logs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      sent: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Envoyé' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En attente' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Échec' },
      opened: { color: 'bg-blue-100 text-blue-800', icon: MailOpen, label: 'Ouvert' }
    };
    const cfg = config[status] || { color: 'bg-gray-100 text-gray-800', icon: Mail, label: status };
    const Icon = cfg.icon;
    
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  const getTemplateLabel = (template: string | null) => {
    const labels: Record<string, string> = {
      cart_abandoned: 'Panier abandonné',
      onboarding_abandoned: 'Onboarding abandonné',
      reminder_24h: 'Rappel promo 24h'
    };
    return labels[template || ''] || template || 'Personnalisé';
  };

  // Filter emails
  const filteredEmails = emailLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.subject?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || log.template_code === templateFilter;
    
    return matchesSearch && matchesStatus && matchesTemplate;
  });

  // Stats
  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter(l => l.status === 'sent').length,
    failed: emailLogs.filter(l => l.status === 'failed').length,
    opened: emailLogs.filter(l => l.status === 'opened').length,
    today: emailLogs.filter(l => 
      l.sent_at && new Date(l.sent_at).toDateString() === new Date().toDateString()
    ).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Emails de récupération envoyés
          </h3>
          <p className="text-sm text-muted-foreground">
            Historique des emails automatiques envoyés aux paniers abandonnés
          </p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Envoyés
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Échecs
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MailOpen className="w-3 h-3" /> Ouverts
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.opened}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Aujourd'hui
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.today}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par email ou sujet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échecs</SelectItem>
                <SelectItem value="opened">Ouverts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les templates</SelectItem>
                <SelectItem value="cart_abandoned">Panier abandonné</SelectItem>
                <SelectItem value="onboarding_abandoned">Onboarding abandonné</SelectItem>
                <SelectItem value="reminder_24h">Rappel promo 24h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardContent className="p-0">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Aucun email trouvé</p>
              <p className="text-sm">Les emails de récupération apparaîtront ici</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d'envoi</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.recipient_email}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {log.subject || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTemplateLabel(log.template_code)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.sent_at 
                        ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) 
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-sm text-red-600 max-w-[200px] truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
