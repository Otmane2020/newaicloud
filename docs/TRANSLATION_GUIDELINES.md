# Guide de Traduction / Translation Guidelines

## 🌍 Principe de base / Basic principle

**TOUJOURS** créer les traductions FR et EN simultanément lors de toute modification de code contenant du texte.

**ALWAYS** create FR and EN translations simultaneously when modifying any code containing text.

---

## 📋 Checklist pour chaque modification / Checklist for each modification

### ✅ Avant de coder / Before coding
- [ ] Identifier tous les textes qui seront affichés à l'utilisateur
- [ ] Vérifier si les clés de traduction existent déjà
- [ ] Planifier la structure des nouvelles clés si nécessaire

### ✅ Pendant le développement / During development
1. **Ajouter dans `src/lib/translations/fr.ts`** la traduction française
2. **Ajouter dans `src/lib/translations/en.ts`** la traduction anglaise
3. **Utiliser le hook `useTranslation()`** dans le composant
4. **Référencer avec `t.section.key`** au lieu de strings hardcodées

### ✅ Après le développement / After development
- [ ] Vérifier qu'aucun texte n'est hardcodé en français ou anglais
- [ ] Tester le changement de langue dans l'interface
- [ ] S'assurer que tous les textes s'affichent correctement dans les deux langues

---

## 🚫 À NE JAMAIS FAIRE / NEVER DO THIS

### ❌ Texte hardcodé / Hardcoded text
```tsx
// ❌ MAUVAIS / BAD
<h1>Page non trouvée</h1>
<Button>Retour à l'accueil</Button>
```

### ✅ Texte traduit / Translated text
```tsx
// ✅ BON / GOOD
import { useTranslation } from "@/lib/language";

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t.notFound.title}</h1>
      <Button>{t.notFound.backHome}</Button>
    </>
  );
};
```

---

## 📝 Structure des fichiers de traduction / Translation files structure

### Fichiers concernés / Affected files
- `src/lib/translations/fr.ts` - Traductions françaises
- `src/lib/translations/en.ts` - Traductions anglaises
- `src/lib/translations/index.ts` - Export des traductions
- `src/lib/language.tsx` - Contexte de langue

### Organisation des clés / Key organization
```typescript
export const translations = {
  // Section logique / Logical section
  dashboard: {
    title: "Titre",
    description: "Description",
    // Sous-sections / Sub-sections
    actions: {
      save: "Sauvegarder",
      cancel: "Annuler"
    }
  },
  
  // Autre section / Another section
  notFound: {
    title: "Page non trouvée",
    description: "La page n'existe pas",
    backHome: "Retour à l'accueil"
  }
};
```

---

## 🔧 Utilisation dans les composants / Usage in components

### Import du hook / Hook import
```tsx
import { useTranslation } from "@/lib/language";
```

### Utilisation basique / Basic usage
```tsx
const { t, language, setLanguage } = useTranslation();

// Accès aux traductions / Access translations
<h1>{t.dashboard.title}</h1>
<p>{t.dashboard.description}</p>
```

### Avec variables / With variables
```tsx
// Dans le fichier de traduction / In translation file
welcome: "Bienvenue {{name}} !"

// Dans le composant / In component
const { tf } = useTranslation();
<p>{tf('dashboard.welcome', { name: 'Marie' })}</p>
// Affiche / Displays: "Bienvenue Marie !"
```

---

## 🎯 Cas spécifiques / Specific cases

### Boutons et actions / Buttons and actions
```tsx
// ✅ BON / GOOD
<Button>{t.common.save}</Button>
<Button>{t.common.cancel}</Button>
<Button>{t.common.delete}</Button>
```

### Messages d'erreur / Error messages
```tsx
// ✅ BON / GOOD
toast({
  title: t.errors.general,
  description: t.errors.tryAgain,
  variant: "destructive"
});
```

### Formulaires / Forms
```tsx
// ✅ BON / GOOD
<Label>{t.forms.email}</Label>
<Input placeholder={t.forms.emailPlaceholder} />
```

### Metadata SEO
```tsx
// ✅ BON / GOOD
<title>{t.seo.pageTitle}</title>
<meta name="description" content={t.seo.pageDescription} />
```

---

## 🔍 Vérification rapide / Quick check

### Rechercher les textes hardcodés / Search for hardcoded text
```bash
# Rechercher du texte français hardcodé / Search for hardcoded French text
grep -r "\"[A-Z][a-zéèêà]* [a-zéèêà]*\"" src/

# Rechercher des strings avec espaces (probablement du texte) / Search strings with spaces
grep -r "'[A-Z][a-z]* [a-z]*'" src/
```

### Pages à vérifier en priorité / Priority pages to check
- [x] `src/pages/NotFound.tsx` - ✅ Corrigé
- [ ] Toutes les autres pages dans `src/pages/`
- [ ] Tous les composants dans `src/components/`

---

## 📚 Exemples de sections courantes / Common sections examples

### Navigation
```typescript
navigation: {
  home: "Accueil",
  products: "Produits",
  blog: "Blog",
  settings: "Paramètres"
}
```

### Actions communes / Common actions
```typescript
common: {
  save: "Enregistrer",
  cancel: "Annuler",
  delete: "Supprimer",
  edit: "Modifier",
  close: "Fermer",
  back: "Retour",
  next: "Suivant"
}
```

### États / States
```typescript
states: {
  loading: "Chargement...",
  success: "Succès !",
  error: "Erreur",
  empty: "Aucun résultat"
}
```

---

## 🚀 Workflow recommandé / Recommended workflow

1. **Créer la page/composant** avec des `t.section.key` temporaires
2. **Ajouter les traductions** dans `fr.ts` et `en.ts` simultanément
3. **Tester** le changement de langue via `<LanguageSwitcher />`
4. **Valider** qu'aucun texte n'est hardcodé

---

## 💡 Rappel important / Important reminder

> **Chaque texte visible par l'utilisateur DOIT être traduit.**  
> **Every text visible to users MUST be translated.**

> **Aucun texte hardcodé en français ou anglais n'est acceptable.**  
> **No hardcoded French or English text is acceptable.**

---

## 📞 Questions / Questions

En cas de doute sur l'organisation des traductions, référez-vous aux fichiers existants :
- `src/lib/translations/fr.ts`
- `src/lib/translations/en.ts`

If unsure about translation organization, refer to existing files:
- `src/lib/translations/fr.ts`
- `src/lib/translations/en.ts`
