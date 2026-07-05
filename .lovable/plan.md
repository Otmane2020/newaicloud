

# Plan : Export CSV et Excel - Optimized Product Content

## Objectif
Ajouter deux boutons d'export dans la page **Optimized Product Content** (`ProductTitleDescription.tsx`) permettant d'exporter tous les produits filtrés avec leurs champs existants en **CSV** et **Excel (.xlsx)**.

## Champs exportes

Les colonnes suivantes seront incluses dans l'export :

| Colonne | Champ source |
|---------|-------------|
| Titre original | `title` |
| Titre SEO | `seo_title` |
| Titre optimise | `optimized_title` |
| Titre regenere | `regenerated_title` |
| Description SEO | `seo_description` |
| Vendeur | `vendor` |
| Type produit | `product_type` |
| Handle | `handle` |
| Statut | `status` |
| Tags | `tags` |
| Prix | `price` |
| Categorie | `category` |
| Sous-categorie | `sub_category` |
| Couleur IA | `ai_color` |
| Materiau IA | `ai_material` |
| Contenu Premium | `has_landing_page` (Oui/Non) |
| Synchro Shopify | `seo_synced_to_shopify` (Oui/Non) |
| Shopify ID | `shopify_id` |
| URL image | `image_url` |

## Modifications prevues

### 1. Installer la dependance `xlsx` (SheetJS)
- Ajouter le package `xlsx` pour generer des fichiers Excel natifs (.xlsx) directement cote client, sans serveur.

### 2. Creer un utilitaire d'export : `src/lib/exportProducts.ts`
- Fonction `exportProductsToCSV(products, filename)` : genere un fichier CSV avec BOM UTF-8 (compatibilite Excel) et le telecharge automatiquement.
- Fonction `exportProductsToExcel(products, filename)` : genere un fichier .xlsx avec mise en forme (en-tetes en gras, colonnes auto-dimensionnees) et le telecharge.
- Fonction partagee `mapProductsToExportRows(products)` : transforme les produits en lignes avec les colonnes definies ci-dessus. Traduit les booleens en "Oui"/"Non".

### 3. Modifier `src/pages/ProductTitleDescription.tsx`
- Ajouter deux boutons dans la zone d'actions du hero banner (a cote des boutons existants "Optimiser tout", "Synchroniser tout", etc.) :
  - **Export CSV** : icone Download, appelle `exportProductsToCSV(filteredProducts)`
  - **Export Excel** : icone FileSpreadsheet, appelle `exportProductsToExcel(filteredProducts)`
- Les exports porteront sur les produits **filtres** (respectant la recherche, filtre collection, filtre statut actifs).

### 4. Ajouter les traductions FR et EN
- **Francais** (`src/lib/translations/fr.ts`) : dans `contentOptimization.buttons`
  - `exportCSV: "Export CSV"`
  - `exportExcel: "Export Excel"`
- Dans `contentOptimization.toasts` :
  - `exportSuccess: "{{count}} produit(s) exporte(s) avec succes"`
  - `exportError: "Erreur lors de l'export"`
  - `noProductToExport: "Aucun produit a exporter"`
- **Anglais** (`src/lib/translations/en.ts`) : traductions equivalentes en anglais

## Details techniques

- L'export CSV utilisera un BOM UTF-8 (`\uFEFF`) pour garantir l'affichage correct des accents dans Excel.
- L'export Excel utilisera la librairie `xlsx` (SheetJS) qui fonctionne entierement cote client sans necessite de serveur.
- Les deux exports sont bases sur `filteredProducts` (les produits apres application des filtres de recherche, collection et statut).
- Le nom du fichier genere inclura la date : `products-export-2026-02-08.csv` / `.xlsx`

