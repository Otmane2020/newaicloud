import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrowserNotificationService } from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotificationToggleProps {
  compact?: boolean;
}

export function NotificationToggle({ compact = false }: NotificationToggleProps) {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    setIsSupported(BrowserNotificationService.isSupported());
    setPermission(BrowserNotificationService.getPermission());
  }, []);

  const handleToggle = async () => {
    if (!isSupported) {
      toast({
        title: 'Non supporté',
        description: 'Votre navigateur ne supporte pas les notifications',
        variant: 'destructive',
      });
      return;
    }

    if (permission === 'granted') {
      toast({
        title: 'Notifications actives',
        description: 'Les notifications sont déjà activées',
      });
      return;
    }

    if (permission === 'denied') {
      toast({
        title: 'Notifications bloquées',
        description: 'Débloquez les notifications dans les paramètres de votre navigateur',
        variant: 'destructive',
      });
      return;
    }

    const result = await BrowserNotificationService.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast({
        title: '🔔 Notifications activées',
        description: 'Vous recevrez les alertes même quand l\'onglet est en arrière-plan',
      });
      // Test notification
      BrowserNotificationService.showNotification('Notifications activées ✅', {
        body: 'Vous recevrez désormais les alertes admin',
        tag: 'test-notification',
      });
    } else {
      toast({
        title: 'Notifications refusées',
        description: 'Vous pouvez les réactiver dans les paramètres du navigateur',
        variant: 'destructive',
      });
    }
  };

  const getIcon = () => {
    if (!isSupported || permission === 'denied') {
      return <BellOff className="h-4 w-4" />;
    }
    if (permission === 'granted') {
      return <BellRing className="h-4 w-4" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (permission === 'granted') return 'text-green-500';
    if (permission === 'denied') return 'text-destructive';
    return 'text-muted-foreground';
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn('relative', getStatusColor())}
        title={
          permission === 'granted' 
            ? 'Notifications activées' 
            : permission === 'denied' 
              ? 'Notifications bloquées' 
              : 'Activer les notifications'
        }
      >
        {getIcon()}
        {permission === 'granted' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={permission === 'granted' ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      className={cn('gap-2', getStatusColor())}
    >
      {getIcon()}
      <span className="hidden md:inline">
        {permission === 'granted' 
          ? 'Notifications actives' 
          : permission === 'denied' 
            ? 'Bloquées' 
            : 'Activer les alertes'}
      </span>
    </Button>
  );
}
