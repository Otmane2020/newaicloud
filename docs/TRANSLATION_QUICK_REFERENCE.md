# Translation Quick Reference / Référence Rapide des Traductions

## 🚫 JAMAIS / NEVER

```typescript
// ❌ Toast hardcodé
toast.error("Erreur de connexion");
toast.success("Saved successfully!");

// ❌ Error hardcodé
throw new Error("Non authentifié");
throw new Error("Not authenticated");

// ❌ JSX hardcodé
<h1>Bienvenue</h1>
<Button>Enregistrer</Button>

// ❌ Props hardcodées
<Input placeholder="Entrez votre email" />
<Label>Nom d'utilisateur</Label>
```

## ✅ TOUJOURS / ALWAYS

```typescript
// ✅ Import requis
import { useTranslation } from "@/lib/language";

function MyComponent() {
  const { t, tf } = useTranslation();
  
  // ✅ Toast traduit
  toast.error(t.toasts.error.connection);
  toast.success(t.toasts.success.saved);
  
  // ✅ Error traduit
  throw new Error(t.errors.auth.notAuthenticated);
  
  // ✅ JSX traduit
  <h1>{t.common.welcome}</h1>
  <Button>{t.common.actions.save}</Button>
  
  // ✅ Props traduites
  <Input placeholder={t.forms.placeholders.email} />
  <Label>{t.forms.labels.username}</Label>
  
  // ✅ Avec variables
  toast.success(tf('toasts.itemsSaved', { count: 5 }));
  // Affiche: "5 items saved" ou "5 éléments enregistrés"
}
```

## 📋 Checklist Rapide / Quick Checklist

Avant chaque commit / Before each commit:
- [ ] Aucun toast hardcodé / No hardcoded toasts
- [ ] Aucune erreur hardcodée / No hardcoded errors  
- [ ] Aucun texte JSX hardcodé / No hardcoded JSX text
- [ ] Toutes les props sont traduites / All props are translated
- [ ] `useTranslation()` est importé / `useTranslation()` is imported
- [ ] Les tests passent / Tests pass: `npm run validate:translations`

## 🔧 Commandes Utiles / Useful Commands

```bash
# Vérifier les traductions
npm run validate:translations

# Audit complet
npm run audit:translations

# Voir le rapport d'audit
cat translation-audit-report.json
```

## 📚 Sections Courantes / Common Sections

```typescript
t.common.actions.save        // Enregistrer / Save
t.common.actions.cancel      // Annuler / Cancel
t.common.actions.delete      // Supprimer / Delete
t.common.welcome             // Bienvenue / Welcome
t.toasts.success.saved       // Sauvegardé / Saved
t.toasts.error.generic       // Erreur / Error
t.forms.labels.email         // Email
t.forms.placeholders.email   // Entrez votre email / Enter your email
t.errors.auth.notAuthenticated // Non authentifié / Not authenticated
```

## 🎯 Règle d'Or / Golden Rule

> **TOUT texte visible par l'utilisateur DOIT utiliser t. ou tf()**  
> **ALL user-facing text MUST use t. or tf()**
