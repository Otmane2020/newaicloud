# Migration Note: sync-product-images-to-shopify

## Status: PARTIALLY MIGRATED ⚠️

Cette fonction a été **partiellement migrée** vers GraphQL Admin API:

### Migré vers GraphQL ✅
- **Lecture des media**: Utilise `productMedia` query pour récupérer les images existantes

### Reste en REST ⚠️
- **Création/mise à jour d'images**: Les endpoints REST sont conservés car:
  1. GraphQL `productCreateMedia` et `productUpdateMedia` ont des limitations complexes
  2. Nécessite une refonte complète du mapping variant-image
  3. Requiert des tests approfondis pour garantir la préservation des liens variant-image
  
### Prochaines étapes
Pour une migration complète vers GraphQL, il faudra:
1. Implémenter `productCreateMedia` mutation avec support des variants
2. Implémenter `productUpdateMedia` mutation 
3. Gérer le mapping `variant_ids` correctement avec les GIDs GraphQL
4. Tests intensifs pour valider que les images de variants ne sont pas cassées

### Risque
**FAIBLE**: La lecture via GraphQL suffit pour la conformité API 2025-01. Les mutations POST/PUT REST pour les images restent supportées et ne sont pas dépréciées au même titre que les endpoints de produits/variants principaux.
