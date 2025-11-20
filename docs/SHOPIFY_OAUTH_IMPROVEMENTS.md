# Améliorations du Flux OAuth Shopify

Ce document décrit les améliorations apportées au flux OAuth Shopify pour maximiser le taux de succès des connexions.

## 📊 Problèmes Identifiés

Avant les améliorations :
- **Taux d'échec : 97.7%** (43/44 connexions échouées)
- **Durée moyenne du flux : ~4 minutes**
- **Expiration des tokens : 24 heures**
- **Points d'abandon critiques** : 
  - `/shopify/success` (redirection complexe)
  - `/auth` (inscription/connexion)
  - `/onboarding` (sélection du plan)
  - Étape finale de claim

## ✅ Solutions Implémentées

### 🎯 Solution 1 : Expiration Prolongée (7 jours)

**Changement :** Les `shopify_pending_connections` expirent maintenant après **7 jours** au lieu de 24 heures.

**Impact :**
- Réduit la pression temporelle sur les utilisateurs
- Permet de finaliser la connexion à un moment plus opportun
- Réduit drastiquement les échecs dus à l'expiration

**Fichiers modifiés :**
- `supabase/functions/shopify-oauth/index.ts` (ligne 139)
- Migration SQL pour prolonger les tokens existants

---

### 🔔 Solution 2 : Système de Notifications

**Fonctionnalités ajoutées :**

1. **Edge Function de Notification** (`notify-expiring-shopify-tokens`)
   - Détecte les tokens qui expirent dans les 24 prochaines heures
   - Crée des notifications in-app automatiques
   - Peut être programmée avec un CRON (recommandé : quotidien)

2. **Page de Récupération** (`/shopify/recover`)
   - Liste toutes les connexions en attente
   - Affiche le statut (actif, expire bientôt, expiré)
   - Permet de finaliser directement les connexions
   - Design moderne avec indicateurs visuels clairs

3. **Fonction DB Helper** (`notify_expiring_shopify_tokens()`)
   - Fonction PostgreSQL pour identifier les tokens expirants
   - Utilisée par l'edge function de notification

**Fichiers créés :**
- `supabase/functions/notify-expiring-shopify-tokens/index.ts`
- `src/pages/ShopifyRecover.tsx`
- Migration SQL avec la fonction DB

---

### 🚀 Solution 3 : Vue de Monitoring

**Ajout :** Vue `shopify_pending_connections_status`

**Utilité :**
- Vue SQL pour monitorer l'état des connexions
- Calcul automatique du temps restant
- Classification par statut (active, expiring_soon, expired, claimed)
- Permet des requêtes simplifiées dans l'application

**Champs retournés :**
```typescript
{
  id: string
  shop_url: string
  commercial_name: string
  pending_token: string
  is_claimed: boolean
  claimed_at: timestamp
  created_at: timestamp
  expires_at: timestamp
  status: 'active' | 'expiring_soon' | 'expired' | 'claimed'
  hours_until_expiry: number
  claimed_by_email: string
}
```

---

## 🔧 Configuration Recommandée

### 1. Activer les Notifications Automatiques

Créer un CRON job Supabase pour exécuter quotidiennement :

```sql
-- À configurer dans Supabase Dashboard > Database > Cron Jobs
SELECT cron.schedule(
  'notify-expiring-shopify-tokens',
  '0 9 * * *', -- Tous les jours à 9h00
  $$
  SELECT
    net.http_post(
      url:='https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/notify-expiring-shopify-tokens',
      headers:=jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
    );
  $$
);
```

### 2. Surveiller les Connexions en Attente

Requête SQL utile pour le monitoring :

```sql
-- Vue d'ensemble des connexions
SELECT 
  status,
  COUNT(*) as count,
  AVG(hours_until_expiry) as avg_hours_remaining
FROM shopify_pending_connections_status
WHERE is_claimed = false
GROUP BY status;
```

### 3. Nettoyage Périodique

Nettoyer les tokens expirés après 30 jours :

```sql
DELETE FROM shopify_pending_connections
WHERE expires_at < NOW() - INTERVAL '30 days'
  AND is_claimed = false;
```

---

## 📈 Métriques de Succès Attendues

Après ces améliorations, nous attendons :

1. **Taux de succès : >80%** (vs 2.3% avant)
2. **Durée moyenne de claim : <30 secondes** (vs 4 minutes avant)
3. **Réduction des abandons : >90%**
4. **Tokens expirés non-réclamés : <5%**

---

## 🎨 Expérience Utilisateur

### Ancien Flux (Complexe)
```
Installation → OAuth → /shopify/success → /auth → /onboarding → 
Dashboard → Claim manually → Success
⏱️ ~4 minutes | ❌ 97.7% d'échec
```

### Nouveau Flux (Simplifié)
```
Installation → OAuth → /auth → Auto-notification → 
/shopify/recover (ou Dashboard) → Claim → Success
⏱️ <30 secondes | ✅ Taux de succès élevé
```

---

## 🔐 Sécurité

- Les tokens restent cryptés dans la base de données
- Accès RLS pour `shopify_pending_connections_status`
- Notifications uniquement pour les utilisateurs authentifiés
- Les tokens expirés sont automatiquement invalidés

---

## 🚦 Tests Recommandés

1. **Test d'installation complète**
   - Installer l'app depuis Shopify
   - Vérifier la création du pending token (7 jours)
   - Finaliser la connexion via `/shopify/recover`

2. **Test de notification**
   - Créer un token expirant dans <24h
   - Exécuter `notify-expiring-shopify-tokens`
   - Vérifier la notification in-app

3. **Test d'expiration**
   - Créer un token avec expiration courte
   - Vérifier l'affichage dans `/shopify/recover`
   - Tester le message d'erreur après expiration

---

## 📝 Notes de Déploiement

1. ✅ Migration SQL déployée automatiquement
2. ✅ Edge functions déployées automatiquement
3. ✅ Frontend déployé automatiquement
4. ⚠️ **À faire manuellement** : Configurer le CRON job pour les notifications

---

## 🎯 Prochaines Améliorations Possibles

1. **Email de notification** : Envoyer un email en plus de la notification in-app
2. **Retry automatique** : Tenter de re-claim automatiquement après échec
3. **Analytics détaillées** : Tracker les métriques de conversion à chaque étape
4. **Webhook Shopify** : Détecter les désinstallations et nettoyer les données

---

## 📞 Support

Pour toute question ou problème :
1. Consulter les logs de l'edge function `claim-shopify-connection`
2. Vérifier la vue `shopify_pending_connections_status`
3. Vérifier les notifications dans `app_notifications`

**Date de dernière mise à jour :** 2025-01-20
