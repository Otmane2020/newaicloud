import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/language';

export interface AeoCredits {
  optimizations: { used: number; limit: number };
  articles: { used: number; limit: number };
  answers: { used: number; limit: number };
}

export interface AeoCreditCosts {
  generateOpportunity: number;
  generateAnswer: number;
  generateArticle: number;
  refreshAnalysis: number;
}

// Credit costs for AEO actions
export const AEO_CREDIT_COSTS: AeoCreditCosts = {
  generateOpportunity: 1,
  generateAnswer: 1,
  generateArticle: 3,
  refreshAnalysis: 1,
};

// Default limits for free plan (fallback)
const DEFAULT_FREE_LIMITS: AeoCredits = {
  optimizations: { used: 0, limit: 20 },
  articles: { used: 0, limit: 0 },
  answers: { used: 0, limit: 10 },
};

// Ratio for calculating answers limit from optimizations
const ANSWERS_RATIO = 2; // 2 answers per optimization

export function useAeoCredits() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const [credits, setCredits] = useState<AeoCredits>(DEFAULT_FREE_LIMITS);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string>('free');

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(DEFAULT_FREE_LIMITS);
      setLoading(false);
      return;
    }

    try {
      // Get user's plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_plan_id, subscription_status')
        .eq('id', user.id)
        .single();

      const currentPlan = profile?.current_plan_id || 'free';
      setPlanId(currentPlan);

      // Get plan limits from subscription_plans table
      // Try exact match first, then base plan match for tiered plans like "enterprise-2000"
      let planData = null;
      
      // First try exact match
      const { data: exactMatch } = await supabase
        .from('subscription_plans')
        .select('max_optimizations_monthly, max_articles_monthly')
        .eq('id', currentPlan)
        .maybeSingle();

      if (exactMatch) {
        planData = exactMatch;
        console.log('[useAeoCredits] Exact plan match found:', currentPlan, planData);
      } else {
        // Try base plan match (e.g., "enterprise-2000" -> "enterprise")
        const basePlan = currentPlan.split('-')[0];
        console.log('[useAeoCredits] Trying base plan match:', basePlan);
        
        const { data: baseMatch } = await supabase
          .from('subscription_plans')
          .select('max_optimizations_monthly, max_articles_monthly')
          .eq('id', basePlan)
          .maybeSingle();
        
        if (baseMatch) {
          planData = baseMatch;
          console.log('[useAeoCredits] Base plan match found:', basePlan, planData);
        } else {
          console.warn('[useAeoCredits] No plan found for:', currentPlan, 'or base:', basePlan);
        }
      }

      // For tiered plans (e.g., "enterprise-2000"), extract the number as the limit
      let optimizationsLimit = planData?.max_optimizations_monthly || DEFAULT_FREE_LIMITS.optimizations.limit;
      
      // Check if plan ID contains a number suffix (e.g., "enterprise-2000", "pro-1000")
      const tierMatch = currentPlan.match(/-(\d+)$/);
      if (tierMatch) {
        const tierLimit = parseInt(tierMatch[1], 10);
        if (!isNaN(tierLimit) && tierLimit > 0) {
          optimizationsLimit = tierLimit;
          console.log('[useAeoCredits] Using tier limit from plan ID:', tierLimit);
        }
      }
      
      const articlesLimit = planData?.max_articles_monthly || DEFAULT_FREE_LIMITS.articles.limit;
      // Calculate answers limit based on optimizations (2x ratio)
      const answersLimit = optimizationsLimit * ANSWERS_RATIO;
      
      console.log('[useAeoCredits] Final limits:', { optimizationsLimit, articlesLimit, answersLimit });

      // Get usage from ai_opportunities and ai_answers tables
      const [opportunitiesResult, answersResult, articlesResult] = await Promise.all([
        supabase
          .from('ai_opportunities')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase
          .from('ai_answers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase
          .from('blog_articles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', 'aeo')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      setCredits({
        optimizations: { 
          used: opportunitiesResult.count || 0, 
          limit: optimizationsLimit 
        },
        articles: { 
          used: articlesResult.count || 0, 
          limit: articlesLimit 
        },
        answers: { 
          used: answersResult.count || 0, 
          limit: answersLimit 
        },
      });
    } catch (error) {
      console.error('Error fetching AEO credits:', error);
      // Fallback to defaults on error
      setCredits(DEFAULT_FREE_LIMITS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const canPerformAction = useCallback((action: keyof AeoCreditCosts): boolean => {
    const cost = AEO_CREDIT_COSTS[action];
    const remaining = credits.optimizations.limit - credits.optimizations.used;
    return remaining >= cost;
  }, [credits]);

  const consumeCredits = useCallback(async (action: keyof AeoCreditCosts): Promise<boolean> => {
    if (!canPerformAction(action)) {
      toast.error(
        language === 'fr' 
          ? "Crédits AEO insuffisants. Passez à un plan supérieur." 
          : "Insufficient AEO credits. Upgrade your plan."
      );
      return false;
    }
    
    // Refresh credits after action
    await fetchCredits();
    return true;
  }, [canPerformAction, fetchCredits, language]);

  const getUsagePercentage = useCallback((type: 'optimizations' | 'articles' | 'answers'): number => {
    const { used, limit } = credits[type];
    if (limit === 0) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  }, [credits]);

  const isLimitReached = useCallback((type: 'optimizations' | 'articles' | 'answers'): boolean => {
    return credits[type].used >= credits[type].limit;
  }, [credits]);

  return {
    credits,
    loading,
    planId,
    canPerformAction,
    consumeCredits,
    getUsagePercentage,
    isLimitReached,
    refreshCredits: fetchCredits,
    costs: AEO_CREDIT_COSTS,
  };
}
