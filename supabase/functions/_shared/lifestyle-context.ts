/**
 * Determines if a product should be duplicated in scene (e.g., chairs around a table)
 * and provides specific duplication instructions for realistic lifestyle scenes.
 */
export interface ProductDuplicationConfig {
  shouldDuplicate: boolean;
  quantity: number;
  arrangement: string;
  sceneDescription: string;
}

export function getProductDuplicationConfig(productTitle: string): ProductDuplicationConfig {
  if (!productTitle) {
    return { shouldDuplicate: false, quantity: 1, arrangement: "", sceneDescription: "" };
  }
  
  const title = productTitle.toLowerCase();
  
  // === CHAISES - Salle à manger ===
  if ((title.includes('chaise') || title.includes('chair')) && 
      !title.includes('bureau') && !title.includes('office') && !title.includes('gaming')) {
    // Dining chairs should be shown as a set around a table
    return {
      shouldDuplicate: true,
      quantity: 4, // 4-6 chairs for dining scene
      arrangement: "Disposer 4 à 6 chaises IDENTIQUES autour d'une belle table à manger en bois ou marbre",
      sceneDescription: `🪑 SCÈNE SALLE À MANGER COMPLÈTE :
- DUPLIQUER cette chaise pour créer un ensemble de 4 à 6 chaises IDENTIQUES
- Les chaises doivent être disposées harmonieusement AUTOUR d'une table à manger élégante
- Table en bois noble, marbre ou verre design au centre
- UNE chaise au premier plan (celle d'origine) doit être le POINT FOCAL principal
- Les autres chaises en arrière-plan créent l'ambiance d'une vraie salle à manger
- Vaisselle élégante, verres cristal, serviettes pliées sur la table
- Suspension design au-dessus de la table, lumière chaude
- Décoration végétale : plantes vertes, vase avec fleurs fraîches`
    };
  }
  
  // === CHAISES - Bureau (ne pas dupliquer, une seule chaise) ===
  if ((title.includes('chaise') || title.includes('chair')) && 
      (title.includes('bureau') || title.includes('office') || title.includes('gaming'))) {
    return { shouldDuplicate: false, quantity: 1, arrangement: "", sceneDescription: "" };
  }
  
  // === TABOURETS - Bar/Cuisine ===
  if (title.includes('tabouret') || title.includes('stool') || title.includes('bar')) {
    return {
      shouldDuplicate: true,
      quantity: 3,
      arrangement: "Disposer 2-3 tabourets IDENTIQUES le long d'un îlot central ou comptoir bar",
      sceneDescription: `🍷 SCÈNE BAR/CUISINE MODERNE :
- DUPLIQUER ce tabouret pour créer un ensemble de 2-3 tabourets IDENTIQUES
- Les tabourets doivent être alignés le long d'un îlot central cuisine ou comptoir bar
- UN tabouret au premier plan (celui d'origine) reste le POINT FOCAL
- Îlot/comptoir en marbre, bois noble ou béton ciré
- Suspensions design au-dessus du comptoir
- Verres, bouteilles design, fruits frais sur le comptoir
- Cuisine moderne en arrière-plan, lumière naturelle`
    };
  }
  
  // === ASSIETTES/VAISSELLE - Set de table ===
  if (title.includes('assiette') || title.includes('plate') || title.includes('vaisselle')) {
    return {
      shouldDuplicate: true,
      quantity: 4,
      arrangement: "Disposer 4 assiettes IDENTIQUES sur une table dressée avec couverts et verres",
      sceneDescription: `🍽️ TABLE DRESSÉE ÉLÉGANTE :
- DUPLIQUER cette assiette pour créer un service de 4 couverts IDENTIQUES
- UNE assiette au premier plan reste le POINT FOCAL principal
- Les autres en arrière-plan créent une table complètement dressée
- Couverts en argent/or, serviettes pliées, verres cristal
- Nappe élégante ou table en bois noble
- Centre de table avec fleurs fraîches`
    };
  }
  
  // === VERRES/FLÛTES ===
  if (title.includes('verre') || title.includes('glass') || title.includes('flûte') || title.includes('coupe')) {
    return {
      shouldDuplicate: true,
      quantity: 4,
      arrangement: "Présenter 4 verres IDENTIQUES sur une table de réception ou plateau",
      sceneDescription: `🥂 SCÈNE RÉCEPTION/CÉLÉBRATION :
- DUPLIQUER ce verre pour créer un ensemble de 4 verres IDENTIQUES
- UN verre au premier plan reste le POINT FOCAL
- Les autres créent une ambiance de réception élégante
- Plateau argenté ou table marbre
- Lumière festive, bulles de champagne si approprié`
    };
  }
  
  // === COUSSINS ===
  if (title.includes('coussin') || title.includes('cushion') || title.includes('pillow')) {
    return {
      shouldDuplicate: true,
      quantity: 3,
      arrangement: "Disposer 3-4 coussins sur un canapé, avec le coussin principal bien visible",
      sceneDescription: `🛋️ COMPOSITION CANAPÉ COSY :
- DUPLIQUER ce coussin pour créer un arrangement de 3-4 coussins
- Le coussin d'origine au PREMIER PLAN, bien visible et mis en valeur
- Les autres coussins (pouvant être légèrement différents) en arrière-plan
- Canapé élégant, plaid doux, lumière chaleureuse
- Ambiance cocooning salon moderne`
    };
  }
  
  // === BOUGIES ===
  if (title.includes('bougie') || title.includes('candle')) {
    return {
      shouldDuplicate: true,
      quantity: 3,
      arrangement: "Groupe de 3 bougies de tailles variées pour ambiance déco",
      sceneDescription: `🕯️ COMPOSITION BOUGIES AMBIANCE :
- DUPLIQUER cette bougie pour créer un groupe harmonieux de 3 bougies
- LA bougie principale au PREMIER PLAN, allumée et mise en valeur
- Variations de tailles pour créer de la profondeur
- Surface élégante : plateau en bois, marbre ou verre
- Ambiance spa/détente, lumière tamisée`
    };
  }

  // === SERVIETTES ===
  if (title.includes('serviette') || title.includes('towel') || title.includes('napkin')) {
    if (title.includes('table') || title.includes('napkin')) {
      return {
        shouldDuplicate: true,
        quantity: 4,
        arrangement: "4 serviettes pliées élégamment sur une table dressée",
        sceneDescription: `🍽️ TABLE DRESSÉE :
- DUPLIQUER cette serviette pour 4 couverts
- LA serviette principale au PREMIER PLAN
- Pliage élégant, assiettes et couverts assortis`
      };
    }
    return {
      shouldDuplicate: true,
      quantity: 3,
      arrangement: "Pile de 3 serviettes pliées dans salle de bain",
      sceneDescription: `🛁 SALLE DE BAIN SPA :
- DUPLIQUER cette serviette pour une pile soignée de 3
- LA serviette du dessus au PREMIER PLAN
- Étagère élégante, plantes, bougies, ambiance spa`
      };
  }
  
  // === POTS/CACHE-POTS ===
  if (title.includes('pot') || title.includes('cache-pot') || title.includes('planter')) {
    return {
      shouldDuplicate: true,
      quantity: 3,
      arrangement: "Composition de 3 pots de tailles différentes",
      sceneDescription: `🌿 COMPOSITION VÉGÉTALE :
- DUPLIQUER ce pot en 3 tailles différentes si possible
- LE pot principal au PREMIER PLAN avec belle plante
- Composition équilibrée sur étagère ou au sol
- Plantes variées : monstera, ficus, succulentes`
    };
  }
  
  // Produits qui ne doivent PAS être dupliqués
  return { shouldDuplicate: false, quantity: 1, arrangement: "", sceneDescription: "" };
}

