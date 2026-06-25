# Refonte du robot Vendix selon la maquette

Objectif : remplacer le design actuel du `RobotFace` (tête écran rectangulaire austère + torse blanc avec panneau noir en V + HUD cyan) par le robot mascotte de la maquette : visage carré arrondi bleu, gros yeux orange ronds, sourire, corps rond blanc avec col en V noir et label `VENDIX`.

## Changements visuels du robot

**Tête (visage écran)**
- Forme carrée arrondie (`rounded-[2rem]`), proportions plus compactes (env. 200×190).
- Coque externe gris très foncé fine (pas de gros bord épais actuel).
- Écran intérieur bleu uni vif (#3B82F6 / #4F8DF7), pas de gradient sombre ni scanlines.
- Deux gros yeux ronds blancs avec iris orange/ambré dominant et petite pupille noire centrée (œil entier ~45 % de la hauteur).
- Sourire courbe simple noir épais (pas de bouche rouge ouverte par défaut). Animation de parole : la courbe s'ouvre légèrement.
- Plus de joues roses ni scanlines.
- Petit point caméra/LED discret au-dessus du visage.

**Cou**
- Cou court gris foncé centré, étroit (env. 40 px de large), reliant tête et corps.

**Corps**
- Forme ovoïde / capsule blanche arrondie (`rounded-[2.5rem]`), pas de socle ni d'épaules apparentes.
- Panneau noir en V au centre haut (col), occupant environ 45 % de la largeur.
- Petite LED verte centrale dans le V (état idle → cyan en speaking).
- Label `VENDIX` discret en bas du corps, petit, gris clair, sans cadre cyan lumineux.
- Suppression des bras latéraux, du socle, de l'ombre cyan au sol, des halos circulaires en rotation.

**Animations conservées**
- Clignement des yeux.
- Wander des yeux (regard).
- Animation de bouche en parole.
- Pulsation discrète de la LED de poitrine selon l'état.

## Fichier touché

- `src/pages/VendixChat.tsx` → composant `RobotFace` réécrit (uniquement le JSX/styles, signatures et props inchangées).

Aucun changement sur le chat, le panier, les produits, ou les edge functions. Les corrections précédentes (échelle, max 2 produits, label "Featured Products") restent en place.
