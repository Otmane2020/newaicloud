import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentTitle, imageUrl, config, customDescription, vendor } = await req.json();

    if (!currentTitle) {
      throw new Error("Le titre actuel est requis");
    }

    // Extraire vendor automatiquement du titre si non fourni
    let extractedVendor = vendor || '';
    if (!extractedVendor) {
      const vendorMatch = currentTitle.match(/\b[A-Z][A-Z]+\b/);
      if (vendorMatch) {
        extractedVendor = vendorMatch[0];
        console.log("✅ Vendor extrait:", extractedVendor);
      }
    }

    // Extraire dimensions du titre (formats: 120x80, 120x80x75, 120 x 80 cm, etc.)
    let extractedDimensions = '';
    const dimensionPatterns = [
      /(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)\s*(cm|mm|m)?/i,
      /(\d+)\s*[xX×]\s*(\d+)\s*(cm|mm|m)?/i,
      /(\d+)\s*(cm|mm|m)\s*[xX×]\s*(\d+)\s*(cm|mm|m)?/i
    ];
    
    for (const pattern of dimensionPatterns) {
      const match = currentTitle.match(pattern);
      if (match) {
        extractedDimensions = match[0];
        console.log("📏 Dimensions extraites du titre:", extractedDimensions);
        break;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configuré");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    let visionAnalysis = "";
    let productDimensions = "";
    
    // Analyse vision IA complète avec extraction des dimensions
    if (imageUrl) {
      console.log("🔍 Analyse vision IA du produit:", imageUrl);
      
      const { data: cachedAnalysis } = await supabaseClient
        .from('vision_ai_cache')
        .select('analysis_result')
        .eq('image_url', imageUrl)
        .single();
      
      if (cachedAnalysis) {
        console.log("✅ Cache - Analyse vision récupérée");
        visionAnalysis = cachedAnalysis.analysis_result;
        // Extraire dimensions si présentes dans le cache
        const dimMatch = visionAnalysis.match(/dimensions?[:\s]+([0-9]+\s*x\s*[0-9]+\s*x?\s*[0-9]*[^\n]*)/i);
        if (dimMatch) {
          productDimensions = dimMatch[1];
        }
      } else {
        console.log("🤖 Analyse vision IA en cours...");
        
        try {
          const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Analyse ce produit en 4 points:
1. Couleurs + matériaux (1 phrase)
2. Style + design (1 phrase)
3. Dimensions visibles (format: LxlxH en cm, sinon "dimensions non visibles")
4. 3 caractéristiques uniques

Sois concis et précis.`
                    },
                    {
                      type: "image_url",
                      image_url: { url: imageUrl }
                    }
                  ]
                }
              ],
              max_tokens: 250
            }),
          });

          if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            console.error("❌ Erreur Lovable AI Vision:", visionResponse.status, errorText);
            
            if (visionResponse.status === 429) {
              throw new Error("RATE_LIMIT: Trop de requêtes IA. Réessayez dans 1 minute.");
            }
            if (visionResponse.status === 402) {
              throw new Error("CREDITS_DEPLETED: Crédits Lovable AI épuisés. Ajoutez des crédits.");
            }
          } else {
            const visionData = await visionResponse.json();
            visionAnalysis = visionData.choices?.[0]?.message?.content || "";
            console.log("✅ Analyse vision complétée:", visionAnalysis.substring(0, 100) + "...");
            
            // Extraire dimensions de l'analyse
            const dimMatch = visionAnalysis.match(/dimensions?[:\s]+([0-9]+\s*x\s*[0-9]+\s*x?\s*[0-9]*[^\n]*)/i);
            if (dimMatch) {
              productDimensions = dimMatch[1];
              console.log("📏 Dimensions extraites:", productDimensions);
            }
            
            // Cache l'analyse
            if (visionAnalysis) {
              await supabaseClient
                .from('vision_ai_cache')
                .upsert({ 
                  image_url: imageUrl, 
                  analysis_result: visionAnalysis 
                }, { 
                  onConflict: 'image_url' 
                });
              console.log("💾 Analyse cachée");
            }
          }
        } catch (visionError) {
          console.error("❌ Erreur analyse vision:", visionError);
        }
      }
    }

    // Génération contenu optimisé SEO avec HTML structuré
    // Adapter le style et la structure selon la configuration
    const styleDescriptions = {
      modern: 'Design épuré et minimaliste avec lignes claires',
      elegant: 'Style sophistiqué et raffiné avec touches luxueuses',
      professional: 'Présentation sobre, directe et corporate',
      creative: 'Design audacieux, original et artistique'
    };

    const layoutInstructions = {
      compact: 'Structure concise avec sections courtes et impact visuel fort',
      detailed: 'Sections riches et détaillées avec multiples sous-sections',
      story: 'Narration engageante avec storytelling et émotion'
    };

    const colorSchemeStyles = {
      vibrant: 'couleurs vives et éclatantes (primaires saturées)',
      pastel: 'tons doux et pastels (couleurs désaturées apaisantes)',
      monochrome: 'noir, blanc et nuances de gris (minimaliste)',
      warm: 'tons chauds (oranges, rouges, jaunes)'
    };

    const contentLengthGuides = {
      short: '~500 mots total, paragraphes 40-50 mots, 3 caractéristiques principales',
      medium: '~1000 mots total, paragraphes 70-90 mots, 4-5 caractéristiques',
      long: '~2000 mots total, paragraphes 100-120 mots, 6+ caractéristiques détaillées'
    };

    const selectedStyle = config?.style || 'modern';
    const selectedLayout = config?.layout || 'detailed';
    const selectedColorScheme = config?.colorScheme || 'vibrant';
    const selectedContentLength = config?.contentLength || 'medium';

    const systemPrompt = `Tu es un expert SEO e-commerce et rédacteur web professionnel.

🎯 MISSION: Créer du contenu HTML structuré, SEO-optimisé, et professionnel qui convertit.

📐 CONFIGURATION DESIGN:
- Style: ${styleDescriptions[selectedStyle as keyof typeof styleDescriptions]}
- Layout: ${layoutInstructions[selectedLayout as keyof typeof layoutInstructions]}
- Palette: ${colorSchemeStyles[selectedColorScheme as keyof typeof colorSchemeStyles]}
- Longueur: ${contentLengthGuides[selectedContentLength as keyof typeof contentLengthGuides]}

🔴 RÈGLES CRITIQUES (PRIORITÉ ABSOLUE):
1. CONSERVER INTÉGRALEMENT tous les éléments clés du titre original:
   - Marque/Vendor (si présent)
   - Modèle/Référence
   - Dimensions (si présentes)
   - Caractéristiques principales
   
2. INTÉGRER NATURELLEMENT les résultats Vision AI dans la description

3. UTILISER les dimensions extraites du titre dans les spécifications

4. AJOUTER les informations personnalisées fournies par l'utilisateur

5. NE PAS inventer ou modifier les données factuelles (dimensions, marque, modèle)

📋 RÈGLES SEO:
- Titre SEO: 50-60 caractères avec mot-clé + bénéfice unique
- Meta description: 150-160 caractères avec USP + appel à l'action
- HTML: Structure sémantique H1>H2>H3>H4, responsive, moderne
- Respecter strictement le style et la longueur demandés`;

    let userPrompt = `🛍️ PRODUIT: "${currentTitle}"`;
    
    if (extractedVendor) {
      userPrompt += `\n\n🏷️ VENDOR/MARQUE: ${extractedVendor} (À CONSERVER dans le titre et description)`;
    }
    
    if (extractedDimensions) {
      userPrompt += `\n\n📏 DIMENSIONS (du titre): ${extractedDimensions} (UTILISER ces dimensions exactes dans les specs)`;
    }
    
    if (visionAnalysis) {
      userPrompt += `\n\n🔍 ANALYSE VISION IA (INTÉGRER naturellement):\n${visionAnalysis}`;
    }
    
    if (productDimensions && productDimensions !== extractedDimensions) {
      userPrompt += `\n\n📏 DIMENSIONS (vision AI): ${productDimensions}`;
    }

    if (customDescription) {
      userPrompt += `\n\n✍️ INFORMATIONS UTILISATEUR (PRIORITÉ - INCLURE obligatoirement):\n${customDescription}`;
    }

    if (imageUrl) {
      userPrompt += `\n\n🖼️ IMAGE PRODUIT: ${imageUrl}`;
    }

    userPrompt += `\n\n✨ À GÉNÉRER:

1️⃣ TITRE SEO (50-60 caractères):
   ${extractedVendor ? `IMPÉRATIF: Inclure "${extractedVendor}"` : ''}
   ${extractedDimensions ? `IMPÉRATIF: Inclure "${extractedDimensions}"` : ''}
   Format: [Vendor] [Produit] ${extractedDimensions ? '[Dimensions]' : ''} - [Bénéfice]
   Exemple: "IKEA Bureau 120x80cm - Design Scandinave Premium"

2️⃣ META DESCRIPTION (150-160 car):
   INCLURE: Vendor, dimensions (si disponibles), bénéfices Vision AI, infos utilisateur
   Structure: [Accroche] + [2-3 bénéfices clés] + [CTA] + [Réassurance]
   Exemple: "Bureau IKEA 120x80cm en bois massif. Design épuré, rangement intégré. Livraison 48h ✓"

3️⃣ HTML BODY STRUCTURÉ:
   PRIORITÉS ABSOLUES:
   - Conserver TOUTES les infos factuelles (vendor, dimensions, modèle)
   - Intégrer les informations utilisateur de façon visible
   - Utiliser les résultats Vision AI pour enrichir (ne pas inventer)
   - Structure H1 > H2 > H3 > H4 claire
   - Sections: Intro, Caractéristiques, Détails, Spécifications, CTA
   - Design moderne et responsive`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_seo_product_content",
              description: "Génère titre SEO, meta description et HTML structuré pour produit e-commerce",
              parameters: {
                type: "object",
                properties: {
                  seo_title: {
                    type: "string",
                    description: "Titre SEO optimisé 50-60 caractères avec mot-clé et bénéfice"
                  },
                  meta_description: {
                    type: "string",
                    description: "Meta description 150-160 caractères avec USP et CTA"
                  },
                  html_body: {
                    type: "string",
                    description: `HTML complet structuré avec H1>H2>H3>H4. Exemple de structure:

<div style="max-width: 1200px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif; color: #1a202c; line-height: 1.7;">
  
  <!-- SECTION HERO avec H1 -->
  <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 4rem 2rem; color: white; text-align: center; margin-bottom: 4rem; box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);">
    <h1 style="font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; margin: 0 0 1.5rem 0; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">[TITRE PRODUIT OPTIMISÉ SEO]</h1>
    <p style="font-size: clamp(1.1rem, 2.5vw, 1.5rem); opacity: 0.95; max-width: 700px; margin: 0 auto; font-weight: 300;">[Phrase d'accroche unique avec bénéfice principal]</p>
  </section>

  ${imageUrl ? `<!-- IMAGE PRODUIT -->
  <section style="text-align: center; margin: 4rem 0;">
    <img src="${imageUrl}" alt="[Description SEO détaillée]" style="max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 25px 80px rgba(0,0,0,0.15); transition: transform 0.3s;"/>
  </section>` : ''}

  <!-- INTRODUCTION avec H2 -->
  <section style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 16px; padding: 3rem; margin-bottom: 4rem; border-left: 6px solid #667eea;">
    <h2 style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; margin: 0 0 1.5rem 0; color: #2d3748;">Pourquoi choisir ce produit ?</h2>
    <p style="font-size: 1.2rem; margin: 0; color: #4a5568;">[Paragraphe introduction 4-5 phrases expliquant les bénéfices uniques et pourquoi ce produit se démarque]</p>
  </section>

  <!-- CARACTÉRISTIQUES PRINCIPALES avec H2 et H3 -->
  <section style="margin-bottom: 4rem;">
    <h2 style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; margin: 0 0 2rem 0; color: #2d3748; text-align: center;">✨ Caractéristiques principales</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
      
      <article style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 2rem; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="font-size: 3rem; margin-bottom: 1rem; text-align: center;">🎯</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0; color: #2d3748; text-align: center;">[Caractéristique 1]</h3>
        <p style="color: #718096; margin: 0; text-align: center; font-size: 0.95rem;">[Description bénéfice détaillé 2-3 phrases]</p>
      </article>

      <article style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 2rem; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="font-size: 3rem; margin-bottom: 1rem; text-align: center;">⚡</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0; color: #2d3748; text-align: center;">[Caractéristique 2]</h3>
        <p style="color: #718096; margin: 0; text-align: center; font-size: 0.95rem;">[Description bénéfice détaillé 2-3 phrases]</p>
      </article>

      <article style="background: white; border: 2px solid #e2e8f0; border-radius: 16px; padding: 2rem; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="font-size: 3rem; margin-bottom: 1rem; text-align: center;">💎</div>
        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0; color: #2d3748; text-align: center;">[Caractéristique 3]</h3>
        <p style="color: #718096; margin: 0; text-align: center; font-size: 0.95rem;">[Description bénéfice détaillé 2-3 phrases]</p>
      </article>

    </div>
  </section>

  ${visionAnalysis ? `<!-- ANALYSE VISION IA avec H2 -->
  <section style="background: linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%); border-radius: 16px; padding: 3rem; margin-bottom: 4rem; border-left: 6px solid #667eea;">
    <h2 style="font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 800; margin: 0 0 1.5rem 0; color: #2d3748; display: flex; align-items: center; gap: 0.75rem;">
      <span style="font-size: 2rem;">🔍</span> Analyse visuelle détaillée
    </h2>
    <div style="color: #4a5568; font-size: 1.05rem; line-height: 1.8;">
      <p style="margin: 0;">${visionAnalysis.replace(/\n/g, '</p><p style="margin: 1rem 0 0 0;">')}</p>
    </div>
  </section>` : ''}

  <!-- DESCRIPTION COMPLÈTE avec H2 et H3 -->
  <section style="background: white; border-radius: 16px; padding: 3rem; box-shadow: 0 10px 30px rgba(0,0,0,0.08); margin-bottom: 4rem;">
    <h2 style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; margin: 0 0 2rem 0; color: #2d3748;">📋 Description complète</h2>
    
    <div style="color: #4a5568; font-size: 1.05rem; line-height: 1.9; margin-bottom: 2rem;">
      <p style="margin: 0 0 1.5rem 0;">[Paragraphe 1: Introduction produit et contexte d'utilisation - 80 mots]</p>
      <p style="margin: 0 0 1.5rem 0;">[Paragraphe 2: Matériaux, fabrication, qualité - 80 mots]</p>
      <p style="margin: 0;">[Paragraphe 3: Avantages et usages recommandés - 80 mots]</p>
    </div>

    <h3 style="font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 1.5rem 0; color: #2d3748;">🎨 Points forts du design</h3>
    <ul style="color: #4a5568; font-size: 1.05rem; line-height: 1.9; padding-left: 1.5rem; margin: 0;">
      <li style="margin-bottom: 0.75rem;"><strong>[Point fort 1]</strong> - [Explication courte]</li>
      <li style="margin-bottom: 0.75rem;"><strong>[Point fort 2]</strong> - [Explication courte]</li>
      <li style="margin-bottom: 0.75rem;"><strong>[Point fort 3]</strong> - [Explication courte]</li>
      <li style="margin-bottom: 0;"><strong>[Point fort 4]</strong> - [Explication courte]</li>
    </ul>
  </section>

  <!-- SPÉCIFICATIONS TECHNIQUES avec H2 et H3 -->
  <section style="margin-bottom: 4rem;">
    <h2 style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 800; margin: 0 0 2rem 0; color: #2d3748; text-align: center;">🔧 Spécifications techniques</h2>
    
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <th style="padding: 1.25rem; text-align: left; font-weight: 700; font-size: 1.1rem;">Caractéristique</th>
            <th style="padding: 1.25rem; text-align: left; font-weight: 700; font-size: 1.1rem;">Détails</th>
          </tr>
        </thead>
        <tbody>
          ${productDimensions ? `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">📏 Dimensions</td>
            <td style="padding: 1.25rem; color: #4a5568;">${productDimensions}</td>
          </tr>` : `<tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">📏 Dimensions</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Indiquer dimensions estimées]</td>
          </tr>`}
          <tr style="background: #f8f9fa; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">🎨 Matériau principal</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Matériau basé sur analyse vision]</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">⚖️ Poids</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Poids estimé ou spécifique]</td>
          </tr>
          <tr style="background: #f8f9fa; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">🎨 Couleurs disponibles</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Couleurs basées sur analyse]</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">✅ Garantie</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Période garantie]</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 1.25rem; font-weight: 600; color: #2d3748;">🏭 Origine</td>
            <td style="padding: 1.25rem; color: #4a5568;">[Pays ou région]</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 style="font-size: 1.5rem; font-weight: 700; margin: 3rem 0 1.5rem 0; color: #2d3748;">📦 Contenu du colis</h3>
    <div style="background: #f8f9fa; border-radius: 12px; padding: 2rem; border-left: 4px solid #667eea;">
      <ul style="color: #4a5568; font-size: 1.05rem; line-height: 1.9; padding-left: 1.5rem; margin: 0;">
        <li style="margin-bottom: 0.75rem;">1x [Produit principal]</li>
        <li style="margin-bottom: 0.75rem;">[Accessoire 1 si applicable]</li>
        <li style="margin-bottom: 0.75rem;">[Accessoire 2 si applicable]</li>
        <li style="margin-bottom: 0;">Notice d'utilisation et certificat de garantie</li>
      </ul>
    </div>
  </section>

  <!-- CTA FINAL avec H2 -->
  <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 4rem 2rem; text-align: center; color: white; box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);">
    <h2 style="font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 900; margin: 0 0 1.5rem 0; text-shadow: 0 2px 10px rgba(0,0,0,0.2);">🎁 Prêt à commander ?</h2>
    <p style="font-size: clamp(1rem, 2vw, 1.25rem); margin: 0 0 2.5rem 0; opacity: 0.95; max-width: 600px; margin-left: auto; margin-right: auto; font-weight: 300;">
      ✓ Livraison rapide et sécurisée<br/>
      ✓ Garantie satisfaction<br/>
      ✓ Service client réactif
    </p>
    <div style="display: inline-flex; align-items: center; gap: 1rem; background: white; color: #667eea; padding: 1.25rem 3rem; border-radius: 12px; font-weight: 800; font-size: 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.3s;">
      <span>Commander maintenant</span>
      <span style="font-size: 1.5rem;">→</span>
    </div>
  </section>

</div>

IMPORTANT: 
- Remplace TOUS les [...] par du contenu réel et pertinent
- Utilise l'analyse vision pour remplir couleurs, matériaux, style
- Intègre dimensions si disponibles
- Adapte le contenu au produit spécifique
- Garde structure H1>H2>H3>H4 stricte`
                  }
                },
                required: ["seo_title", "meta_description", "html_body"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_seo_product_content" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT: Trop de requêtes. Patientez 1 minute.");
      }
      if (response.status === 402) {
        throw new Error("CREDITS_DEPLETED: Crédits épuisés. Ajoutez des crédits.");
      }
      
      throw new Error(`Erreur IA: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Réponse IA reçue");
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Aucun contenu généré");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Mise à jour BDD
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        const { data: products } = await supabaseClient
          .from('shopify_products')
          .select('id')
          .eq('seller_id', user.id)
          .eq('title', currentTitle)
          .limit(1);
        
        if (products && products.length > 0) {
          const productId = products[0].id;
          
          // Récupérer le compteur actuel
          const { data: currentProduct } = await supabaseClient
            .from('shopify_products')
            .select('optimization_count')
            .eq('id', productId)
            .single();
          
          const currentCount = currentProduct?.optimization_count || 0;
          
          // Mettre à jour avec le nouveau compteur
          await supabaseClient
            .from('shopify_products')
            .update({
              title: result.seo_title,
              seo_title: result.seo_title,
              seo_description: result.meta_description,
              description: result.html_body,
              optimization_count: currentCount + 1,
              last_optimization_at: new Date().toISOString()
            })
            .eq('id', productId);
          
          console.log(`✅ Produit ${productId} optimisé avec succès (compteur: ${currentCount + 1})`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        title: result.seo_title || "",
        description: result.meta_description || "",
        html_description: result.html_body || "",
        hasVisionAnalysis: !!visionAnalysis,
        extractedDimensions: productDimensions || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erreur generate-title-description:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
