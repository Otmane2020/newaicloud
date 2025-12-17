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

// Plan limits (same Stripe price IDs as NewAI)
const PLAN_LIMITS: Record<string, AeoCredits> = {
  'free': {
    optimizations: { used: 0, limit: 10 },
    articles: { used: 0, limit: 3 },
    answers: { used: 0, limit: 20 },
  },
  'starter-100': {
    optimizations: { used: 0, limit: 100 },
    articles: { used: 0, limit: 30 },
    answers: { used: 0, limit: 200 },
  },
  'pro-500': {
    optimizations: { used: 0, limit: 500 },
    articles: { used: 0, limit: 150 },
    answers: { used: 0, limit: 1000 },
  },
  'pro-1000': {
    optimizations: { used: 0, limit: 1000 },
    articles: { used: 0, limit: 300 },
    answers: { used: 0, limit: 2000 },
  },
  'business-5000': {
    optimizations: { used: 0, limit: 5000 },
    articles: { used: 0, limit: 1500 },
    answers: { used: 0, limit: 10000 },
  },
  'enterprise-200000': {
    optimizations: { used: 0, limit: 200000 },
    articles: { used: 0, limit: 60000 },
    answers: { used: 0, limit: 500000 },
  },
};

export function useAeoCredits() {
  const { user } = useAuth();
  const { language } = useTranslation();
  const [credits, setCredits] = useState<AeoCredits>(PLAN_LIMITS['free']);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<string>('free');

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(PLAN_LIMITS['free']);
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

      // Get base limits for plan
      const baseLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['free'];

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
          limit: baseLimits.optimizations.limit 
        },
        articles: { 
          used: articlesResult.count || 0, 
          limit: baseLimits.articles.limit 
        },
        answers: { 
          used: answersResult.count || 0, 
          limit: baseLimits.answers.limit 
        },
      });
    } catch (error) {
      console.error('Error fetching AEO credits:', error);
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
