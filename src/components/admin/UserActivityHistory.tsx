import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Activity, User, Store } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/language";

interface UserActivity {
  id: string;
  user_id: string;
  action_type: string;
  page: string;
  metadata: any;
  created_at: string;
  date: string;
  store_id: string | null;
  user_email?: string;
  store_name?: string;
}

interface ShopifyStore {
  id: string;
  store_name: string | null;
  store_label: string | null;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byPage: Record<string, number>;
  byAction: Record<string, number>;
}

export function UserActivityHistory() {
  const { t, language } = useTranslation();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byPage: {},
    byAction: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);

  useEffect(() => {
    loadUsers();
    loadStores();
    loadActivities();
  }, [selectedUser, selectedPage, selectedStore]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('shopify_connections')
        .select('id, store_name, store_label')
        .eq('is_active', true)
        .order('store_name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadActivities = async () => {
    try {
      let query = supabase
        .from('user_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedPage !== 'all') {
        query = query.eq('page', selectedPage);
      }

      if (selectedStore !== 'all') {
        query = query.eq('store_id', selectedStore);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user emails and store names
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      const storeIds = [...new Set(data?.map(a => a.store_id).filter(Boolean) || [])];
      
      const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
      
      let storesData: any[] = [];
      if (storeIds.length > 0) {
        const { data } = await supabase.from('shopify_connections').select('id, store_name, store_label').in('id', storeIds);
        storesData = data || [];
      }

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      const storeMap = new Map(storesData?.map(s => [s.id, s.store_label || s.store_name]) || []);
      
      const activitiesWithDetails = data?.map(a => ({
        ...a,
        user_email: emailMap.get(a.user_id),
        store_name: a.store_id ? (storeMap.get(a.store_id) || undefined) : undefined
      })) || [];

      setActivities(activitiesWithDetails);
      calculateStats(activitiesWithDetails);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: UserActivity[]) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const byPage: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    data.forEach(activity => {
      byPage[activity.page] = (byPage[activity.page] || 0) + 1;
      byAction[activity.action_type] = (byAction[activity.action_type] || 0) + 1;
    });

    setStats({
      total: data.length,
      today: data.filter(a => a.date === today).length,
      thisWeek: data.filter(a => a.date >= weekAgo).length,
      thisMonth: data.filter(a => a.date >= monthAgo).length,
      byPage,
      byAction
    });
  };

  const getActionBadgeColor = (actionType: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      page_view: "secondary",
      optimization: "default",
      sync: "outline",
      export: "destructive"
    };
    return colors[actionType] || "outline";
  };

  const pages = [...new Set(activities.map(a => a.page))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.userActivity.stats.total}</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t.superAdmin.userActivity.stats.totalActivities}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.userActivity.stats.today}</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.today}</div>
            <p className="text-xs text-muted-foreground">{t.superAdmin.userActivity.stats.todayActivities}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.userActivity.stats.thisWeek}</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">{t.superAdmin.userActivity.stats.last7Days}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.superAdmin.userActivity.stats.thisMonth}</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">{t.superAdmin.userActivity.stats.last30Days}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t.superAdmin.userActivity.title}</CardTitle>
          <CardDescription>{t.superAdmin.userActivity.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">{t.superAdmin.userActivity.filters.user}</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.superAdmin.userActivity.filters.allUsers}</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">{t.superAdmin.userActivity.filters.store}</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {t.superAdmin.userActivity.filters.allStores}
                    </div>
                  </SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        {store.store_label || store.store_name || 'Sans nom'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-2 block">{t.superAdmin.userActivity.filters.page}</label>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.superAdmin.userActivity.filters.allPages}</SelectItem>
                  {pages.map(page => (
                    <SelectItem key={page} value={page}>
                      {page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activities List */}
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionBadgeColor(activity.action_type)}>
                        {activity.action_type}
                      </Badge>
                      <span className="text-sm font-medium truncate">{activity.page}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{activity.user_email} • {format(new Date(activity.created_at), 'PPp', { locale: language === 'fr' ? fr : enUS })}</div>
                      {activity.store_name && (
                        <div className="flex items-center gap-1 text-xs">
                          <Store className="w-3 h-3" />
                          {activity.store_name}
                        </div>
                      )}
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(activity.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {t.superAdmin.userActivity.noActivities}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Top Pages & Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t.superAdmin.userActivity.stats.topPages}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byPage)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([page, count]) => (
                  <div key={page} className="flex justify-between items-center">
                    <span className="text-sm">{page}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t.superAdmin.userActivity.stats.topActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byAction)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([action, count]) => (
                  <div key={action} className="flex justify-between items-center">
                    <span className="text-sm">{action}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
