import { useState, useEffect } from 'react';
import { Bell, Check, X, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/language';
import { BrowserNotificationService } from '@/lib/notificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  is_completed: boolean;
  is_archived: boolean;
  sent_browser: boolean;
  metadata: Record<string, any>;
  created_at: string;
  due_date: string | null;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('app_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications();
          
          // Show browser notification if enabled and not yet sent
          const newNotif = payload.new as Notification;
          if (newNotif.sent_browser && BrowserNotificationService.isEnabled()) {
            BrowserNotificationService.showNotification(newNotif.title, {
              body: newNotif.message,
              tag: newNotif.id,
              requireInteraction: newNotif.priority === 'high',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const dbNotifications = (data || []) as Notification[];
      setNotifications(dbNotifications);
      setUnreadCount(dbNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_completed: true, is_read: true })
        .eq('id', id);

      if (error) throw error;

      toast.success(t.toasts.success.taskCompleted);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as completed:', error);
      toast.error(t.toasts.error.updating);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      toast.success(t.notifications.toasts.archived);
      fetchNotifications();
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error(t.toasts.error.deleting);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('app_notifications')
        .update({ is_read: true })
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) throw error;

      toast.success(t.notifications.toasts.allMarkedRead);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleAction = (notification: Notification) => {
    if (notification.action_url) {
      markAsRead(notification.id);
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      products: '🛍️',
      collections: '🧩',
      blog: '📝',
      images: '🖼️',
      homepage: '🏠'
    };
    return icons[category] || '📌';
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-accent/50 transition-all duration-300 group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-br from-red-500 to-pink-500 border-2 border-background shadow-lg"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t.notifications.title}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                {language === 'fr' ? 'Tout marquer comme lu' : 'Mark all as read'}
              </Button>
            )}
          </div>
          <SheetDescription>
            {t.notifications.description}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t.notifications.empty.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.notifications.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.is_completed 
                      ? 'bg-muted/30 opacity-60' 
                      : notification.is_read 
                      ? 'bg-background' 
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">
                        {getCategoryIcon(notification.category)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {notification.title}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                        {t.notifications.priority[notification.priority as 'high' | 'medium' | 'low']}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => archiveNotification(notification.id)}
                        title={language === 'fr' ? 'Archiver' : 'Archive'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {notification.message}
                  </p>

                  {notification.due_date && (
                    <p className="text-xs text-muted-foreground mb-3">
                      ⏰ {t.notifications.dueBefore} {new Date(notification.due_date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {notification.action_url && !notification.is_completed && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(notification)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {notification.action_label || t.notifications.view}
                      </Button>
                    )}
                    {!notification.is_completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsCompleted(notification.id)}
                        className="gap-2"
                      >
                        <Check className="h-3 w-3" />
                        {t.notifications.markCompleted}
                      </Button>
                    )}
                    {notification.is_completed && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t.notifications.completed}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}