/**
 * Generates a lifestyle context string based on product title analysis.
 * This helps AI models create more contextual and realistic background images
 * by understanding how the product should be shown "in use".
 */
export function generateLifestyleContext(productTitle: string): string {
  if (!productTitle) return "Environnement lifestyle premium avec éclairage professionnel et contexte d'utilisation réaliste";
  
  const title = productTitle.toLowerCase();
  
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
    return "Salle à manger lumineuse avec chaises assorties, vaisselle design, vase avec fleurs fraîches, suspension au-dessus";
  }
  
  if (title.includes('chaise') || title.includes('chair')) {
    if (title.includes('bureau') || title.includes('office')) {
      return "Bureau home office moderne avec écran, plante verte, étagère murale, lumière naturelle latérale";
    }
    return "Espace repas ou salon avec table en bois, décoration végétale, lumière naturelle, ambiance scandinave";
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
  
  if (title.includes('coussin') || title.includes('cushion') || title.includes('pillow')) {
    return "Canapé ou lit confortable avec coussins arrangés, plaid doux, lumière naturelle, ambiance cocooning";
  }
  
  if (title.includes('vase') || title.includes('pot') || title.includes('cache-pot')) {
    return "Intérieur lumineux avec le vase sur étagère ou table, fleurs fraîches, décoration minimaliste chic";
  }
  
  if (title.includes('cadre') || title.includes('frame') || title.includes('tableau') || title.includes('poster')) {
    return "Mur élégant avec le cadre bien mis en valeur, éclairage galerie, décoration intérieure soignée";
  }
  
  if (title.includes('bougie') || title.includes('candle')) {
    return "Ambiance cosy et relaxante avec bougies allumées, salle de bain spa ou salon cocooning, lumière tamisée";
  }
  
  if (title.includes('plante') || title.includes('plant') || title.includes('fleur')) {
    return "Intérieur lumineux avec végétation luxuriante, cache-pot design, lumière naturelle, ambiance jungle urbaine";
  }
  
  // === CUISINE ===
  if (title.includes('cuisine') || title.includes('kitchen')) {
    return "Cuisine moderne et équipée avec plan de travail impeccable, ustensiles design, herbes fraîches, lumière naturelle";
  }
  
  // === SALLE DE BAIN ===
  if (title.includes('salle de bain') || title.includes('bathroom') || title.includes('serviette') || title.includes('towel')) {
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
 */
export function generateLifestylePromptSection(productTitle: string): string {
  const context = generateLifestyleContext(productTitle);
  
  return `
🎯 PRODUIT SOURCE À PRÉSERVER : "${productTitle}"

🏠 CONTEXTE D'USAGE LIFESTYLE :
${context}

📝 INSTRUCTIONS LIFESTYLE :
- EXTRAIRE le produit EXACT de l'image source (pixel par pixel)
- PRÉSERVER la forme, couleur et tous les détails du produit
- CRÉER l'environnement lifestyle décrit ci-dessus autour du produit
- Le produit doit être montré EN SITUATION D'USAGE RÉEL
- Pour les vêtements/accessoires : montrer le produit PORTÉ par une personne dans le décor
- Pour le mobilier/déco : montrer le produit INSTALLÉ dans l'environnement approprié
`;
}