/**
 * Generates a lifestyle context string based on product title analysis.
 * This helps AI models create more contextual and realistic background images
 * by understanding how the product should be shown "in use".
 */
export function generateLifestyleContext(productTitle: string): string {
  if (!productTitle) return "Environnement lifestyle premium avec éclairage professionnel et contexte d'utilisation réaliste";
  
  const title = productTitle.toLowerCase();
  
  // Check if product should be duplicated - use specific scene description
  const duplicationConfig = getProductDuplicationConfig(productTitle);
  if (duplicationConfig.shouldDuplicate) {
    return duplicationConfig.sceneDescription;
  }
  
  // === VÊTEMENTS HOMME ===
  if ((title.includes('veste') || title.includes('jacket') || title.includes('blouson')) && 
      (title.includes('homme') || title.includes('men') || title.includes('masculin'))) {
    return "Homme portant élégamment cette veste dans un salon moderne avec canapé design, ou marchant dans une rue urbaine stylée avec architecture contemporaine";
  }
  
  // === VÊTEMENTS FEMME ===
  if ((title.includes('veste') || title.includes('jacket') || title.includes('blouson')) && 
      (title.includes('femme') || title.includes('women') || title.includes('féminin'))) {
    return "Femme portant cette veste avec style dans un café branché parisien ou environnement urbain chic avec terrasse";
  }
  
  if (title.includes('robe') || title.includes('dress')) {
    return "Femme élégante portant la robe dans un contexte sophistiqué: soirée, restaurant gastronomique, ou événement mondain avec lumière tamisée";
  }
  
  if (title.includes('pantalon') || title.includes('pants') || title.includes('jeans') || title.includes('jean')) {
    return "Personne portant ce vêtement avec style dans un environnement lifestyle moderne: loft industriel ou rue pavée urbaine";
  }
  
  if (title.includes('chemise') || title.includes('shirt') || title.includes('blouse')) {
    return "Personne portant ce haut dans un cadre professionnel élégant ou décontracté chic avec bureau design ou terrasse ensoleillée";
  }
  
  if (title.includes('pull') || title.includes('sweater') || title.includes('cardigan')) {
    return "Personne portant confortablement ce vêtement dans un intérieur cosy avec cheminée ou plaid, ambiance automne/hiver chaleureuse";
  }
  
  if (title.includes('manteau') || title.includes('coat') || title.includes('parka')) {
    return "Personne portant ce vêtement en extérieur urbain, rue pavée avec façades élégantes, ambiance automne/hiver stylée";
  }
  
  // === CUIR (catégorie spéciale) ===
  if (title.includes('cuir') || title.includes('leather')) {
    if (title.includes('homme') || title.includes('men')) {
      return "Homme portant élégamment ce vêtement en cuir dans un salon moderne avec fauteuil design, ou dans une rue urbaine stylée de nuit";
    }
    if (title.includes('femme') || title.includes('women')) {
      return "Femme portant ce vêtement en cuir avec attitude dans un bar lounge branché ou rue parisienne élégante";
    }
    return "Mise en scène premium mettant en valeur la texture et la qualité du cuir, éclairage dramatique, ambiance luxueuse";
  }
  
  // === CHAUSSURES ===
  if (title.includes('chaussure') || title.includes('shoe') || title.includes('basket') || 
      title.includes('sneaker') || title.includes('tennis')) {
    return "Personne en mouvement portant ces chaussures: marchant sur trottoir urbain, montée d'escalier design, ou posant avec style sur fond street";
  }
  
  if (title.includes('botte') || title.includes('boot') || title.includes('bottine')) {
    return "Personne portant les bottes dans un contexte automne/hiver: rue pavée avec feuilles, escalier en pierre, ou environnement nature élégant";
  }
  
  if (title.includes('talon') || title.includes('escarpin') || title.includes('heel')) {
    return "Femme élégante portant ces chaussures dans un contexte soirée: marbre luxueux, escalier d'hôtel, ou restaurant gastronomique";
  }
  
  if (title.includes('sandale') || title.includes('sandal') || title.includes('tong')) {
    return "Personne portant ces chaussures dans un contexte été/vacances: plage, terrasse ensoleillée, promenade bord de mer";
  }
  
  // === ACCESSOIRES ===
  if (title.includes('montre') || title.includes('watch')) {
    return "Poignet d'une personne active dans un contexte lifestyle: bureau moderne avec clavier, volant de voiture de luxe, ou activité sportive élégante";
  }
  
  if (title.includes('sac') || title.includes('bag') || title.includes('sacoche') || title.includes('pochette')) {
    if (title.includes('homme') || title.includes('men')) {
      return "Homme portant l'accessoire avec style: environnement business, café branché, ou rue urbaine contemporaine";
    }
    return "Femme portant l'accessoire avec élégance: rue parisienne, boutique de luxe, ou café terrasse chic";
  }
  
  if (title.includes('lunettes') || title.includes('glasses') || title.includes('sunglasses')) {
    return "Personne portant les lunettes dans un contexte lifestyle ensoleillé: terrasse café, plage, ou rue urbaine lumineuse";
  }
  
  if (title.includes('ceinture') || title.includes('belt')) {
    return "Détail de tenue portée: focus sur la ceinture visible à la taille, contexte casual chic ou business élégant";
  }
  
  if (title.includes('chapeau') || title.includes('hat') || title.includes('casquette') || title.includes('bonnet')) {
    return "Personne portant cet accessoire de tête: portrait lifestyle en extérieur, rue urbaine ou nature selon le style";
  }
  
  if (title.includes('bijou') || title.includes('jewelry') || title.includes('collier') || 
      title.includes('bracelet') || title.includes('bague') || title.includes('ring')) {
    return "Mise en valeur du bijou porté: gros plan sur peau, éclairage doux, contexte luxueux avec textures velours ou marbre";
  }
  
  // === MOBILIER - SALON ===
  if (title.includes('canapé') || title.includes('sofa') || title.includes('canape')) {
    return "Salon moderne et chaleureux avec plantes vertes, tapis design, table basse en bois, lumière naturelle par grandes fenêtres, coussin déco";
  }
  
  if (title.includes('fauteuil') || title.includes('armchair')) {
    return "Coin lecture élégant avec bibliothèque murale, lampe design, plaid doux, plante verte, lumière d'après-midi douce";
  }
  
  if (title.includes('table basse') || title.includes('coffee table')) {
    return "Salon lumineux avec canapé en arrière-plan, livres déco, vase avec fleurs, tapis texturé, lumière naturelle";
  }
  
  if (title.includes('meuble tv') || title.includes('tv stand') || title.includes('buffet')) {
    return "Espace living moderne avec décoration minimaliste, plantes, objets déco design, éclairage ambiant chaleureux";
  }
  
  // === MOBILIER - CHAMBRE ===
  if (title.includes('lit') || title.includes('bed') || title.includes('sommier')) {
    return "Chambre élégante avec draps de qualité blanc/beige, coussins moelleux, lumière du matin douce, table de chevet avec lampe";
  }
  
  if (title.includes('table de chevet') || title.includes('nightstand') || title.includes('commode')) {
    return "Chambre cosy avec lampe allumée, livre posé, plante en pot, mur texturé, ambiance repos et sérénité";
  }
  
  if (title.includes('armoire') || title.includes('wardrobe') || title.includes('dressing')) {
    return "Dressing ou chambre spacieuse avec vêtements bien rangés, lumière naturelle, sol parquet clair";
  }
  
  if (title.includes('matelas') || title.includes('mattress')) {
    return "Chambre lumineuse avec draps blancs luxueux, coussins moelleux, ambiance spa et bien-être, lumière douce du matin";
  }
  
  // === MOBILIER - SALLE À MANGER ===
  if (title.includes('table') && (title.includes('manger') || title.includes('dining') || title.includes('repas'))) {
    return "Salle à manger lumineuse avec 4-6 chaises assorties autour de la table, vaisselle design, vase avec fleurs fraîches, suspension au-dessus";
  }
  
  // === MOBILIER - BUREAU ===
  if (title.includes('bureau') || title.includes('desk')) {
    return "Home office moderne et inspirant avec accessoires design, plante en pot, lampe architecte, vue fenêtre";
  }
  
  if (title.includes('étagère') || title.includes('shelf') || title.includes('bibliothèque')) {
    return "Espace living avec livres bien rangés, objets déco, plantes vertes, cadres photos, ambiance cultivée";
  }
  
  // === DÉCORATION ===
  if (title.includes('lampe') || title.includes('lamp') || title.includes('luminaire') || title.includes('suspension')) {
    return "Intérieur cosy avec la lampe allumée créant une ambiance chaleureuse, coin lecture ou salon, lumière douce";
  }
  
  if (title.includes('miroir') || title.includes('mirror')) {
    return "Entrée ou salon élégant avec le miroir reflétant un intérieur lumineux et décoré avec goût";
  }
  
  if (title.includes('tapis') || title.includes('rug') || title.includes('carpet')) {
    return "Salon moderne avec le tapis comme pièce centrale, canapé en arrière-plan, table basse, plantes vertes";
  }
  
  if (title.includes('vase') || title.includes('cache-pot')) {
    return "Intérieur lumineux avec le vase sur étagère ou table, fleurs fraîches, décoration minimaliste chic";
  }
  
  if (title.includes('cadre') || title.includes('frame') || title.includes('tableau') || title.includes('poster')) {
    return "Mur élégant avec le cadre bien mis en valeur, éclairage galerie, décoration intérieure soignée";
  }
  
  if (title.includes('plante') || title.includes('plant') || title.includes('fleur')) {
    return "Intérieur lumineux avec végétation luxuriante, cache-pot design, lumière naturelle, ambiance jungle urbaine";
  }
  
  // === CUISINE ===
  if (title.includes('cuisine') || title.includes('kitchen')) {
    return "Cuisine moderne et équipée avec plan de travail impeccable, ustensiles design, herbes fraîches, lumière naturelle";
  }
  
  // === SALLE DE BAIN ===
  if (title.includes('salle de bain') || title.includes('bathroom')) {
    return "Salle de bain spa avec carrelage élégant, plantes vertes, bougies, produits de beauté, ambiance détente";
  }
  
  // === EXTÉRIEUR / JARDIN ===
  if (title.includes('jardin') || title.includes('garden') || title.includes('extérieur') || title.includes('outdoor') ||
      title.includes('terrasse') || title.includes('patio') || title.includes('balcon')) {
    return "Terrasse ou jardin ensoleillé avec mobilier outdoor, plantes, parasol, ambiance été décontractée";
  }
  
  // === ÉLECTRONIQUE ===
  if (title.includes('ordinateur') || title.includes('laptop') || title.includes('computer') || title.includes('macbook')) {
    return "Bureau moderne avec professionnel travaillant, café à côté, plante verte, environnement lumineux et inspirant";
  }
  
  if (title.includes('téléphone') || title.includes('phone') || title.includes('smartphone') || title.includes('iphone')) {
    return "Personne utilisant l'appareil dans un contexte lifestyle: café, transport, ou moment de détente moderne";
  }
  
  if (title.includes('casque') || title.includes('headphone') || title.includes('écouteur') || title.includes('airpods')) {
    return "Personne portant le casque dans un contexte lifestyle: travail focalisé, transport, ou moment musical détendu";
  }
  
  // === ENFANTS / BÉBÉ ===
  if (title.includes('enfant') || title.includes('kid') || title.includes('bébé') || title.includes('baby')) {
    return "Chambre d'enfant colorée et joyeuse avec jouets, décoration ludique, lumière naturelle douce, ambiance sécurisante";
  }
  
  // === SPORT / FITNESS ===
  if (title.includes('sport') || title.includes('fitness') || title.includes('yoga') || title.includes('gym')) {
    return "Environnement sportif dynamique: salle de sport moderne, studio yoga lumineux, ou extérieur nature pour running";
  }
  
  // === DEFAULT ===
  return "Environnement lifestyle premium avec éclairage professionnel studio, décoration contemporaine, et contexte d'utilisation réaliste du produit";
}

