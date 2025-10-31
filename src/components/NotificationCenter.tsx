import { useState, useEffect } from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  created_at: string;
  due_date: string | null;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seo_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const dbNotifications = (data || []) as Notification[];
      
      // Add 3 sample notifications if no notifications exist
      const sampleNotifications: Notification[] = dbNotifications.length === 0 ? [
        {
          id: 'sample-1',
          title: 'Optimiser 15 produits',
          message: 'Vos 15 nouveaux produits nécessitent une optimisation SEO pour améliorer leur visibilité.',
          type: 'seo_task',
          priority: 'high',
          category: 'products',
          action_url: '/products',
          action_label: 'Optimiser maintenant',
          is_read: false,
          is_completed: false,
          created_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sample-2',
          title: 'Textes ALT manquants',
          message: '23 images de produits n\'ont pas de texte alternatif. Ajoutez-les pour améliorer votre SEO.',
          type: 'seo_task',
          priority: 'medium',
          category: 'images',
          action_url: '/seo?tab=alt',
          action_label: 'Ajouter les ALT',
          is_read: false,
          is_completed: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'sample-3',
          title: 'Audit SEO disponible',
          message: 'Votre rapport d\'audit SEO hebdomadaire est prêt. Consultez les recommandations pour améliorer votre score.',
          type: 'report',
          priority: 'low',
          category: 'homepage',
          action_url: '/seo?tab=audit',
          action_label: 'Voir le rapport',
          is_read: false,
          is_completed: false,
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          due_date: null
        }
      ] : [];

      const allNotifications = [...dbNotifications, ...sampleNotifications];
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    // Handle sample notifications locally
    if (id.startsWith('sample-')) {
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsCompleted = async (id: string) => {
    // Handle sample notifications locally
    if (id.startsWith('sample-')) {
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_completed: true, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Tâche marquée comme complétée');
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_notifications')
        .update({ is_completed: true, is_read: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Tâche marquée comme complétée');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as completed:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteNotification = async (id: string) => {
    // Handle sample notifications locally
    if (id.startsWith('sample-')) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification supprimée');
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Notification supprimée');
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erreur lors de la suppression');
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
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications SEO
          </SheetTitle>
          <SheetDescription>
            Vos tâches d'optimisation quotidiennes
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune notification</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les tâches SEO apparaîtront ici
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
                        {notification.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {notification.message}
                  </p>

                  {notification.due_date && (
                    <p className="text-xs text-muted-foreground mb-3">
                      ⏰ À faire avant {new Date(notification.due_date).toLocaleDateString('fr-FR')}
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
                        {notification.action_label || 'Voir'}
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
                        Marquer terminé
                      </Button>
                    )}
                    {notification.is_completed && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Terminé
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.created_at).toLocaleString('fr-FR')}
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