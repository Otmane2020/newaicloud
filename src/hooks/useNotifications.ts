import { supabase } from '@/integrations/supabase/client';

interface SendNotificationParams {
  user_id: string;
  template_code?: string;
  title?: string;
  message?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
  language?: 'fr' | 'en';
  force_email?: boolean;
  force_browser?: boolean;
}

/**
 * Hook for sending notifications (in-app + email + browser)
 * Uses the unified send-notification edge function
 */
export const useNotifications = () => {
  /**
   * Send a notification using a template
   */
  const sendNotification = async (params: SendNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: params,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }
  };

  /**
   * Send a bulk optimization complete notification
   */
  const sendBulkOptimizationComplete = async (
    user_id: string,
    count: number,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'bulk_optimization_complete',
      metadata: { count },
      language,
      force_browser: true,
    });
  };

  /**
   * Send a quota warning notification
   */
  const sendQuotaWarning = async (
    user_id: string,
    usage: number,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'quota_warning',
      metadata: { usage },
      language,
      force_email: true,
      force_browser: true,
    });
  };

  /**
   * Send a quota exceeded notification
   */
  const sendQuotaExceeded = async (
    user_id: string,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'quota_exceeded',
      language,
      force_email: true,
      force_browser: true,
    });
  };

  /**
   * Send a sync complete notification
   */
  const sendSyncComplete = async (
    user_id: string,
    count: number,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'sync_complete',
      metadata: { count },
      language,
      force_browser: true,
    });
  };

  /**
   * Send a SEO audit ready notification
   */
  const sendSeoAuditReady = async (
    user_id: string,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'seo_audit_ready',
      language,
      force_browser: true,
    });
  };

  /**
   * Send a new article generated notification
   */
  const sendArticleGenerated = async (
    user_id: string,
    title: string,
    language: 'fr' | 'en' = 'fr'
  ) => {
    return sendNotification({
      user_id,
      template_code: 'article_generated',
      metadata: { title },
      language,
      force_browser: true,
    });
  };

  return {
    sendNotification,
    sendBulkOptimizationComplete,
    sendQuotaWarning,
    sendQuotaExceeded,
    sendSyncComplete,
    sendSeoAuditReady,
    sendArticleGenerated,
  };
};
