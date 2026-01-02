# Configuration des Webhooks Shopify

## Vue d'ensemble

Les webhooks Shopify permettent de recevoir des notifications en temps réel lorsque des événements se produisent dans votre boutique. Cette intégration remplace le polling périodique par des mises à jour instantanées.

## URL du Webhook

```
https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-webhook
```

## Topics de Webhooks Supportés

### Produits
- `products/create` - Nouveau produit créé
- `products/update` - Produit mis à jour
- `products/delete` - Produit supprimé

### Collections
- `collections/create` - Nouvelle collection créée
- `collections/update` - Collection mise à jour
- `collections/delete` - Collection supprimée

### Commandes
- `orders/create` - Nouvelle commande créée

## Configuration dans Shopify Admin

### Étape 1 : Accéder aux Webhooks

1. Connectez-vous à votre **Shopify Admin**
2. Allez dans **Settings** > **Notifications**
3. Descendez jusqu'à la section **Webhooks**

### Étape 2 : Créer les Webhooks

Pour chaque topic que vous souhaitez activer :

1. Cliquez sur **Create webhook**
2. Sélectionnez l'**Event** (ex: Product creation)
3. Format : **JSON**
4. URL : `https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/shopify-webhook`
5. API version : **Latest** ou `2024-01`
6. Cliquez sur **Save webhook**

### Étape 3 : Webhooks Recommandés

Pour une synchronisation complète, créez les webhooks suivants :

| Event | Topic | Description |
|-------|-------|-------------|
| Product creation | products/create | Nouveau produit ajouté |
| Product update | products/update | Produit modifié |
| Product deletion | products/delete | Produit supprimé |
| Collection creation | collections/create | Nouvelle collection |
| Collection update | collections/update | Collection modifiée |
| Collection deletion | collections/delete | Collection supprimée |
| Order creation | orders/create | Nouvelle commande |

## Sécurité

Les webhooks sont **automatiquement validés** via HMAC SHA-256 en utilisant votre API Secret Key Shopify. Aucune configuration supplémentaire n'est nécessaire.

## Test des Webhooks

### Méthode 1 : Via Shopify Admin

1. Allez dans **Settings** > **Notifications** > **Webhooks**
2. Cliquez sur un webhook créé
3. Cliquez sur **Send test notification**

### Méthode 2 : Actions réelles

Effectuez une action réelle dans Shopify (créer un produit, modifier une collection, etc.) et vérifiez que les données sont synchronisées instantanément dans votre application.

## Surveillance des Webhooks

### Dans Shopify Admin

1. Allez dans **Settings** > **Notifications** > **Webhooks**
2. Cliquez sur un webhook pour voir l'historique des tentatives
3. Vérifiez les **Recent deliveries** et les statuts

### Dans l'Application

Les logs des webhooks sont disponibles dans les logs de l'edge function `shopify-webhook`.

## Dépannage

### Webhook échoue avec erreur 404

- Vérifiez que le domaine de la boutique (`shop_domain`) correspond exactement à celui enregistré dans `shopify_connections`

### Webhook échoue avec erreur 401 (Invalid HMAC)

- L'API Secret Key dans `shopify_connections` ne correspond pas à celle de Shopify
- Vérifiez que la connexion Shopify a été établie correctement

### Les données ne se synchronisent pas

1. Vérifiez que le webhook est **enabled** dans Shopify Admin
2. Vérifiez l'historique des tentatives dans Shopify
3. Consultez les logs de l'edge function pour les erreurs

## Avantages des Webhooks

✅ **Temps réel** : Mises à jour instantanées sans délai  
✅ **Efficace** : Pas de polling périodique inutile  
✅ **Économique** : Réduit les appels API Shopify  
✅ **Fiable** : Shopify retente automatiquement en cas d'échec  
✅ **Complet** : Synchronisation bidirectionnelle automatique

## Migration depuis le Polling

L'activation des webhooks **remplace automatiquement** le système de polling périodique. Aucune action supplémentaire n'est requise une fois les webhooks configurés.

## Support

Pour toute question ou problème avec les webhooks, consultez :
- [Documentation officielle Shopify Webhooks](https://shopify.dev/docs/api/admin-rest/latest/resources/webhook)
- Logs de l'edge function `shopify-webhook`
