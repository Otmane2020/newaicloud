import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Mail, TrendingUp, Clock, Users } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/language';

interface EmailStats {
  total: number;
  sent: number;
  received: number;
  replied: number;
  avgResponseTime: number;
}

interface DailyStats {
  date: string;
  sent: number;
  received: number;
  replied: number;
}

interface SenderStats {
  email: string;
  count: number;
  replied: number;
  avgResponseTime: number;
}

export function EmailStatsDashboard() {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    received: 0,
    replied: 0,
    avgResponseTime: 0
  });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [senderStats, setSenderStats] = useState<SenderStats[]>([]);

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Load all emails in the range
      const { data: emails, error } = await supabase
        .from('admin_emails')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate overall stats
      const totalEmails = emails?.length || 0;
      const sentEmails = emails?.filter(e => e.direction === 'outgoing').length || 0;
      const receivedEmails = emails?.filter(e => e.direction === 'incoming').length || 0;
      const repliedEmails = emails?.filter(e => e.replied_at !== null).length || 0;
      
      // Calculate average response time (in hours)
      const responseTimes = emails?.filter(e => e.response_time_seconds).map(e => e.response_time_seconds!) || [];
      const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 3600
        : 0;

      setStats({
        total: totalEmails,
        sent: sentEmails,
        received: receivedEmails,
        replied: repliedEmails,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10
      });

      // Calculate daily stats
      const dailyMap = new Map<string, { sent: number; received: number; replied: number }>();
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(date, { sent: 0, received: 0, replied: 0 });
      }

      emails?.forEach(email => {
        const date = format(new Date(email.created_at), 'yyyy-MM-dd');
        const stats = dailyMap.get(date);
        if (stats) {
          if (email.direction === 'outgoing') stats.sent++;
          if (email.direction === 'incoming') stats.received++;
          if (email.replied_at) stats.replied++;
        }
      });

      const dailyArray: DailyStats[] = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date: format(new Date(date), 'dd MMM', { locale: language === 'fr' ? fr : enUS }),
          ...stats
        }))
        .reverse();

      setDailyStats(dailyArray);

      // Calculate sender stats (top 10)
      const senderMap = new Map<string, { count: number; responseTimes: number[] }>();
      
      emails?.filter(e => e.direction === 'incoming').forEach(email => {
        const sender = email.from_email;
        if (!senderMap.has(sender)) {
          senderMap.set(sender, { count: 0, responseTimes: [] });
        }
        const senderData = senderMap.get(sender)!;
        senderData.count++;
        if (email.response_time_seconds) {
          senderData.responseTimes.push(email.response_time_seconds);
        }
      });

      const senderArray: SenderStats[] = Array.from(senderMap.entries())
        .map(([email, data]) => ({
          email,
          count: data.count,
          replied: data.responseTimes.length,
          avgResponseTime: data.responseTimes.length > 0
            ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length / 3600 * 10) / 10
            : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setSenderStats(senderArray);

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      [t.superAdmin.emailStats.csv.title, ''],
      [t.superAdmin.emailStats.csv.period, `${timeRange} ${t.superAdmin.emailStats.csv.lastDays}`],
      ['', ''],
      [t.superAdmin.emailStats.csv.metric, t.superAdmin.emailStats.csv.value],
      [t.superAdmin.emailStats.csv.totalEmails, stats.total.toString()],
      [t.superAdmin.emailStats.csv.emailsSent, stats.sent.toString()],
      [t.superAdmin.emailStats.csv.emailsReceived, stats.received.toString()],
      [t.superAdmin.emailStats.csv.emailsWithReply, stats.replied.toString()],
      [t.superAdmin.emailStats.csv.avgResponseTime, stats.avgResponseTime.toString()],
      ['', ''],
      [t.superAdmin.emailStats.csv.dailyStats, ''],
      [t.superAdmin.emailStats.csv.date, t.superAdmin.emailStats.csv.sent, t.superAdmin.emailStats.csv.received, t.superAdmin.emailStats.csv.replied],
      ...dailyStats.map(d => [d.date, d.sent.toString(), d.received.toString(), d.replied.toString()]),
      ['', ''],
      [t.superAdmin.emailStats.csv.topSenders, ''],
      ['Email', t.superAdmin.emailStats.csv.number, t.superAdmin.emailStats.csv.responses, t.superAdmin.emailStats.table.avgTime],
      ...senderStats.map(s => [s.email, s.count.toString(), s.replied.toString(), s.avgResponseTime.toString()])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-stats-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t.superAdmin.emailStats.title}</h2>
          <p className="text-muted-foreground">{t.superAdmin.emailStats.description}</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t.superAdmin.emailStats.timeRange.last7}</SelectItem>
              <SelectItem value="14">{t.superAdmin.emailStats.timeRange.last14}</SelectItem>
              <SelectItem value="30">{t.superAdmin.emailStats.timeRange.last30}</SelectItem>
              <SelectItem value="90">{t.superAdmin.emailStats.timeRange.last90}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            {t.superAdmin.emailStats.exportButton}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.emailStats.cards.total}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.emailStats.cards.sent}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round(stats.sent / stats.total * 100) : 0}% {t.superAdmin.emailStats.cards.ofTotal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.emailStats.cards.received}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.received}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round(stats.received / stats.total * 100) : 0}% {t.superAdmin.emailStats.cards.ofTotal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.emailStats.cards.responseRate}</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.received > 0 ? Math.round(stats.replied / stats.received * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.replied} / {stats.received} {t.superAdmin.emailStats.cards.replied}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.emailStats.cards.responseTime}</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground">{t.superAdmin.emailStats.cards.average}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.superAdmin.emailStats.charts.dailyVolume}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#10b981" name={t.superAdmin.emailStats.charts.sent} />
                <Bar dataKey="received" fill="#3b82f6" name={t.superAdmin.emailStats.charts.received} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Response Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t.superAdmin.emailStats.charts.responseEvolution}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="replied" stroke="#8b5cf6" name={t.superAdmin.emailStats.charts.replied} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Senders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.superAdmin.emailStats.charts.topSenders}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t.superAdmin.emailStats.table.email}</th>
                  <th className="text-right py-2">{t.superAdmin.emailStats.table.count}</th>
                  <th className="text-right py-2">{t.superAdmin.emailStats.table.replies}</th>
                  <th className="text-right py-2">{t.superAdmin.emailStats.table.rate}</th>
                  <th className="text-right py-2">{t.superAdmin.emailStats.table.avgTime}</th>
                </tr>
              </thead>
              <tbody>
                {senderStats.map((sender, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-2">{sender.email}</td>
                    <td className="text-right">{sender.count}</td>
                    <td className="text-right">{sender.replied}</td>
                    <td className="text-right">
                      {Math.round(sender.replied / sender.count * 100)}%
                    </td>
                    <td className="text-right">{sender.avgResponseTime || '-'}</td>
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
