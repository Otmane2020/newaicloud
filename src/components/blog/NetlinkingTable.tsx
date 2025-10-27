import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, ExternalLink, Download, TrendingUp } from 'lucide-react';

interface NetlinkingEntry {
  id: string;
  article_id: string;
  article_title: string;
  target_url: string;
  anchor_text: string;
  link_type: 'internal' | 'external';
  click_count: number;
  created_at: string;
}

export function NetlinkingTable() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<NetlinkingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    internal: 0,
    external: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    if (user) {
      loadNetlinking();
    }
  }, [user]);

  const loadNetlinking = async () => {
    try {
      setLoading(true);
      
      const { data: netlinkingData, error: netlinkingError } = await supabase
        .from('blog_netlinking')
        .select(`
          *,
          article:blog_articles!article_id(title)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (netlinkingError) throw netlinkingError;

      const formattedData = netlinkingData?.map((entry: any) => ({
        ...entry,
        article_title: entry.article?.title || 'Article supprimé',
      })) || [];

      setEntries(formattedData);

      // Calculate stats
      const total = formattedData.length;
      const internal = formattedData.filter((e: any) => e.link_type === 'internal').length;
      const external = formattedData.filter((e: any) => e.link_type === 'external').length;
      const totalClicks = formattedData.reduce((sum: number, e: any) => sum + (e.click_count || 0), 0);

      setStats({ total, internal, external, totalClicks });
    } catch (error) {
      console.error('Error loading netlinking:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Article', 'URL cible', 'Texte d\'ancrage', 'Type', 'Clics', 'Date de création'],
      ...entries.map((entry) => [
        entry.article_title,
        entry.target_url,
        entry.anchor_text,
        entry.link_type,
        entry.click_count,
        new Date(entry.created_at).toLocaleDateString('fr-FR'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netlinking-${Date.now()}.csv`;
    a.click();
    toast.success('Export CSV téléchargé !');
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liens Internes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.internal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Liens Externes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.external}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalClicks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Analyse Netlinking
              </CardTitle>
              <CardDescription>Tous vos liens créés dans les articles</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Link className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Aucun lien détecté</p>
              <p className="text-sm text-muted-foreground">Les liens seront automatiquement détectés lors de la génération d'articles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article d'origine</TableHead>
                    <TableHead>URL cible</TableHead>
                    <TableHead>Texte d'ancrage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {entry.article_title}
                      </TableCell>
                      <TableCell>
                        <a
                          href={entry.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                        >
                          {entry.target_url.substring(0, 40)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.anchor_text}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.link_type === 'internal' ? 'default' : 'secondary'}>
                          {entry.link_type === 'internal' ? 'Interne' : 'Externe'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          {entry.click_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
