import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BrowserNotificationService } from '@/lib/notificationService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Global hook to listen for new admin emails and trigger notifications
 * Works across all pages, not just SuperAdmin
 */
export function useAdminEmailNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdminRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        isAdminRef.current = !error && data === true;
      } catch {
        isAdminRef.current = false;
      }
    };

    checkAdmin();

    // Subscribe to new admin emails
    const emailChannel = supabase
      .channel('global-admin-emails-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_emails',
        filter: 'direction=eq.incoming'
      }, async (payload) => {
        // Only notify if user is admin
        if (!isAdminRef.current) return;

        const newEmail = payload.new as {
          id: string;
          from_email: string;
          subject: string;
        };

        console.log('📧 New admin email received:', newEmail.subject);

        // 🔔 Browser notification (Chrome desktop + mobile)
        if (BrowserNotificationService.isEnabled()) {
          BrowserNotificationService.showNotification(
            '📧 Nouveau message reçu',
            {
              body: `De: ${newEmail.from_email}\n${newEmail.subject}`,
              tag: `admin-email-${newEmail.id}`,
              requireInteraction: true,
            }
          );
        }

        // 🔔 Create app_notification for ring icon
        try {
          await supabase.from('app_notifications').insert({
            user_id: user.id,
            title: '📧 Nouveau email admin',
            message: `De: ${newEmail.from_email} - ${newEmail.subject}`,
            type: 'info',
            category: 'admin',
            priority: 'high',
            sent_browser: true,
            action_url: '/super-admin',
            action_label: 'Voir email',
          });
        } catch (err) {
          console.error('Error creating admin email notification:', err);
        }

        // Toast in-app
        toast({
          title: '📧 Nouveau message',
          description: `Email reçu de ${newEmail.from_email}`,
          duration: 5000,
        });
      })
      .subscribe();

    return () => {
      emailChannel.unsubscribe();
    };
  }, [user, toast]);
}
