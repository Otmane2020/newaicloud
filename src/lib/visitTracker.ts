import { supabase } from '@/integrations/supabase/client';

// Génère ou récupère un visitor ID persistant
const getVisitorId = (): string => {
  const key = 'newai_visitor_id';
  let visitorId = localStorage.getItem(key);
  
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, visitorId);
  }
  
  return visitorId;
};

// Génère un session ID (nouveau à chaque visite)
const getSessionId = (): string => {
  const key = 'newai_session_id';
  const sessionKey = 'newai_session_start';
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes
  
  const lastActivity = sessionStorage.getItem(sessionKey);
  const now = Date.now();
  
  if (!lastActivity || (now - parseInt(lastActivity)) > sessionTimeout) {
    const sessionId = `s_${now}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
    sessionStorage.setItem(sessionKey, now.toString());
    return sessionId;
  }
  
  sessionStorage.setItem(sessionKey, now.toString());
  return sessionStorage.getItem(key) || `s_${now}`;
};

// Détecte le type d'appareil
const getDeviceType = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
};

// Détecte la source de trafic
const getTrafficSource = (): { 
  source: string; 
  utmSource?: string; 
  utmMedium?: string; 
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
} => {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  
  const utmSource = params.get('utm_source') || undefined;
  const utmMedium = params.get('utm_medium') || undefined;
  const utmCampaign = params.get('utm_campaign') || undefined;
  const utmContent = params.get('utm_content') || undefined;
  const utmTerm = params.get('utm_term') || undefined;
  
  // Priorité: UTM > Referrer > Direct
  if (utmSource) {
    return { source: utmSource.toLowerCase(), utmSource, utmMedium, utmCampaign, utmContent, utmTerm };
  }
  
  const referrer = document.referrer;
  if (!referrer) return { source: 'direct' };
  
  try {
    const refUrl = new URL(referrer);
    const refHost = refUrl.hostname.toLowerCase();
    
    if (refHost.includes('google')) return { source: 'google' };
    if (refHost.includes('facebook') || refHost.includes('fb.')) return { source: 'facebook' };
    if (refHost.includes('instagram')) return { source: 'instagram' };
    if (refHost.includes('twitter') || refHost.includes('x.com')) return { source: 'twitter' };
    if (refHost.includes('linkedin')) return { source: 'linkedin' };
    if (refHost.includes('youtube')) return { source: 'youtube' };
    if (refHost.includes('tiktok')) return { source: 'tiktok' };
    if (refHost.includes('bing')) return { source: 'bing' };
    if (refHost.includes('pinterest')) return { source: 'pinterest' };
    
    // Autres sites = referral
    return { source: 'referral' };
  } catch {
    return { source: 'direct' };
  }
};

let pageEnterTime = Date.now();

// Track une visite de page
export const trackPageVisit = async (pagePath?: string, pageTitle?: string): Promise<void> => {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const traffic = getTrafficSource();
    const deviceType = getDeviceType();
    
    const path = pagePath || window.location.pathname;
    const title = pageTitle || document.title;
    
    pageEnterTime = Date.now();

    const { error } = await supabase
      .from('page_visits')
      .insert({
        visitor_id: visitorId,
        session_id: sessionId,
        page_path: path,
        page_title: title,
        referrer: document.referrer || null,
        traffic_source: traffic.source,
        utm_source: traffic.utmSource,
        utm_medium: traffic.utmMedium,
        utm_campaign: traffic.utmCampaign,
        utm_content: traffic.utmContent,
        utm_term: traffic.utmTerm,
        device_type: deviceType,
        user_agent: navigator.userAgent,
        duration_seconds: 0
      });

    if (error) {
      console.error('Error tracking page visit:', error);
    }
  } catch (error) {
    console.error('Visit tracking error:', error);
  }
};

// Track un panier abandonné
export const trackCartAbandonment = async (data: {
  email?: string;
  fullName?: string;
  planId?: string;
  planName?: string;
  billingPeriod?: string;
  cartValue?: number;
  stepReached?: string;
  lastAction?: string;
}): Promise<void> => {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const traffic = getTrafficSource();

    // Check if cart already exists for this visitor
    const { data: existing } = await supabase
      .from('abandoned_carts')
      .select('id')
      .eq('visitor_id', visitorId)
      .eq('converted', false)
      .maybeSingle();

    if (existing) {
      // Update existing cart
      await supabase
        .from('abandoned_carts')
        .update({
          email: data.email || undefined,
          full_name: data.fullName || undefined,
          plan_id: data.planId || undefined,
          plan_name: data.planName || undefined,
          billing_period: data.billingPeriod || undefined,
          cart_value: data.cartValue || undefined,
          step_reached: data.stepReached || undefined,
          last_action: data.lastAction || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new cart
      await supabase
        .from('abandoned_carts')
        .insert({
          visitor_id: visitorId,
          session_id: sessionId,
          email: data.email || null,
          full_name: data.fullName || null,
          plan_id: data.planId || null,
          plan_name: data.planName || null,
          billing_period: data.billingPeriod || null,
          cart_value: data.cartValue || 0,
          step_reached: data.stepReached || 'view_plans',
          last_action: data.lastAction || null,
          utm_source: traffic.utmSource || null,
          utm_campaign: traffic.utmCampaign || null
        });
    }
  } catch (error) {
    console.error('Cart tracking error:', error);
  }
};

// Marque un panier comme converti
export const markCartConverted = async (): Promise<void> => {
  try {
    const visitorId = getVisitorId();
    
    await supabase
      .from('abandoned_carts')
      .update({
        converted: true,
        converted_at: new Date().toISOString()
      })
      .eq('visitor_id', visitorId)
      .eq('converted', false);
  } catch (error) {
    console.error('Cart conversion tracking error:', error);
  }
};

// Met à jour la durée de visite (à appeler avant de quitter la page)
export const updateVisitDuration = async (): Promise<void> => {
  try {
    const visitorId = getVisitorId();
    const duration = Math.round((Date.now() - pageEnterTime) / 1000);
    
    // Get the latest visit for this visitor
    const { data: latestVisit } = await supabase
      .from('page_visits')
      .select('id')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVisit) {
      await supabase
        .from('page_visits')
        .update({ duration_seconds: duration })
        .eq('id', latestVisit.id);
    }
  } catch (error) {
    console.error('Duration update error:', error);
  }
};
