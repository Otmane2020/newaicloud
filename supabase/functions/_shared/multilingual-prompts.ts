// Multilingual SEO Prompts System
// Supports: French (fr), English (en), German (de), Spanish (es), Italian (it)

interface ProductData {
  title: string;
  description?: string;
  product_type?: string;
  category?: string;
  sub_category?: string;
  ai_color?: string;
  ai_material?: string;
  style?: string;
  vendor?: string;
  tags?: string;
  keywords?: string[];
  visionContext?: string;
}

interface CollectionData {
  title: string;
  handle: string;
  body_html?: string;
  productTitles?: string;
}

interface PageData {
  title: string;
  textContent: string;
  isHomepage?: boolean;
}

interface ArticleData {
  title: string;
  content: string;
  keywords?: string[];
}

export const SEO_PROMPTS = {
  fr: {
    product: (data: ProductData) => `En tant qu'expert SEO e-commerce français, générez un titre et une méta-description optimisés pour ce produit:

**INFORMATIONS DU PRODUIT:**
- Titre: ${data.title}
- Description: ${data.description || "Non fournie"}
- Type: ${data.product_type || "Non spécifié"}
- Catégorie: ${data.category || "Non spécifié"}
- Sous-catégorie: ${data.sub_category || "Non spécifié"}
- Couleur: ${data.ai_color || "Non spécifié"}
- Matériau: ${data.ai_material || "Non spécifié"}
- Style: ${data.style || "Non spécifié"}
- Marque: ${data.vendor || "Non spécifié"}
- Tags: ${data.tags || "Non spécifié"}
${data.keywords ? `- Mots-clés extraits: ${data.keywords.slice(0, 10).join(", ")}` : ''}
${data.visionContext || ''}

**EXIGENCES STRICTES SEO:**

TITRE (55-65 caractères):
- Inclure le mot-clé principal (type de produit)
- Ajouter 1-2 attributs clés (couleur, matériau, style)
- Rendre accrocheur et naturel
- SANS nom de marque à la fin
- Langue française uniquement

MÉTA-DESCRIPTION (150-160 caractères):
- Intégrer mots-clés principaux et secondaires naturellement
- Mettre en avant bénéfices et caractéristiques uniques
- Inclure appel à l'action subtil
- Description engageante et descriptive
- Langue française uniquement

**FORMAT DE RÉPONSE EXCLUSIF (JSON uniquement):**
{
  "seo_title": "Votre titre SEO optimisé ici",
  "seo_description": "Votre méta-description optimisée ici"
}`,

    collection: (data: CollectionData) => `Générez du contenu SEO optimisé pour cette collection Shopify:

Titre: ${data.title}
Handle: ${data.handle}
Description actuelle: ${data.body_html ? data.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : 'Pas de description'}
Produits dans la collection: ${data.productTitles || 'Pas encore de produits'}

**VOUS DEVEZ GÉNÉRER LES 3 CHAMPS OBLIGATOIREMENT:**

1. seo_title: Titre SEO optimisé de 50-60 caractères avec mots-clés principaux
2. seo_description: Meta description SEO de 150-160 caractères, engageante avec appel à l'action
3. body_html: Description HTML enrichie de 200-400 caractères avec balises <p> pour la page de collection

**FORMAT JSON OBLIGATOIRE (tous les champs requis):**
{
  "seo_title": "Titre SEO optimisé ici",
  "seo_description": "Meta description optimisée ici",
  "body_html": "<p>Description HTML enrichie ici</p>"
}

NE PAS OUBLIER le champ seo_description, c'est crucial pour le SEO !`,

    pageHomepage: (data: PageData) => `Tu es un expert SEO français spécialisé en e-commerce Shopify.

${data.textContent}

OBJECTIF: Créer un titre SEO et une meta description qui:
1. Incluent naturellement le nom de la boutique
2. Mentionnent le secteur d'activité
3. Intègrent 1-2 mots-clés parmi les tags principaux ou produits détectés
4. Créent l'urgence avec un appel à l'action
5. Se démarquent de la concurrence

RÈGLES STRICTES :
- Titre SEO : Exactement 50-60 caractères
- Meta Description : Exactement 150-160 caractères, engageant avec chiffre ou bénéfice concret
- Utilise des power words (Découvrez, Profitez, Exclusive, Premium, etc.)
- Mentionne un avantage compétitif (livraison gratuite, garantie, qualité, choix, etc.)

FORMAT JSON strict uniquement (sans markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    pageRegular: (data: PageData) => `Tu es un expert SEO français spécialisé en e-commerce Shopify.

Page à optimiser:
Titre: ${data.title}
Contenu: ${data.textContent}

OBJECTIF: Créer un titre SEO et une meta description de haute qualité qui:
1. Intègrent le nom EXACT de la boutique fourni dans le contenu (JAMAIS de placeholder générique comme "[Nom de la Boutique]")
2. Utilisent le nom de boutique réel mentionné dans le texte ci-dessus
3. Utilisent des mots-clés pertinents liés au contenu de la page
4. Créent de l'engagement avec un appel à l'action
5. Se démarquent et incitent au clic

RÈGLES STRICTES :
- Titre SEO : Exactement 55-65 caractères, inclure le nom de la page et 1-2 mots-clés
- Meta Description : Exactement 150-160 caractères, engageante avec bénéfices concrets
- Utilise des power words (Découvrez, Contactez, Profitez, etc.)
- Pour une page de contact: mentionner service client, réponse rapide, assistance
- Pour d'autres pages: mettre en avant l'information utile et la valeur ajoutée
- IMPORTANT: Utilise UNIQUEMENT le nom de boutique réel fourni dans le contenu, JAMAIS de texte entre crochets ou de placeholder

FORMAT JSON strict uniquement (sans markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    article: (data: ArticleData) => `Génère un titre SEO optimisé et une meta description pour cet article de blog:

Titre: ${data.title}
Contenu (extrait): ${data.content.substring(0, 500)}
${data.keywords ? `Mots-clés: ${data.keywords.join(', ')}` : ''}

Retourne un JSON:
{
  "seo_title": "Titre SEO (50-60 caractères)",
  "meta_description": "Meta description (150-160 caractères)"
}`,

    tags: (data: ProductData) => `Générez des tags SEO optimisés pour ce produit:

Informations produit:
- Titre: ${data.title}
- Description: ${data.description || "Non fournie"}
- Type: ${data.product_type || "Non spécifié"}
- Vendeur: ${data.vendor || "Non spécifié"}
- Catégorie: ${data.category || "Non spécifié"}
- Sous-catégorie: ${data.sub_category || "Non spécifié"}
- Couleur: ${data.ai_color || "Non spécifié"}
- Matériau: ${data.ai_material || "Non spécifié"}

Générez 8-15 tags pertinents qui:
1. Incluent le type de produit, catégorie et matériau
2. Incluent la couleur si applicable
3. Incluent des descripteurs de style (moderne, classique, rustique, etc.)
4. Incluent des cas d'usage ou types de pièce
5. Sont des mots uniques ou courtes phrases (2-3 mots max)
6. Sont en minuscules
7. Sont SEO-friendly et recherchables
8. Ne répètent pas la même information

Format JSON:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}`,

    shoppingFeed: () => `Tu es un expert en optimisation de flux Google Shopping. Améliore le titre et la description du produit pour maximiser les performances publicitaires.

RÈGLES Google Shopping:
- Titre: 70-150 caractères, mots-clés au début
- Description: 500-5000 caractères, détaillée et persuasive
- Pas de texte promotionnel (SOLDES, PROMO)
- Pas de majuscules excessives
- Inclure: marque, type, attributs clés, bénéfices

Retourne un JSON uniquement.`,

    systemRole: {
      product: "Vous êtes un expert SEO e-commerce spécialisé dans l'optimisation de fiches produits.",
      collection: "Vous êtes un expert rédacteur SEO pour e-commerce.",
      page: "Vous êtes un expert SEO français spécialisé en e-commerce Shopify.",
      article: "Vous êtes un expert en rédaction SEO pour blogs e-commerce.",
      tags: "Vous êtes un expert en création de tags produits. Générez des tags pertinents et SEO-optimisés. Répondez toujours avec du JSON valide uniquement.",
      shoppingFeed: "Tu es un expert en optimisation Google Shopping. Réponds uniquement en JSON valide."
    }
  },

  en: {
    product: (data: ProductData) => `As a professional e-commerce SEO expert, generate an optimized title and meta description for this product:

**PRODUCT INFORMATION:**
- Title: ${data.title}
- Description: ${data.description || "Not provided"}
- Type: ${data.product_type || "Not specified"}
- Category: ${data.category || "Not specified"}
- Subcategory: ${data.sub_category || "Not specified"}
- Color: ${data.ai_color || "Not specified"}
- Material: ${data.ai_material || "Not specified"}
- Style: ${data.style || "Not specified"}
- Brand: ${data.vendor || "Not specified"}
- Tags: ${data.tags || "Not specified"}
${data.keywords ? `- Extracted keywords: ${data.keywords.slice(0, 10).join(", ")}` : ''}
${data.visionContext || ''}

**STRICT SEO REQUIREMENTS:**

TITLE (55-65 characters):
- Include main keyword (product type)
- Add 1-2 key attributes (color, material, style)
- Make it catchy and natural
- NO brand name at the end
- English language only

META DESCRIPTION (150-160 characters):
- Naturally integrate primary and secondary keywords
- Highlight benefits and unique features
- Include subtle call-to-action
- Engaging and descriptive
- English language only

**EXCLUSIVE RESPONSE FORMAT (JSON only):**
{
  "seo_title": "Your optimized SEO title here",
  "seo_description": "Your optimized meta description here"
}`,

    collection: (data: CollectionData) => `Generate SEO-optimized content for this Shopify collection:

Title: ${data.title}
Handle: ${data.handle}
Current Description: ${data.body_html ? data.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : 'No description'}
Products in collection: ${data.productTitles || 'No products yet'}

**YOU MUST GENERATE ALL 3 FIELDS MANDATORY:**

1. seo_title: SEO optimized title of 50-60 characters with main keywords
2. seo_description: SEO meta description of 150-160 characters, engaging with call-to-action
3. body_html: Rich HTML description of 200-400 characters with <p> tags for the collection page

**REQUIRED JSON FORMAT (all fields mandatory):**
{
  "seo_title": "SEO optimized title here",
  "seo_description": "SEO optimized meta description here",
  "body_html": "<p>Rich HTML description here</p>"
}

DO NOT FORGET the seo_description field, it's crucial for SEO!`,

    pageHomepage: (data: PageData) => `You are an expert SEO specialist for Shopify e-commerce.

${data.textContent}

OBJECTIVE: Create an SEO title and meta description that:
1. Naturally include the store name
2. Mention the business sector
3. Integrate 1-2 keywords from main tags or detected products
4. Create urgency with a call-to-action
5. Stand out from competitors

STRICT RULES:
- SEO Title: Exactly 50-60 characters
- Meta Description: Exactly 150-160 characters, engaging with numbers or concrete benefits
- Use power words (Discover, Shop, Exclusive, Premium, etc.)
- Mention a competitive advantage (free shipping, warranty, quality, selection, etc.)

Strict JSON format only (no markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    pageRegular: (data: PageData) => `You are an expert SEO specialist for Shopify e-commerce.

Page to optimize:
Title: ${data.title}
Content: ${data.textContent}

OBJECTIVE: Create a high-quality SEO title and meta description that:
1. Integrate the EXACT store name provided in the content (NEVER use generic placeholders like "[Store Name]")
2. Use the real store name mentioned in the text above
3. Use relevant keywords related to the page content
4. Create engagement with a call-to-action
5. Stand out and encourage clicks

STRICT RULES:
- SEO Title: Exactly 55-65 characters, include page name and 1-2 keywords
- Meta Description: Exactly 150-160 characters, engaging with concrete benefits
- Use power words (Discover, Contact, Shop, etc.)
- For contact page: mention customer service, fast response, support
- For other pages: highlight useful information and added value
- IMPORTANT: Use ONLY the real store name provided in the content, NEVER use brackets or placeholders

Strict JSON format only (no markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    article: (data: ArticleData) => `Generate an optimized SEO title and meta description for this blog article:

Title: ${data.title}
Content (excerpt): ${data.content.substring(0, 500)}
${data.keywords ? `Keywords: ${data.keywords.join(', ')}` : ''}

Return JSON:
{
  "seo_title": "SEO Title (50-60 characters)",
  "meta_description": "Meta description (150-160 characters)"
}`,

    tags: (data: ProductData) => `Generate SEO-optimized product tags for this item:

Product Information:
- Title: ${data.title}
- Description: ${data.description || "Not provided"}
- Type: ${data.product_type || "Not specified"}
- Vendor: ${data.vendor || "Not specified"}
- Category: ${data.category || "Not specified"}
- Subcategory: ${data.sub_category || "Not specified"}
- Color: ${data.ai_color || "Not specified"}
- Material: ${data.ai_material || "Not specified"}

Generate 8-15 relevant tags that:
1. Include the product type, category, and material
2. Include color if applicable
3. Include style descriptors (modern, classic, rustic, etc.)
4. Include use cases or room types
5. Are single words or short phrases (2-3 words max)
6. Are in lowercase
7. Are SEO-friendly and searchable
8. Don't repeat the same information

JSON format:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}`,

    shoppingFeed: () => `You are a Google Shopping feed optimization expert. Improve the product title and description to maximize advertising performance.

Google Shopping RULES:
- Title: 70-150 characters, keywords at the beginning
- Description: 500-5000 characters, detailed and persuasive
- No promotional text (SALE, PROMO)
- No excessive capitalization
- Include: brand, type, key attributes, benefits

Return JSON only.`,

    systemRole: {
      product: "You are an e-commerce SEO expert specializing in product listing optimization.",
      collection: "You are an expert SEO copywriter for e-commerce.",
      page: "You are an expert SEO specialist for Shopify e-commerce.",
      article: "You are an expert SEO writer for e-commerce blogs.",
      tags: "You are a product tagging expert. Generate relevant, SEO-optimized tags. Always respond with valid JSON only.",
      shoppingFeed: "You are a Google Shopping optimization expert. Respond only in valid JSON."
    }
  },

  de: {
    product: (data: ProductData) => `Als professioneller E-Commerce-SEO-Experte erstellen Sie einen optimierten Titel und eine Meta-Beschreibung für dieses Produkt:

**PRODUKTINFORMATIONEN:**
- Titel: ${data.title}
- Beschreibung: ${data.description || "Nicht angegeben"}
- Typ: ${data.product_type || "Nicht angegeben"}
- Kategorie: ${data.category || "Nicht angegeben"}
- Unterkategorie: ${data.sub_category || "Nicht angegeben"}
- Farbe: ${data.ai_color || "Nicht angegeben"}
- Material: ${data.ai_material || "Nicht angegeben"}
- Stil: ${data.style || "Nicht angegeben"}
- Marke: ${data.vendor || "Nicht angegeben"}
- Tags: ${data.tags || "Nicht angegeben"}
${data.keywords ? `- Extrahierte Schlüsselwörter: ${data.keywords.slice(0, 10).join(", ")}` : ''}
${data.visionContext || ''}

**STRENGE SEO-ANFORDERUNGEN:**

TITEL (55-65 Zeichen):
- Hauptschlüsselwort einbeziehen (Produkttyp)
- 1-2 wichtige Attribute hinzufügen (Farbe, Material, Stil)
- Ansprechend und natürlich gestalten
- KEIN Markenname am Ende
- Nur deutsche Sprache

META-BESCHREIBUNG (150-160 Zeichen):
- Primäre und sekundäre Schlüsselwörter natürlich integrieren
- Vorteile und einzigartige Eigenschaften hervorheben
- Subtilen Call-to-Action einschließen
- Ansprechend und beschreibend
- Nur deutsche Sprache

**EXKLUSIVES ANTWORTFORMAT (nur JSON):**
{
  "seo_title": "Ihr optimierter SEO-Titel hier",
  "seo_description": "Ihre optimierte Meta-Beschreibung hier"
}`,

    collection: (data: CollectionData) => `Erstellen Sie SEO-optimierte Inhalte für diese Shopify-Kollektion:

Titel: ${data.title}
Handle: ${data.handle}
Aktuelle Beschreibung: ${data.body_html ? data.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : 'Keine Beschreibung'}
Produkte in der Kollektion: ${data.productTitles || 'Noch keine Produkte'}

Geben Sie NUR ein JSON-Objekt zurück:
{
  "seo_title": "SEO-optimierter Titel (50-60 Zeichen)",
  "seo_description": "SEO-optimierte Meta-Beschreibung (150-160 Zeichen)",
  "body_html": "Ausführliche HTML-Beschreibung für die Kollektionsseite (200-400 Zeichen mit <p>-Tags)"
}`,

    pageHomepage: (data: PageData) => `Sie sind ein SEO-Experte für Shopify E-Commerce.

${data.textContent}

ZIEL: Erstellen Sie einen SEO-Titel und eine Meta-Beschreibung, die:
1. Den Shop-Namen natürlich einbeziehen
2. Den Geschäftsbereich erwähnen
3. 1-2 Schlüsselwörter aus Haupt-Tags oder erkannten Produkten integrieren
4. Dringlichkeit mit Call-to-Action schaffen
5. Sich von der Konkurrenz abheben

STRENGE REGELN:
- SEO-Titel: Genau 50-60 Zeichen
- Meta-Beschreibung: Genau 150-160 Zeichen, ansprechend mit Zahlen oder konkreten Vorteilen
- Verwenden Sie Power-Wörter (Entdecken, Shoppen, Exklusiv, Premium usw.)
- Erwähnen Sie einen Wettbewerbsvorteil (kostenloser Versand, Garantie, Qualität, Auswahl usw.)

Nur striktes JSON-Format (kein Markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    pageRegular: (data: PageData) => `Erstellen Sie einen optimierten SEO-Titel (max. 60 Zeichen) und eine Meta-Beschreibung (max. 160 Zeichen) für diese Shopify-Seite:

Titel: ${data.title}
Inhalt: ${data.textContent}

Antworten Sie nur in JSON:
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    article: (data: ArticleData) => `Erstellen Sie einen optimierten SEO-Titel und eine Meta-Beschreibung für diesen Blog-Artikel:

Titel: ${data.title}
Inhalt (Auszug): ${data.content.substring(0, 500)}
${data.keywords ? `Schlüsselwörter: ${data.keywords.join(', ')}` : ''}

JSON zurückgeben:
{
  "seo_title": "SEO-Titel (50-60 Zeichen)",
  "meta_description": "Meta-Beschreibung (150-160 Zeichen)"
}`,

    tags: (data: ProductData) => `Erstellen Sie SEO-optimierte Produkt-Tags für diesen Artikel:

Produktinformationen:
- Titel: ${data.title}
- Beschreibung: ${data.description || "Nicht angegeben"}
- Typ: ${data.product_type || "Nicht angegeben"}
- Anbieter: ${data.vendor || "Nicht angegeben"}
- Kategorie: ${data.category || "Nicht angegeben"}
- Unterkategorie: ${data.sub_category || "Nicht angegeben"}
- Farbe: ${data.ai_color || "Nicht angegeben"}
- Material: ${data.ai_material || "Nicht angegeben"}

Erstellen Sie 8-15 relevante Tags, die:
1. Produkttyp, Kategorie und Material einschließen
2. Farbe einschließen, falls zutreffend
3. Stilbeschreibungen einschließen (modern, klassisch, rustikal usw.)
4. Anwendungsfälle oder Raumtypen einschließen
5. Einzelne Wörter oder kurze Phrasen sind (max. 2-3 Wörter)
6. In Kleinbuchstaben sind
7. SEO-freundlich und durchsuchbar sind
8. Nicht dieselben Informationen wiederholen

JSON-Format:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}`,

    shoppingFeed: () => `Sie sind ein Google Shopping Feed-Optimierungsexperte. Verbessern Sie den Produkttitel und die Beschreibung, um die Werbeleistung zu maximieren.

Google Shopping REGELN:
- Titel: 70-150 Zeichen, Schlüsselwörter am Anfang
- Beschreibung: 500-5000 Zeichen, detailliert und überzeugend
- Kein Werbetext (SALE, PROMO)
- Keine übermäßige Großschreibung
- Einschließen: Marke, Typ, wichtige Attribute, Vorteile

Nur JSON zurückgeben.`,

    systemRole: {
      product: "Sie sind ein E-Commerce-SEO-Experte, spezialisiert auf Produktlisten-Optimierung.",
      collection: "Sie sind ein erfahrener SEO-Texter für E-Commerce.",
      page: "Sie sind ein SEO-Experte für Shopify E-Commerce.",
      article: "Sie sind ein erfahrener SEO-Autor für E-Commerce-Blogs.",
      tags: "Sie sind ein Experte für Produkt-Tagging. Erstellen Sie relevante, SEO-optimierte Tags. Antworten Sie immer nur mit gültigem JSON.",
      shoppingFeed: "Sie sind ein Google Shopping-Optimierungsexperte. Antworten Sie nur in gültigem JSON."
    }
  },

  es: {
    product: (data: ProductData) => `Como experto profesional en SEO de comercio electrónico, genere un título y una meta descripción optimizados para este producto:

**INFORMACIÓN DEL PRODUCTO:**
- Título: ${data.title}
- Descripción: ${data.description || "No proporcionada"}
- Tipo: ${data.product_type || "No especificado"}
- Categoría: ${data.category || "No especificado"}
- Subcategoría: ${data.sub_category || "No especificado"}
- Color: ${data.ai_color || "No especificado"}
- Material: ${data.ai_material || "No especificado"}
- Estilo: ${data.style || "No especificado"}
- Marca: ${data.vendor || "No especificado"}
- Etiquetas: ${data.tags || "No especificado"}
${data.keywords ? `- Palabras clave extraídas: ${data.keywords.slice(0, 10).join(", ")}` : ''}
${data.visionContext || ''}

**REQUISITOS ESTRICTOS DE SEO:**

TÍTULO (55-65 caracteres):
- Incluir palabra clave principal (tipo de producto)
- Agregar 1-2 atributos clave (color, material, estilo)
- Hacerlo atractivo y natural
- SIN nombre de marca al final
- Solo en español

META DESCRIPCIÓN (150-160 caracteres):
- Integrar naturalmente palabras clave primarias y secundarias
- Destacar beneficios y características únicas
- Incluir llamada a la acción sutil
- Descripción atractiva y descriptiva
- Solo en español

**FORMATO DE RESPUESTA EXCLUSIVO (solo JSON):**
{
  "seo_title": "Su título SEO optimizado aquí",
  "seo_description": "Su meta descripción optimizada aquí"
}`,

    collection: (data: CollectionData) => `Genere contenido SEO optimizado para esta colección de Shopify:

Título: ${data.title}
Handle: ${data.handle}
Descripción actual: ${data.body_html ? data.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : 'Sin descripción'}
Productos en la colección: ${data.productTitles || 'Aún no hay productos'}

Devuelva SOLO un objeto JSON con:
{
  "seo_title": "Título SEO optimizado (50-60 caracteres)",
  "seo_description": "Meta descripción SEO optimizada (150-160 caracteres)",
  "body_html": "Descripción HTML enriquecida para la página de colección (200-400 caracteres con etiquetas <p>)"
}`,

    pageHomepage: (data: PageData) => `Eres un experto en SEO especializado en comercio electrónico Shopify.

${data.textContent}

OBJETIVO: Crear un título SEO y una meta descripción que:
1. Incluyan naturalmente el nombre de la tienda
2. Mencionen el sector empresarial
3. Integren 1-2 palabras clave de las etiquetas principales o productos detectados
4. Creen urgencia con una llamada a la acción
5. Se destaquen de la competencia

REGLAS ESTRICTAS:
- Título SEO: Exactamente 50-60 caracteres
- Meta Descripción: Exactamente 150-160 caracteres, atractiva con números o beneficios concretos
- Use palabras poderosas (Descubre, Compra, Exclusivo, Premium, etc.)
- Mencione una ventaja competitiva (envío gratis, garantía, calidad, selección, etc.)

Formato JSON estricto únicamente (sin markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    pageRegular: (data: PageData) => `Genere un título SEO optimizado (máx. 60 caracteres) y una meta descripción (máx. 160 caracteres) para esta página de Shopify:

Título: ${data.title}
Contenido: ${data.textContent}

Responda solo en JSON:
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    article: (data: ArticleData) => `Genere un título SEO optimizado y una meta descripción para este artículo de blog:

Título: ${data.title}
Contenido (extracto): ${data.content.substring(0, 500)}
${data.keywords ? `Palabras clave: ${data.keywords.join(', ')}` : ''}

Devuelva JSON:
{
  "seo_title": "Título SEO (50-60 caracteres)",
  "meta_description": "Meta descripción (150-160 caracteres)"
}`,

    tags: (data: ProductData) => `Genere etiquetas de producto SEO optimizadas para este artículo:

Información del producto:
- Título: ${data.title}
- Descripción: ${data.description || "No proporcionada"}
- Tipo: ${data.product_type || "No especificado"}
- Vendedor: ${data.vendor || "No especificado"}
- Categoría: ${data.category || "No especificado"}
- Subcategoría: ${data.sub_category || "No especificado"}
- Color: ${data.ai_color || "No especificado"}
- Material: ${data.ai_material || "No especificado"}

Genere 8-15 etiquetas relevantes que:
1. Incluyan el tipo de producto, categoría y material
2. Incluyan el color si es aplicable
3. Incluyan descriptores de estilo (moderno, clásico, rústico, etc.)
4. Incluyan casos de uso o tipos de habitación
5. Sean palabras únicas o frases cortas (máx. 2-3 palabras)
6. Estén en minúsculas
7. Sean amigables para SEO y buscables
8. No repitan la misma información

Formato JSON:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}`,

    shoppingFeed: () => `Eres un experto en optimización de feeds de Google Shopping. Mejora el título y la descripción del producto para maximizar el rendimiento publicitario.

REGLAS de Google Shopping:
- Título: 70-150 caracteres, palabras clave al principio
- Descripción: 500-5000 caracteres, detallada y persuasiva
- Sin texto promocional (OFERTA, PROMO)
- Sin mayúsculas excesivas
- Incluir: marca, tipo, atributos clave, beneficios

Devuelve solo JSON.`,

    systemRole: {
      product: "Eres un experto en SEO de comercio electrónico especializado en optimización de listados de productos.",
      collection: "Eres un redactor experto en SEO para comercio electrónico.",
      page: "Eres un especialista experto en SEO para comercio electrónico Shopify.",
      article: "Eres un escritor experto en SEO para blogs de comercio electrónico.",
      tags: "Eres un experto en etiquetado de productos. Genera etiquetas relevantes y SEO-optimizadas. Responde siempre solo con JSON válido.",
      shoppingFeed: "Eres un experto en optimización de Google Shopping. Responde solo en JSON válido."
    }
  },

  it: {
    product: (data: ProductData) => `Come esperto professionista di SEO e-commerce, genera un titolo e una meta descrizione ottimizzati per questo prodotto:

**INFORMAZIONI SUL PRODOTTO:**
- Titolo: ${data.title}
- Descrizione: ${data.description || "Non fornita"}
- Tipo: ${data.product_type || "Non specificato"}
- Categoria: ${data.category || "Non specificato"}
- Sottocategoria: ${data.sub_category || "Non specificato"}
- Colore: ${data.ai_color || "Non specificato"}
- Materiale: ${data.ai_material || "Non specificato"}
- Stile: ${data.style || "Non specificato"}
- Marca: ${data.vendor || "Non specificato"}
- Tag: ${data.tags || "Non specificato"}
${data.keywords ? `- Parole chiave estratte: ${data.keywords.slice(0, 10).join(", ")}` : ''}
${data.visionContext || ''}

**REQUISITI SEO RIGOROSI:**

TITOLO (55-65 caratteri):
- Includere la parola chiave principale (tipo di prodotto)
- Aggiungere 1-2 attributi chiave (colore, materiale, stile)
- Renderlo accattivante e naturale
- SENZA nome del marchio alla fine
- Solo in italiano

META DESCRIZIONE (150-160 caratteri):
- Integrare naturalmente parole chiave primarie e secondarie
- Evidenziare benefici e caratteristiche uniche
- Includere una call-to-action sottile
- Descrizione coinvolgente e descrittiva
- Solo in italiano

**FORMATO DI RISPOSTA ESCLUSIVO (solo JSON):**
{
  "seo_title": "Il tuo titolo SEO ottimizzato qui",
  "seo_description": "La tua meta descrizione ottimizzata qui"
}`,

    collection: (data: CollectionData) => `Genera contenuti SEO ottimizzati per questa collezione Shopify:

Titolo: ${data.title}
Handle: ${data.handle}
Descrizione attuale: ${data.body_html ? data.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : 'Nessuna descrizione'}
Prodotti nella collezione: ${data.productTitles || 'Nessun prodotto ancora'}

Restituisci SOLO un oggetto JSON con:
{
  "seo_title": "Titolo SEO ottimizzato (50-60 caratteri)",
  "seo_description": "Meta descrizione SEO ottimizzata (150-160 caratteri)",
  "body_html": "Descrizione HTML arricchita per la pagina della collezione (200-400 caratteri con tag <p>)"
}`,

    pageHomepage: (data: PageData) => `Sei un esperto SEO specializzato in e-commerce Shopify.

${data.textContent}

OBIETTIVO: Creare un titolo SEO e una meta descrizione che:
1. Includano naturalmente il nome del negozio
2. Menzionino il settore commerciale
3. Integrino 1-2 parole chiave tra i tag principali o i prodotti rilevati
4. Creino urgenza con una call-to-action
5. Si distinguano dalla concorrenza

REGOLE RIGIDE:
- Titolo SEO: Esattamente 50-60 caratteri
- Meta Descrizione: Esattamente 150-160 caratteri, coinvolgente con numeri o benefici concreti
- Usa power words (Scopri, Acquista, Esclusivo, Premium, ecc.)
- Menziona un vantaggio competitivo (spedizione gratuita, garanzia, qualità, selezione, ecc.)

Solo formato JSON rigoroso (senza markdown):
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    pageRegular: (data: PageData) => `Genera un titolo SEO ottimizzato (max 60 caratteri) e una meta descrizione (max 160 caratteri) per questa pagina Shopify:

Titolo: ${data.title}
Contenuto: ${data.textContent}

Rispondi solo in JSON:
{
  "seo_title": "...",
  "seo_description": "..."
}`,

    article: (data: ArticleData) => `Genera un titolo SEO ottimizzato e una meta descrizione per questo articolo del blog:

Titolo: ${data.title}
Contenuto (estratto): ${data.content.substring(0, 500)}
${data.keywords ? `Parole chiave: ${data.keywords.join(', ')}` : ''}

Restituisci JSON:
{
  "seo_title": "Titolo SEO (50-60 caratteri)",
  "meta_description": "Meta descrizione (150-160 caratteri)"
}`,

    tags: (data: ProductData) => `Genera tag di prodotto SEO ottimizzati per questo articolo:

Informazioni sul prodotto:
- Titolo: ${data.title}
- Descrizione: ${data.description || "Non fornita"}
- Tipo: ${data.product_type || "Non specificato"}
- Venditore: ${data.vendor || "Non specificato"}
- Categoria: ${data.category || "Non specificato"}
- Sottocategoria: ${data.sub_category || "Non specificato"}
- Colore: ${data.ai_color || "Non specificato"}
- Materiale: ${data.ai_material || "Non specificato"}

Genera 8-15 tag rilevanti che:
1. Includano il tipo di prodotto, categoria e materiale
2. Includano il colore se applicabile
3. Includano descrittori di stile (moderno, classico, rustico, ecc.)
4. Includano casi d'uso o tipi di stanza
5. Siano parole singole o frasi brevi (max 2-3 parole)
6. Siano in minuscolo
7. Siano SEO-friendly e ricercabili
8. Non ripetano le stesse informazioni

Formato JSON:
{
  "tags": "tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8"
}`,

    shoppingFeed: () => `Sei un esperto di ottimizzazione feed di Google Shopping. Migliora il titolo e la descrizione del prodotto per massimizzare le prestazioni pubblicitarie.

REGOLE Google Shopping:
- Titolo: 70-150 caratteri, parole chiave all'inizio
- Descrizione: 500-5000 caratteri, dettagliata e persuasiva
- Nessun testo promozionale (SALDI, PROMO)
- Nessuna capitalizzazione eccessiva
- Includere: marca, tipo, attributi chiave, benefici

Restituisci solo JSON.`,

    systemRole: {
      product: "Sei un esperto SEO e-commerce specializzato nell'ottimizzazione delle schede prodotto.",
      collection: "Sei un copywriter esperto di SEO per l'e-commerce.",
      page: "Sei uno specialista SEO esperto per e-commerce Shopify.",
      article: "Sei uno scrittore esperto di SEO per blog e-commerce.",
      tags: "Sei un esperto di tagging dei prodotti. Genera tag rilevanti e SEO-ottimizzati. Rispondi sempre solo con JSON valido.",
      shoppingFeed: "Sei un esperto di ottimizzazione Google Shopping. Rispondi solo in JSON valido."
    }
  }
};

type PromptType = 'product' | 'collection' | 'pageHomepage' | 'pageRegular' | 'article' | 'tags' | 'shoppingFeed';
type SystemRoleType = 'product' | 'collection' | 'page' | 'article' | 'tags' | 'shoppingFeed';

export function getSeoPrompt(
  language: string,
  type: PromptType,
  data: ProductData | CollectionData | PageData | ArticleData
): string {
  const lang = (language || 'fr').toLowerCase();
  const prompts = SEO_PROMPTS[lang as keyof typeof SEO_PROMPTS] || SEO_PROMPTS.fr;
  
  return prompts[type](data as any);
}

export function getSystemRole(language: string, type: SystemRoleType): string {
  const lang = (language || 'fr').toLowerCase();
  const prompts = SEO_PROMPTS[lang as keyof typeof SEO_PROMPTS] || SEO_PROMPTS.fr;
  
  return prompts.systemRole[type];
}

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'it'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
