// Component-specific translations
// This file exports translation namespaces for each component

export const componentNamespaces = {
  hero: 'hero',
  features: 'features',
  benefits: 'benefits',
  pricing: 'pricing',
  auth: 'auth',
  navigation: 'navigation',
  dashboard: 'dashboard',
  products: 'products',
  chat: 'chat',
  blog: 'blog',
  common: 'common',
} as const;

export type ComponentNamespace = typeof componentNamespaces[keyof typeof componentNamespaces];
