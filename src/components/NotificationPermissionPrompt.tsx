import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle2, Clock3, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrowserNotificationService } from '@/lib/notificationService';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';
import { responsiveDialogClasses } from '@/lib/dialogUtils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const NOTIFICATION_SNOOZE_KEY = 'notification_permission_prompt_snoozed_until';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

export function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const snoozePrompt = useCallback(() => {
    try {
      localStorage.setItem(NOTIFICATION_SNOOZE_KEY, String(Date.now() + SNOOZE_DURATION_MS));
    } catch (error) {
      console.warn('[NotificationPermissionPrompt] Unable to persist reminder:', error);
    }
    setShow(false);
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes('ai-images') || hostname.includes('ai-product')) return;
    if (!user) return;
    if (BrowserNotificationService.getPermission() !== 'default') return;

    try {
      const snoozedUntil = Number(localStorage.getItem(NOTIFICATION_SNOOZE_KEY) || 0);
      if (snoozedUntil > Date.now()) return;
      if (snoozedUntil) localStorage.removeItem(NOTIFICATION_SNOOZE_KEY);
    } catch (error) {
      console.warn('[NotificationPermissionPrompt] Unable to read reminder state:', error);
    }

    const timer = window.setTimeout(() => {
      if (BrowserNotificationService.getPermission() === 'default') setShow(true);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [user]);

  const handleAllow = async () => {
    const currentPermission = BrowserNotificationService.getPermission();

    if (currentPermission === 'denied') {
      toast.error(
        language === 'fr'
          ? 'Les notifications sont bloquées. Veuillez les activer dans les paramètres de votre navigateur (icône de cadenas dans la barre d’adresse).'
          : 'Notifications are blocked. Please enable them in your browser settings (lock icon in the address bar).',
        { duration: 8000 },
      );
      setShow(false);
      return;
    }

    try {
      const permission = await BrowserNotificationService.requestPermission();
      localStorage.removeItem(NOTIFICATION_SNOOZE_KEY);

      if (permission === 'granted') {
        toast.success(t.integration.browser.enabled);
      } else if (permission === 'denied') {
        toast.error(
          language === 'fr'
            ? 'Les notifications sont bloquées. Pour les activer : cliquez sur l’icône de cadenas dans la barre d’adresse → Paramètres du site → Notifications → Autoriser'
            : 'Notifications are blocked. To enable: click the lock icon in the address bar → Site settings → Notifications → Allow',
          { duration: 8000 },
        );
      }
    } catch (error) {
      console.error('[NotificationPermissionPrompt] Permission request failed:', error);
      toast.error(language === 'fr' ? 'Impossible d’activer les notifications.' : 'Unable to enable notifications.');
    } finally {
      setShow(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setShow(true);
      return;
    }
    // Closing with the X or Escape behaves like “Later” and is remembered.
    snoozePrompt();
  };

  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(responsiveDialogClasses.small, 'p-5 sm:p-6')}>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{t.integration.browser.requestTitle}</DialogTitle>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Notifications navigateur
              </p>
            </div>
          </div>
          <DialogDescription>{t.integration.browser.requestDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>{t.integration.browser.benefit1}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5 text-sm">
              <Zap className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>{t.integration.browser.benefit2}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5 text-sm">
              <Bell className="h-4 w-4 flex-shrink-0 text-primary" />
              <span>{t.integration.browser.benefit3}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAllow} className="h-11 flex-1 rounded-xl">
              <Bell className="mr-2 h-4 w-4" />
              {t.integration.browser.allow}
            </Button>
            <Button onClick={snoozePrompt} variant="outline" className="h-11 flex-1 rounded-xl">
              <Clock3 className="mr-2 h-4 w-4" />
              {t.integration.browser.later}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
