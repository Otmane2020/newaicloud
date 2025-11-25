# Tests Front-End - Migration GraphQL Shopify

## ✅ Fonctions migrées (1 à 6)

### 1. ✅ `delete-shopify-product` (P0 - Critique)
**REST → GraphQL**: `productDelete` mutation

#### Tests à effectuer:
- [ ] **Suppression produit simple**
  - Aller dans Produits
  - Sélectionner un produit test
  - Cliquer sur "Supprimer"
  - Vérifier: Produit supprimé localement ET dans Shopify admin
  
- [ ] **Erreur produit inexistant**
  - Tenter de supprimer un produit déjà supprimé
  - Vérifier: Message d'erreur clair "Product not found"
  
- [ ] **Permissions**
  - Avec un autre compte, tenter de supprimer le produit d'un autre user
  - Vérifier: Erreur "Unauthorized"

---

### 2. ✅ `update-product-status` (P0 - Critique)  
**REST → GraphQL**: `productUpdate` mutation

#### Tests à effectuer:
- [ ] **Changement de statut: ACTIVE → DRAFT**
  - Aller dans Produits
  - Sélectionner un produit actif
  - Changer le statut vers "Draft"
  - Vérifier: Statut mis à jour localement ET dans Shopify admin
  
- [ ] **Changement de statut: DRAFT → ACTIVE**
  - Sélectionner un produit en brouillon
  - Activer le produit
  - Vérifier: Produit visible dans la boutique Shopify
  
- [ ] **Changement de statut: ACTIVE → ARCHIVED**
  - Archiver un produit actif
  - Vérifier: Produit archivé dans Shopify (non visible mais pas supprimé)
  
- [ ] **Trial user bloqué** 
  - En tant qu'utilisateur trial, tenter de changer un statut
  - Vérifier: Erreur "upgrade_required" avec lien vers /subscription

---

### 3. ✅ `sync-seo-to-shopify` (P1 - Haute)
**GraphQL + REST Hybrid**: `productUpdate` mutation pour SEO, REST pour tags/metafields

#### Tests à effectuer:
- [ ] **Sync SEO Title + Description**
  - Optimiser un produit (SEO tab)
  - Cliquer sur "Synchroniser avec Shopify"
  - Vérifier dans Shopify admin: Title et Meta Description sont mis à jour
  
- [ ] **Sync Tags**
  - Générer des tags AI pour un produit
  - Synchroniser avec Shopify
  - Vérifier dans Shopify admin: Tags sont présents
  
- [ ] **Sync Google Shopping Category**
  - Ajouter une catégorie Google Shopping
  - Activer "Sync Google Shopping"
  - Synchroniser
  - Vérifier dans Shopify admin > Metafields: `google.google_product_category` est défini
  
- [ ] **Throttling (< 5 minutes)**
  - Synchroniser un produit
  - Re-synchroniser immédiatement (< 5 min)
  - Vérifier: Message "Cette synchronisation a déjà été effectuée il y a moins de 5 minutes"
  
- [ ] **Force sync après optimisation**
  - Optimiser un produit (bouton "Optimiser")
  - Vérifier: Sync automatique se lance sans blocage throttle

---

### 4. ⚠️ `sync-product-images-to-shopify` (P1 - Haute)
**Partially Migrated**: GraphQL pour lire, REST pour écrire

#### Tests à effectuer:
- [ ] **Ajout nouvelle image**
  - Ajouter une image à un produit
  - Synchroniser les images
  - Vérifier dans Shopify: Image apparaît avec bon ALT text
  
- [ ] **Modification ALT text image existante**
  - Modifier l'ALT text d'une image
  - Synchroniser
  - Vérifier dans Shopify: ALT text mis à jour
  
- [ ] **Association image-variant**
  - Assigner une image à une variante spécifique
  - Synchroniser
  - Vérifier dans Shopify: Image liée à la bonne variante
  
- [ ] **Trial user bloqué**
  - En tant qu'utilisateur trial, tenter de synchroniser des images
  - Vérifier: Erreur "upgrade_required"

**Note**: Cette fonction reste partiellement en REST pour les mutations d'images car `productCreateMedia` GraphQL a des limitations complexes.

---

### 5. ✅ `sync-shopify-to-feed` (P2 - Moyenne)
**REST → GraphQL**: `products` query avec pagination cursor

#### Tests à effectuer:
- [ ] **Sync produits du catalogue Shopify**
  - Aller dans Settings > Sync
  - Déclencher "Sync depuis Shopify"
  - Vérifier: Produits importés avec prix, descriptions, statut à jour
  
- [ ] **Pagination automatique** 
  - Pour un store avec > 50 produits
  - Déclencher le sync
  - Vérifier logs console: Pagination cursor-based fonctionne (50 produits par page)
  
