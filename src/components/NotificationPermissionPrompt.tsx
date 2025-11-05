import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrowserNotificationService } from '@/lib/notificationService';
import { useTranslation } from '@/lib/language';
import { toast } from 'sonner';
import { responsiveDialogClasses } from '@/lib/dialogUtils';
import { cn } from '@/lib/utils';

export function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    // Show prompt after 10 seconds if notification permission not yet requested
    const timer = setTimeout(() => {
      if (BrowserNotificationService.getPermission() === 'default') {
        setShow(true);
      }
    }, 10000); // 10 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleAllow = async () => {
    const permission = await BrowserNotificationService.requestPermission();
    if (permission === 'granted') {
      toast.success(t.integration.browser.enabled);
    } else {
      toast.error(t.integration.browser.denied);
    }
    setShow(false);
  };
  
  const handleLater = () => {
    setShow(false);
    // Show again after 24 hours
    setTimeout(() => {
      if (BrowserNotificationService.getPermission() === 'default') {
        setShow(true);
      }
    }, 24 * 60 * 60 * 1000);
  };
  
  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className={cn(responsiveDialogClasses.small, "p-4 sm:p-6")}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-bounce" />
            </div>
            <DialogTitle className="text-lg sm:text-xl">
              {t.integration.browser.requestTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base">
            {t.integration.browser.requestDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">🎯</span>
              <span>{t.integration.browser.benefit1}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">⚡</span>
              <span>{t.integration.browser.benefit2}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-lg">🔔</span>
              <span>{t.integration.browser.benefit3}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleAllow} className="flex-1">
              {t.integration.browser.allow}
            </Button>
            <Button onClick={handleLater} variant="outline" className="flex-1">
              {t.integration.browser.later}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
