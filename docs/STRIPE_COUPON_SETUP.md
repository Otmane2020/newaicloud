# Configuration des codes promo dans le Customer Portal Stripe

## Pourquoi vous ne voyez pas le champ code promo

Le champ de saisie des codes promo dans le **Stripe Customer Portal** doit être activé dans votre **tableau de bord Stripe**. Cette configuration n'est pas contrôlable par le code de l'application.

## Comment activer les codes promo

### 1. Accéder aux paramètres du Customer Portal

1. Connectez-vous à votre [tableau de bord Stripe](https://dashboard.stripe.com)
2. Dans le menu de gauche, cliquez sur **Settings** (⚙️ Paramètres)
3. Dans la section **Billing**, cliquez sur **Customer portal**

### 2. Activer les codes promo

1. Dans l'onglet **Features** (Fonctionnalités)
2. Trouvez la section **Promotion codes** (Codes promo)
3. Activez l'option **"Allow customers to redeem promotion codes"** 
   - ✅ Cochez cette case pour permettre aux clients d'entrer des codes promo

### 3. Configurer les paramètres des codes promo (optionnel)

Vous pouvez personnaliser :
- Quand les clients peuvent saisir un code promo (au checkout, lors du changement d'abonnement, etc.)
- Quels types de codes promo sont acceptés

### 4. Créer des codes promo dans Stripe

Pour créer des codes promo à utiliser :

1. Dans le tableau de bord Stripe, allez dans **Products** → **Coupons**
2. Cliquez sur **Create coupon**
3. Configurez votre réduction :
   - **Pourcentage** (ex: 20% de réduction)
   - **Montant fixe** (ex: 10€ de réduction)
   - **Durée** : une fois, plusieurs mois, ou pour toujours
4. Une fois le coupon créé, créez un **Promotion code**
5. Définissez le code que les clients devront saisir (ex: `PROMO2024`)

## Utilisation dans l'application

Une fois configuré dans Stripe, vos clients verront automatiquement un champ **"Code promo"** ou **"Coupon code"** dans le Customer Portal lors de :
- La souscription initiale
- Le changement de plan
- Le renouvellement d'abonnement

## Documentation officielle Stripe

Pour plus de détails, consultez la [documentation officielle Stripe sur le Customer Portal](https://docs.stripe.com/customer-management/activate-no-code-customer-portal)

## Vérification

Pour tester si c'est bien activé :
1. Ouvrez le Customer Portal depuis votre application (bouton "Gérer l'abonnement")
2. Vous devriez voir un champ pour saisir un code promo
3. Si vous ne le voyez pas, vérifiez les paramètres Stripe ci-dessus

---

**Note** : La configuration est immédiate. Aucun délai n'est nécessaire après l'activation dans Stripe.
