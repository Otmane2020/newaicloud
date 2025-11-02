# Configuration des Upgrades dans le Portail Client Stripe

## Problème
Les prix des différents plans (Starter, Pro, Enterprise) n'apparaissent pas dans le portail client Stripe pour permettre les upgrades/downgrades.

## Solution
La configuration des produits éligibles pour les upgrades se fait dans le Dashboard Stripe, pas via l'API.

## Étapes de configuration

### 1. Accéder aux paramètres du Customer Portal
1. Connectez-vous à votre Dashboard Stripe
2. Allez dans **Settings** (Paramètres)
3. Cliquez sur **Billing** → **Customer portal** (Portail client)

### 2. Activer les mises à jour d'abonnement
1. Dans la section **Subscriptions**, cliquez sur **Edit** (Modifier)
2. Activez l'option **"Allow customers to update subscriptions"** (Permettre aux clients de mettre à jour leurs abonnements)

### 3. Configurer les produits éligibles
1. Dans **"Subscription products"**, cliquez sur **Choose eligible products**
2. Sélectionnez TOUS les produits que vous voulez rendre disponibles pour upgrade/downgrade :
   - ✅ **Starter Monthly** ($9.99/mois)
   - ✅ **Starter Yearly** ($95.88/an)
   - ✅ **Pro Monthly** ($49/mois)
   - ✅ **Pro Yearly USD** ($468/an)
   - ✅ **Enterprise Plan** ($199/mois)
   - ✅ **Enterprise Plan** ($1,908/an)

3. Cliquez sur **Save** pour enregistrer

### 4. Activer les codes promotionnels (optionnel)
1. Dans la section **Features**, trouvez **Promotion codes**
2. Activez **"Enable promotion code redemption"**
3. Cliquez sur **Save**

### 5. Configurer les actions autorisées
Assurez-vous que les options suivantes sont activées :
- ✅ **Switch to a different plan** (Changer de plan)
- ✅ **Cancel subscription** (Annuler l'abonnement)
- ✅ **Pause subscription** (optionnel)

## Vérification
1. Allez sur votre application
2. Cliquez sur **Gérer l'abonnement**
3. Vérifiez que tous vos plans apparaissent dans le portail Stripe

## Notes importantes
- Les changements prennent effet immédiatement
- Les clients verront uniquement les plans que vous avez sélectionnés
- Stripe gère automatiquement les calculs de prorata pour les upgrades/downgrades
- Les codes promotionnels ne s'affichent que si cette option est activée

## Support
Si vous avez des questions, consultez la [documentation Stripe](https://docs.stripe.com/billing/subscriptions/build-subscriptions?ui=stripe-hosted#manage-subscriptions) ou contactez le support Stripe.
