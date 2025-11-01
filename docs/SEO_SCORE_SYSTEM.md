# Système de Calcul du Score SEO Global

## 📊 Vue d'ensemble

Le score SEO global est calculé sur **100 points** et combine plusieurs catégories analysées séparément.

## 🎯 Fonctions de Calcul (src/lib/seoQuality.ts)

### 1. Score de Titre (`calculateTitleScore`)

**Maximum: 95 points** (volontairement limité pour plus de réalisme)

```typescript
Répartition:
- Présence: 18 points (le titre existe)
- Longueur: 26 points max
  • 50-60 caractères = 26 pts (optimal)
  • 45-49 caractères = 22 pts
  • 60-65 caractères = 22 pts
  • 40-44 caractères = 18 pts
  • <40 ou >75 caractères = 4 pts
  
- Mots-clés: 24 points max
  • Présence de catégorie: +8 pts
  • Présence de style: +8 pts
  • Présence de couleur: +8 pts
  • OU 5+ mots significatifs: 24 pts
  
- Lisibilité: 20 points max
  • Capitalisation naturelle (<15%): +10 pts
  • Faible répétition (ratio ≤1.2): +10 pts
```

**Bonus**: ±2 points de variabilité aléatoire

### 2. Score de Description (`calculateDescriptionScore`)

**Maximum: 95 points**

```typescript
Répartition:
- Présence: 18 points
- Longueur: 26 points max
  • 130-155 caractères = 26 pts (optimal)
  • 120-129 caractères = 22 pts
  • 155-165 caractères = 22 pts
  • 110-119 caractères = 18 pts
  
- Mots-clés: 24 points max
  • Même logique que les titres
  • 18+ mots significatifs = 24 pts
  
- Lisibilité: 20 points max
  • Phrases complètes (ponctuation): +10 pts
  • Faible répétition: +10 pts
```

### 3. Score de Tags (`calculateTagsScore`)

**Maximum: 20 points**

```typescript
- Présence de tags: 5 points
- Nombre optimal (3-10 tags): 10 points
- Qualité (>3 caractères): 5 points
```

### 4. Score SEO Détaillé (`calculateDetailedSeoScore`)

**Combine tous les éléments avec pondération:**

```typescript
Score final = 
  (Titre × 35%) +
  (Description × 35%) +
  (Tags × 15%) +
  (Image présente: 6 pts) +
  (URL présente: 6 pts) +
  (Optimisé par IA: +5 pts bonus)

Maximum: 95 points (plafonné)
```

## 🔍 Score Global SEO (generate-comprehensive-seo-audit)

### Calcul du Score Global

Le score global est la **moyenne de 6 catégories** :

```typescript
Score Global = (
  Homepage Score +
  Products Score +
  Collections Score +
  Blog Score +
  Images Score +
  Technical Score
) / 6
```

### Détail par Catégorie

#### 1️⃣ Homepage Score (100 points de base)
```typescript
Pénalités:
- Pas de connexion boutique: score = 0
- URL manquante: -30 points
```

#### 2️⃣ Products Score (100 points de base)
```typescript
Pénalités:
- Titres dupliqués: -2 pts par doublon (max -30)
- Meta descriptions manquantes: jusqu'à -20 pts
- SEO titles manquants: jusqu'à -15 pts

Calcul: score -= min(30, duplicates.length * 2)
```

#### 3️⃣ Collections Score (100 points de base)
```typescript
Pénalités:
- Descriptions SEO manquantes: jusqu'à -25 pts
- Images sans alt: jusqu'à -10 pts
```

#### 4️⃣ Blog Score
```typescript
- Aucun article: score = 50 (base)
- Aucun publié: -40 pts
- Meta descriptions manquantes: jusqu'à -20 pts
```

#### 5️⃣ Images Score (100 points de base)
```typescript
- Images sans alt: jusqu'à -30 pts
```

#### 6️⃣ Technical Score (100 points de base)
```typescript
- Jamais synchronisé: -10 pts
```

## 🔄 Mise à Jour du Score

### Lors d'une Optimisation SEO

```typescript
// 1. L'utilisateur optimise un produit via l'IA
await supabase.functions.invoke('generate-seo-with-deepseek', {
  body: { productId, force: true }
});

// 2. Le produit est mis à jour avec :
{
  seo_title: "nouveau titre optimisé",
  seo_description: "nouvelle description optimisée",
  optimization_count: optimization_count + 1  // +1
}

// 3. Le nouveau score est calculé automatiquement :
const newScore = calculateDetailedSeoScore(
  seo_title,
  seo_description,
  hasImage,
  hasUrl,
  tags,
  optimization_count  // Donne +5 points bonus si > 0
);

// 4. Lors du prochain audit complet :
await supabase.functions.invoke('generate-comprehensive-seo-audit');
// → Recalcule TOUS les scores de TOUS les produits
// → Calcule la moyenne pour products_score
// → Met à jour global_score
```

### Exemple Concret

**Avant optimisation:**
```typescript
Produit A:
- seo_title: "Chaussure" (trop court)
- seo_description: null
- optimization_count: 0
→ Score: 25/100

Products Score Global: 40/100 (moyenne de tous les produits)
```

**Après optimisation:**
```typescript
Produit A:
- seo_title: "Chaussure de Sport Confortable pour Homme - Nike Air"
- seo_description: "Découvrez notre chaussure Nike Air, parfaite pour le sport..."
- optimization_count: 1
→ Score: 85/100 (+5 bonus IA)

Products Score Global: 62/100 (moyenne augmentée)
Global Score: passe de 45/100 à 52/100
```

## 📈 Stockage en Base de Données

### Table: seo_audit_reports

```sql
{
  global_score: 52,        -- Moyenne des 6 catégories
  homepage_score: 70,
  products_score: 62,      -- Mis à jour
  collections_score: 45,
  blog_score: 50,
  images_score: 38,
  technical_score: 90,
  audit_results: {
    issues: [...],          -- Liste des problèmes
    recommendations: [...]  -- Actions recommandées
  }
}
```

## 🎯 Points Clés

1. **Score plafonné à 95** (jamais 100 pour plus de réalisme)
2. **Variabilité aléatoire** (±2 points) pour simuler des nuances
3. **Bonus IA** (+5 points) si `optimization_count > 0`
4. **Audit complet** recalcule TOUT à chaque exécution
5. **Scores individuels** des produits utilisent `calculateDetailedSeoScore`
6. **Score global** est la moyenne simple de 6 catégories

## 🔄 Workflow Type

```mermaid
graph TD
    A[Utilisateur clique "Optimiser"] --> B[Edge Function: generate-seo]
    B --> C[Appelle DeepSeek AI]
    C --> D[Génère SEO Title + Description]
    D --> E[Update produit dans DB]
    E --> F[optimization_count++]
    F --> G[Score calculé via calculateDetailedSeoScore]
    G --> H[Utilisateur lance Audit]
    H --> I[generate-comprehensive-seo-audit]
    I --> J[Recalcule tous les scores]
    J --> K[Moyenne = Global Score]
    K --> L[Sauvegarde seo_audit_reports]
```

## 💡 Pour Améliorer le Score

1. **Optimiser les titres** : 50-60 caractères avec mots-clés
2. **Optimiser les descriptions** : 130-155 caractères descriptifs
3. **Ajouter des tags** : 3-10 tags pertinents
4. **Textes alt images** : Descriptions détaillées
5. **Utiliser l'IA** : +5 points bonus automatique
6. **Publier du blog** : Améliore blog_score
7. **Synchroniser régulièrement** : Meilleur technical_score
