# Configuration des Emails Stripe pour les Invoices

## Problème
Les clients ne reçoivent pas d'emails de Stripe après paiement/invoice.

## Solution
Cette configuration doit être effectuée **manuellement** dans le Stripe Dashboard.

## Étapes de configuration

### 1. Activer les emails automatiques
1. Connectez-vous à votre [Stripe Dashboard](https://dashboard.stripe.com)
2. Allez dans **Settings** → **Emails**
3. Trouvez la section **Successful payments**
4. Activez l'email "Successful payment"
5. Trouvez la section **Invoices**
6. Activez les emails suivants :
   - "Invoice created"
   - "Invoice payment succeeded"
   - "Invoice payment failed"

### 2. Personnaliser les templates (optionnel)
1. Dans la même page, cliquez sur **Customize**
2. Vous pouvez personnaliser :
   - Le logo de votre entreprise
   - Les couleurs
   - Le texte du footer
   - Le nom d'expéditeur

### 3. Tester l'envoi
1. Créez un paiement test avec un email valide
2. Vérifiez que l'email est reçu
3. Si ce n'est pas le cas, vérifiez la section "Email logs" dans Stripe

## Notes importantes
- Les emails sont envoyés automatiquement par Stripe, pas par votre application
- Il peut y avoir un délai de quelques minutes
- Vérifiez les spams si l'email n'arrive pas
- Pour les tests, utilisez le mode test de Stripe

## Lien de configuration directe
- [Stripe Email Settings](https://dashboard.stripe.com/settings/emails)

## Support
Si les problèmes persistent :
1. Vérifiez les logs d'emails dans Stripe Dashboard → Developers → Logs
2. Contactez le support Stripe
3. Assurez-vous que l'email du client est valide dans votre base de données