/**
 * Generates a full lifestyle prompt section for AI image generation
 * Now includes duplication instructions for products that should be shown as sets
 */
export function generateLifestylePromptSection(productTitle: string): string {
  const context = generateLifestyleContext(productTitle);
  const duplicationConfig = getProductDuplicationConfig(productTitle);
  
  let duplicationInstructions = "";
  if (duplicationConfig.shouldDuplicate) {
    duplicationInstructions = `
🔄 DUPLICATION DU PRODUIT - CRÉER UN ENSEMBLE :
${duplicationConfig.arrangement}

⚠️ RÈGLES DE DUPLICATION :
- Le produit D'ORIGINE de l'image reste le POINT FOCAL principal (premier plan, bien éclairé)
- DUPLIQUER ce même produit pour créer ${duplicationConfig.quantity} exemplaires IDENTIQUES
- Les copies en arrière-plan doivent être du MÊME produit, mêmes couleurs, mêmes détails
- Disposition naturelle et réaliste comme dans un vrai intérieur/catalogue
- Profondeur de champ: produit principal net, arrière-plan légèrement flou
`;
  }
  
  return `
🎯 PRODUIT SOURCE À PRÉSERVER : "${productTitle}"

🏠 CONTEXTE D'USAGE LIFESTYLE :
${context}
${duplicationInstructions}
📝 INSTRUCTIONS LIFESTYLE :
- EXTRAIRE le produit EXACT de l'image source (pixel par pixel)
- PRÉSERVER la forme, couleur et tous les détails du produit
- CRÉER l'environnement lifestyle décrit ci-dessus autour du produit
- Le produit doit être montré EN SITUATION D'USAGE RÉEL
- Pour les vêtements/accessoires : montrer le produit PORTÉ par une personne dans le décor
- Pour le mobilier/déco : montrer le produit INSTALLÉ dans l'environnement approprié
`;
}
