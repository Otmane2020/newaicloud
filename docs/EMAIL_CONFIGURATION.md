# Configuration des Emails SuperAdmin avec Resend

## Vue d'ensemble

Le système d'emails SuperAdmin permet de:
- **Envoyer** des emails aux utilisateurs via Resend
- **Recevoir** des emails entrants via webhook Resend
- **Organiser** les emails dans des dossiers (Inbox, Sent, Drafts, Trash, Spam)
- **Répondre** aux emails directement depuis l'interface SuperAdmin

## Configuration Resend

### 1. Créer un compte Resend

1. Allez sur [https://resend.com](https://resend.com)
2. Créez un compte si vous n'en avez pas
3. Vérifiez votre domaine email sur [https://resend.com/domains](https://resend.com/domains)

### 2. Obtenir la clé API

1. Allez sur [https://resend.com/api-keys](https://resend.com/api-keys)
2. Créez une nouvelle clé API avec les permissions d'envoi
3. Ajoutez la clé dans vos secrets Lovable Cloud sous le nom `RESEND_API_KEY`

### 3. Configurer le Webhook pour recevoir les emails

**IMPORTANT:** Pour que les emails reçus apparaissent dans votre SuperAdmin, vous devez configurer un webhook Resend.

#### Étapes de configuration:

1. **Allez sur Resend Webhooks:**
   - URL: [https://resend.com/webhooks](https://resend.com/webhooks)

2. **Créez un nouveau webhook:**
   - Cliquez sur "Add webhook"
   
3. **Configurez l'URL du webhook:**
   ```
   https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/receive-admin-email
   ```
   ⚠️ **Note:** Remplacez `nekqqlhrjgmyudmmewas` par votre Project ID Supabase si différent

4. **Sélectionnez les événements:**
   - Cochez `email.received` (pour recevoir les emails entrants)
   - Vous pouvez aussi cocher d'autres événements si nécessaire

5. **Enregistrez le webhook**

### 4. Tester la réception d'emails

Une fois le webhook configuré:

1. Envoyez un email de test à votre adresse SuperAdmin configurée dans Resend
2. L'email devrait automatiquement apparaître dans la boîte de réception du SuperAdmin
3. Vous recevrez une notification en temps réel grâce à Supabase Realtime

## Structure de la base de données

La table `admin_emails` contient les champs suivants:

```sql
- id: UUID
- from_email: string
- to_email: string
- subject: string
- body: text
- html_body: text (nullable)
- status: string (pending, sent, failed, received)
- direction: string (incoming, outgoing)
- folder: string (inbox, sent, drafts, trash, spam)
- is_read: boolean
- sent_at: timestamp (nullable)
- created_at: timestamp
- error_message: text (nullable)
- sent_by: UUID (nullable, référence à auth.users)
- metadata: jsonb (nullable)
```

## Edge Functions

### `receive-admin-email`
- **URL:** `/functions/v1/receive-admin-email`
- **Méthode:** POST
- **Utilisation:** Webhook Resend pour recevoir les emails entrants
- **Permissions:** Public (verify_jwt = false)

### `send-admin-email`
- **URL:** `/functions/v1/send-admin-email`
- **Méthode:** POST
- **Utilisation:** Envoyer des emails depuis le SuperAdmin
- **Permissions:** Réservé aux administrateurs
- **Body:**
  ```json
  {
    "to": "user@example.com",
    "subject": "Subject",
    "body": "Plain text body",
    "htmlBody": "<p>HTML body</p>" // optional
  }
  ```

## Dépannage

### Les emails reçus n'apparaissent pas

1. **Vérifiez que le webhook Resend est actif:**
   - Allez dans [https://resend.com/webhooks](https://resend.com/webhooks)
   - Vérifiez que le webhook est activé et pointe vers la bonne URL

2. **Vérifiez les logs de l'edge function:**
   - Dans Lovable Cloud, allez dans Backend > Functions > `receive-admin-email`
   - Consultez les logs pour voir si les requêtes arrivent

3. **Testez manuellement le webhook:**
   - Dans la console Resend, utilisez "Test webhook" pour envoyer un payload de test
   - Vérifiez que la fonction répond avec un status 200

### Les emails envoyés échouent

1. **Vérifiez la clé API Resend:**
   - Assurez-vous que `RESEND_API_KEY` est bien configurée dans vos secrets

2. **Vérifiez le domaine:**
   - Le domaine d'envoi doit être vérifié dans Resend

3. **Consultez les logs:**
   - Backend > Functions > `send-admin-email`
   - Cherchez les erreurs dans les logs

## Fonctionnalités

- ✅ Envoi d'emails avec formatage HTML
- ✅ Réception d'emails via webhook
- ✅ Réponse aux emails
- ✅ Organisation en dossiers
- ✅ Marquage lu/non-lu
- ✅ Suppression et restauration
- ✅ Notifications en temps réel
- ✅ Bouton de test pour simuler un email entrant
