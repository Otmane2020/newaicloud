// Les utilisateurs OAuth ont accès complet, pas de limitation trial pour Shopify sync
export async function checkTrialLimits(supabase: any, userId: string) {
  console.log(`[TRIAL-CHECK] 🔍 Checking trial limits for user: ${userId}`);
  
  try {
    // Récupérer le profil utilisateur avec son plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_plan_id, subscription_status, trial_ends_at')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('[TRIAL-CHECK] ❌ Error fetching profile:', profileError);
      return { 
        isTrialActive: false, 
        canUpdateShopify: true, // En cas d'erreur, on permet par défaut
        error: profileError.message 
      };
    }
    
    if (!profile) {
      console.log('[TRIAL-CHECK] ⚠️ Profile not found');
      return { isTrialActive: false, canUpdateShopify: true };
    }
    
    // Vérifier si l'utilisateur est en trial
    const isTrialActive = profile.subscription_status === 'trialing' || 
                          profile.current_plan_id === 'trial';
    
    const trialEnded = profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date();
    
    // ✅ MODIFICATION: Tous les utilisateurs peuvent sync avec Shopify (flux OAuth unifié)
    const canUpdateShopify = true;
    
    console.log(`[TRIAL-CHECK] 📊 Results:`, {
      isTrialActive,
      canUpdateShopify: true, // Always true now
      subscriptionStatus: profile.subscription_status,
      planId: profile.current_plan_id,
      trialEndsAt: profile.trial_ends_at,
    });
    
    return {
      isTrialActive,
      canUpdateShopify: true, // Always allow Shopify sync
      trialEndsAt: profile.trial_ends_at,
      planId: profile.current_plan_id,
      subscriptionStatus: profile.subscription_status,
    };
  } catch (error) {
    console.error('[TRIAL-CHECK] ❌ Unexpected error:', error);
    return { 
      isTrialActive: false, 
      canUpdateShopify: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
