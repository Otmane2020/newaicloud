# Déclencheurs du Popup d'Upgrade

Ce document liste tous les cas où le popup d'upgrade (`UpgradeDialog`) doit s'afficher pour informer l'utilisateur qu'il a atteint une limite.

## 1. Limites d'Optimisation SEO

### Cas 1.1: Optimisation Google Shopping - Produit déjà optimisé (Trial)
- **Localisation**: `src/components/seo/GoogleShopping.tsx`
- **Déclencheur**: Tentative d'optimiser un produit déjà optimisé pendant la période d'essai
- **Code erreur**: `trial_product_already_optimized` (HTTP 403)
- **Action**: 
  ```typescript
  if (data?.error === 'trial_product_already_optimized') {
    toast.error('Limite atteinte - Produit déjà optimisé pendant l\'essai');
    setShowUpgradeDialog(true);
  }
  ```

### Cas 1.2: Optimisation en masse - Vérification avant traitement
- **Localisation**: `src/components/seo/GoogleShopping.tsx` - fonction `handleOptimizeAll`
- **Déclencheur**: Vérification des limites avant d'optimiser plusieurs produits
- **Action**:
  ```typescript
  const { data: limitCheck } = await supabase.functions.invoke('check-usage-limits', {
    body: { action: 'optimize', count: unoptimized.length }
  });
  if (!limitCheck?.allowed) {
    window.dispatchEvent(new CustomEvent('show-upgrade-dialog', { 
      detail: { limitType: 'optimizations' } 
    }));
  }
  ```

### Cas 1.3: Optimisation individuelle depuis le tableau
- **Localisation**: `src/components/seo/GoogleShopping.tsx` - bouton "Optimiser avec IA"
- **Déclencheur**: Erreur lors de l'optimisation d'un produit individuel
- **Action**: Détection d'erreur 403 et affichage du dialog

## 2. Limites d'Articles de Blog

### Cas 2.1: Création d'article - Limite mensuelle atteinte
- **Localisation**: Pages de création d'articles
- **Déclencheur**: Edge function retourne une erreur de quota
- **Action**: Affichage du dialog avec `limitType: 'articles'`

## 3. Limites de Chat AI

### Cas 3.1: Messages Chat - Limite mensuelle
- **Localisation**: Composants de chat
- **Déclencheur**: Réponse d'erreur de l'edge function chat
- **Action**: Dialog avec `limitType: 'chat'`

## 4. Limites Shopify

### Cas 4.1: Recherche de produits Shopify
- **Localisation**: Composants de recherche Shopify
- **Déclencheur**: Limite de recherches mensuelles atteinte
- **Action**: Dialog avec `limitType: 'shopifySearch'`

### Cas 4.2: Connexion de boutiques supplémentaires
- **Localisation**: Page d'intégration Shopify
- **Déclencheur**: Nombre maximum de boutiques atteint
- **Action**: Dialog avec `limitType: 'stores'`

## 5. Hook Global de Vérification

### Cas 5.1: Vérification automatique au chargement
- **Localisation**: `src/hooks/useTrialLimits.ts`
- **Déclencheur**: Vérification périodique des limites
- **Action**: 
  ```typescript
  if (limitReached || trialExpired) {
    setShowUpgradeDialog(true);
  }
  ```

## 6. Dashboard

### Cas 6.1: Affichage global des limites
- **Localisation**: `src/pages/Dashboard.tsx`
- **Déclencheur**: Hook `useTrialLimits` détecte une limite
- **Action**: Affichage automatique du `UpgradeDialog`

## Structure du Dialog

Le composant `UpgradeDialog` accepte les props suivantes:
```typescript
interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'optimizations' | 'articles' | 'chat' | 'shopifySearch' | 'stores';
}
```

## Codes d'Erreur à Surveiller

### Edge Functions
- **403**: `trial_product_already_optimized` - Produit déjà optimisé
- **402**: Payment Required - Crédits épuisés
- **429**: Too Many Requests - Rate limit atteint

### Réponses Edge Functions
```typescript
{
  error: 'trial_product_already_optimized',
  message: 'Ce produit a déjà été optimisé pendant votre période d\'essai.'
}
```

## Événements Custom

### Event: `show-upgrade-dialog`
```typescript
window.dispatchEvent(new CustomEvent('show-upgrade-dialog', { 
  detail: { limitType: 'optimizations' } 
}));
```

Écouté dans `GoogleShopping.tsx`:
```typescript
useEffect(() => {
  const handleShowUpgrade = (event: any) => {
    setShowUpgradeDialog(true);
  };
  window.addEventListener('show-upgrade-dialog', handleShowUpgrade);
  return () => window.removeEventListener('show-upgrade-dialog', handleShowUpgrade);
}, []);
```

## Checklist d'Implémentation

Pour chaque nouvelle fonctionnalité qui consomme des quotas:

- [ ] Vérifier les limites avant l'action (via `check-usage-limits`)
- [ ] Gérer l'erreur 403 avec code `trial_product_already_optimized`
- [ ] Afficher un toast explicite
- [ ] Déclencher l'`UpgradeDialog` avec le bon `limitType`
- [ ] Logger l'erreur dans la console pour debug
- [ ] Tester le comportement en période d'essai
- [ ] Tester le comportement après expiration de l'essai

## Tests Recommandés

1. **Test quota optimisation**: Optimiser un produit plusieurs fois en période d'essai
2. **Test optimisation en masse**: Lancer l'optimisation de tous les produits avec quota atteint
3. **Test expiration essai**: Vérifier l'affichage du dialog à l'expiration
4. **Test limite mensuelle**: Atteindre chaque type de limite mensuelle
5. **Test multi-boutiques**: Tenter de connecter plus de boutiques que la limite
