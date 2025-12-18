// Demo Account Configuration
// This configuration is used to identify the demo account and apply special rules

export const DEMO_CONFIG = {
  // Admin account with unlimited optimizations
  email: 'oben.rockman@gmail.com',
  userId: 'd0a2c485-2ebc-4452-8c91-de58fcfd4f63',
  storeId: null as string | null, // No specific store tied
  storeName: 'Admin Account',
  
  // Admin can modify (not read-only)
  isReadOnly: false,
  
  // Unlimited optimizations enabled
  unlimitedOptimizations: true,
  
  // Session duration (optional - set to 0 for unlimited)
  sessionDurationMinutes: 0, // 0 = until logout
} as const;

// Helper function to check if an email is the demo account
export const isDemoEmail = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return email.toLowerCase() === DEMO_CONFIG.email.toLowerCase();
};

// Helper function to check if a user ID is the demo account
export const isDemoUserId = (userId: string | undefined | null): boolean => {
  if (!userId) return false;
  return userId === DEMO_CONFIG.userId;
};