- [ ] **Mise à jour produits existants**
  - Modifier un produit dans Shopify admin
  - Lancer le sync
  - Vérifier: Modifications reflétées dans l'app
  
- [ ] **Sync tags et types**
  - Modifier tags et product_type dans Shopify
  - Sync
  - Vérifier: Tags et types synchronisés

---

### 6. ⚠️ `import-products` (P0 - Critique)
**Status**: NON MIGRÉ (REST conservé)

#### Pourquoi non migré ?
Cette fonction utilise des endpoints REST **NON DÉPRÉCIÉS**:
- `/admin/api/2024-01/shop.json` (currency)
- `/admin/api/2024-01/products/count.json` (total count)
- `/admin/api/2024-01/products.json` (import initial)

GraphQL équivalents existent MAIS la migration nécessite:
1. Refonte complète du parsing des variants/images (structures différentes)
2. Gestion des `fields=` filtres REST → Fragments GraphQL
3. Tests intensifs (fonction critique d'import)

**Recommandation**: Conserver REST pour import-products car:
- Endpoints utilisés ne font PAS partie de la dépréciation 2025-04-01
- Risque élevé de régression sur fonction critique
- Migration peut être faite en Phase 2 si besoin

#### Tests à effectuer (REST actuel):
- [ ] **Import initial** 
  - Connecter nouveau store Shopify
  - Lancer import
  - Vérifier: Tous les produits importés avec variants et images
  
- [ ] **Respect limites trial**
  - En tant que trial user (10 produits max)
  - Importer depuis store avec > 10 produits
  - Vérifier: Import s'arrête à 10 produits exactement
  
- [ ] **Mode auto-import OAuth**
  - Connecter via OAuth
  - Lancer auto-import (10 produits)
  - Vérifier: Import limité à 10 produits, pas de pagination

---

## 📊 Résumé Migration

| Fonction | Statut | Priority | Risque | Tests requis |
|----------|--------|----------|---------|--------------|
| delete-shopify-product | ✅ Migré GraphQL | P0 | Faible | 3 tests |
| update-product-status | ✅ Migré GraphQL | P0 | Faible | 4 tests |
| sync-seo-to-shopify | ✅ Migré Hybrid | P1 | Moyen | 5 tests |
| sync-product-images | ⚠️ Partial GraphQL | P1 | Faible | 4 tests |
| sync-shopify-to-feed | ✅ Migré GraphQL | P2 | Faible | 4 tests |
| import-products | ⚠️ REST conservé | P0 | N/A | 3 tests |

**Total tests à effectuer: 23**

---

## 🎯 Checklist de validation

### Phase 1: Tests individuels (1-2h)
- [ ] Tester chaque fonction migrée individuellement
- [ ] Vérifier les logs console pour erreurs GraphQL
- [ ] Comparer résultats avec Shopify admin
- [ ] Tester cas d'erreur (401, 404, user errors)

### Phase 2: Tests d'intégration (1h)
- [ ] Workflow complet: Créer produit → Optimiser SEO → Sync → Modifier images → Sync
- [ ] Tester avec trial user (blocages upgrade)
- [ ] Tester avec paid user (tous accès)
- [ ] Tester synchronisation multi-produits

### Phase 3: Tests de charge (30min)
- [ ] Import/sync avec store de 100+ produits
- [ ] Vérifier rate limits GraphQL (logs console)
- [ ] Pagination cursor fonctionne sans timeout
- [ ] Aucune perte de données

---

## 🚨 Points d'attention critique

1. **ID Conversion**: GIDs GraphQL vs IDs REST numériques
   - Vérifier que les conversions `restIdToGid()` / `gidToRestId()` sont correctes
   
2. **User Errors GraphQL**: 
   - Les erreurs Shopify doivent afficher des messages clairs à l'utilisateur
   - Pas de "Unknown error" ou erreurs techniques brutes
   
3. **Rate Limits**:
   - GraphQL a des coûts de query (points)
   - Vérifier logs: "X/1000 points available"
   - Pagination doit inclure délais (200ms)

4. **Trial Users**:
   - Fonctions de modification Shopify doivent bloquer avec message upgrade
   - Lecture/import doivent rester fonctionnels

---

## 📝 Reporting bugs

Si un test échoue:
1. Noter le test exact qui a échoué
2. Copier le message d'erreur console (F12)
3. Vérifier dans Shopify admin si changement appliqué ou non
4. Reporter: "Test X failed: [erreur]"

## ✅ Validation finale

Une fois tous les tests passés:
- [ ] Aucune régression vs fonctionnement REST
- [ ] Performances équivalentes ou meilleures
- [ ] Messages d'erreur clairs pour l'utilisateur
- [ ] Logs GraphQL propres (pas d'errors/warnings)
- [ ] Documentation migration à jour

**Deadline Shopify: 2025-04-01** → Migration critique réussie si tous tests passent ✅
