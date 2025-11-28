// Demo Account Configuration
// This configuration is used to identify the demo account and apply special rules

export const DEMO_CONFIG = {
  // Demo account credentials (password is NOT exposed here - handled server-side)
  email: 'store-demo-20240334@shopify.newai.sale',
  userId: '86ff1fc7-bd11-4e6a-9b11-af3db227e552',
  storeId: 'ac187822-68a5-4d01-afab-e6e0689f777f',
  storeName: 'Store Demo',
  
  // Demo restrictions
  isReadOnly: true,
  
  // Demo features
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
