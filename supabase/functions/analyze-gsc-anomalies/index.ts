import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  alerts: any[];
  summary: {
    total_alerts: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { domain, days = 7 } = await req.json();

    console.log(`[GSC-ANOMALIES] Analyzing data for ${domain}, user ${user.id}`);

    // Get sync config for thresholds
    const { data: syncConfig } = await supabase
      .from('gsc_sync_config')
      .select('alert_thresholds')
      .eq('user_id', user.id)
      .single();

    const thresholds = syncConfig?.alert_thresholds || {
      clicks_drop: 20,
      position_drop: 5,
      impressions_drop: 30
    };

    // Get current and previous period data
    const { data: currentData } = await supabase
      .from('google_search_console_data')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    const { data: previousData } = await supabase
      .from('google_search_console_data')
      .select('*')
      .eq('user_id', user.id)
      .eq('domain', domain)
      .gte('date', new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString())
      .lt('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    if (!currentData || !previousData || currentData.length === 0 || previousData.length === 0) {
      console.log('[GSC-ANOMALIES] Insufficient data for analysis');
      return new Response(
        JSON.stringify({
          alerts: [],
          summary: { total_alerts: 0, critical: 0, high: 0, medium: 0, low: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate averages
    const currentAvg = {
      clicks: currentData.reduce((sum, d) => sum + (d.clicks || 0), 0) / currentData.length,
      impressions: currentData.reduce((sum, d) => sum + (d.impressions || 0), 0) / currentData.length,
      position: currentData.reduce((sum, d) => sum + (d.position || 0), 0) / currentData.length,
    };

    const previousAvg = {
      clicks: previousData.reduce((sum, d) => sum + (d.clicks || 0), 0) / previousData.length,
      impressions: previousData.reduce((sum, d) => sum + (d.impressions || 0), 0) / previousData.length,
      position: previousData.reduce((sum, d) => sum + (d.position || 0), 0) / previousData.length,
    };

    console.log('[GSC-ANOMALIES] Current avg:', currentAvg);
    console.log('[GSC-ANOMALIES] Previous avg:', previousAvg);

    const alerts: any[] = [];

    // Analyze clicks drop
    if (previousAvg.clicks > 0) {
      const clicksChange = ((currentAvg.clicks - previousAvg.clicks) / previousAvg.clicks) * 100;
      if (clicksChange < -thresholds.clicks_drop) {
        const severity = clicksChange < -50 ? 'critical' : clicksChange < -40 ? 'high' : clicksChange < -30 ? 'medium' : 'low';
        
        const { error: insertError } = await supabase.from('gsc_alerts').insert({
          user_id: user.id,
          domain,
          alert_type: 'clicks_drop',
          severity,
          metric_name: 'Clics',
          previous_value: Math.round(previousAvg.clicks),
          current_value: Math.round(currentAvg.clicks),
          change_percentage: Math.round(clicksChange * 10) / 10,
          metadata: { thresholds, period_days: days }
        });

        if (!insertError) {
          alerts.push({
            type: 'clicks_drop',
            severity,
            change: clicksChange,
            previous: previousAvg.clicks,
            current: currentAvg.clicks
          });
        }
      }
    }

    // Analyze impressions drop
    if (previousAvg.impressions > 0) {
      const impressionsChange = ((currentAvg.impressions - previousAvg.impressions) / previousAvg.impressions) * 100;
      if (impressionsChange < -thresholds.impressions_drop) {
        const severity = impressionsChange < -60 ? 'critical' : impressionsChange < -50 ? 'high' : impressionsChange < -40 ? 'medium' : 'low';
        
        const { error: insertError } = await supabase.from('gsc_alerts').insert({
          user_id: user.id,
          domain,
          alert_type: 'impressions_drop',
          severity,
          metric_name: 'Impressions',
          previous_value: Math.round(previousAvg.impressions),
          current_value: Math.round(currentAvg.impressions),
          change_percentage: Math.round(impressionsChange * 10) / 10,
          metadata: { thresholds, period_days: days }
        });

        if (!insertError) {
          alerts.push({
            type: 'impressions_drop',
            severity,
            change: impressionsChange,
            previous: previousAvg.impressions,
            current: currentAvg.impressions
          });
        }
      }
    }

    // Analyze position drop (higher position number = worse)
    if (previousAvg.position > 0) {
      const positionChange = currentAvg.position - previousAvg.position;
      if (positionChange > thresholds.position_drop) {
        const severity = positionChange > 15 ? 'critical' : positionChange > 10 ? 'high' : positionChange > 7 ? 'medium' : 'low';
        
        const { error: insertError } = await supabase.from('gsc_alerts').insert({
          user_id: user.id,
          domain,
          alert_type: 'position_drop',
          severity,
          metric_name: 'Position moyenne',
          previous_value: Math.round(previousAvg.position * 10) / 10,
          current_value: Math.round(currentAvg.position * 10) / 10,
          change_percentage: Math.round(positionChange * 10) / 10,
          metadata: { thresholds, period_days: days }
        });

        if (!insertError) {
          alerts.push({
            type: 'position_drop',
            severity,
            change: positionChange,
            previous: previousAvg.position,
            current: currentAvg.position
          });
        }
      }
    }

    // Send notification if critical alerts found
    if (alerts.some(a => a.severity === 'critical' || a.severity === 'high')) {
      const criticalCount = alerts.filter(a => a.severity === 'critical').length;
      const highCount = alerts.filter(a => a.severity === 'high').length;
      
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: user.id,
          title: `⚠️ Alertes Google Search Console détectées`,
          message: `${criticalCount} alerte(s) critique(s) et ${highCount} alerte(s) importante(s) pour ${domain}`,
          category: 'alert',
          priority: 'high',
          action_url: '/seo?tab=google-console',
          action_label: 'Voir les alertes',
          force_browser: true,
        }
      });
    }

    const summary = {
      total_alerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
    };

    console.log('[GSC-ANOMALIES] Analysis complete:', summary);

    return new Response(
      JSON.stringify({ alerts, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[GSC-ANOMALIES] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});