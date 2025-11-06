import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, existingDescription, images, visionAnalysis, template = 'ecommerce' } = await req.json();
    
    if (!title) {
      throw new Error('Product title is required');
    }

    console.log('Generating HTML description for:', title, 'with template:', template);

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Template-specific style guides
    const templateStyles = {
      ecommerce: {
        tone: 'Direct, persuasive, customer-focused. Use simple language and clear benefits.',
        structure: 'Quick overview, key benefits with icons, technical specs table, call-to-action',
        language: 'Use action verbs, emphasize value and convenience, include urgency elements'
      },
      luxury: {
        tone: 'Sophisticated, elegant, aspirational. Use refined and exclusive language.',
        structure: 'Story-driven narrative, craftsmanship details, heritage/materials focus, exclusive features',
        language: 'Use sensory words, emphasize uniqueness and quality, avoid direct selling'
      },
      technical: {
        tone: 'Precise, detailed, professional. Use industry-specific terminology.',
        structure: 'Detailed specifications first, technical features, compatibility, performance metrics',
        language: 'Use technical terms, include measurements and standards, provide detailed specs'
      }
    };

    const selectedTemplate = templateStyles[template as keyof typeof templateStyles] || templateStyles.ecommerce;

    const prompt = `Generate a high-quality, mobile-friendly HTML product description in ${template.toUpperCase()} style.

PRODUCT INFORMATION:
- Title: ${title}
${existingDescription ? `- Existing Description: ${existingDescription}` : '- No existing description'}
${visionAnalysis ? `- Visual Analysis: ${JSON.stringify(visionAnalysis)}` : ''}
${images?.length ? `
- Product Images (${images.length} photos):
${images.map((img: any, idx: number) => `  ${idx + 1}. ${img.src || img}`).join('\n')}
` : '- No images available'}

TEMPLATE STYLE - ${template.toUpperCase()}:
- Tone: ${selectedTemplate.tone}
- Structure: ${selectedTemplate.structure}
- Language: ${selectedTemplate.language}

STRUCTURE REQUIREMENTS:
1. Hero section with main product benefit (1-2 sentences)
2. Key features grid with 4-6 highlighted benefits
3. Detailed characteristics/specifications table
4. Product highlights with icons
5. Usage or care instructions (if applicable)

IMAGE INTEGRATION (CRITICAL):
- You MUST include actual product images in the HTML using <img> tags
- Use the provided image URLs from the "Product Images" list above
- Place images strategically: hero image at top, gallery in middle, detail shots near specs
- Use responsive image sizing: w-full, h-auto, rounded corners
- Add proper alt text for each image based on context
- Example: <img src="IMAGE_URL_FROM_LIST" alt="Product detail view" class="w-full rounded-lg shadow-md mb-4" />

TECHNICAL REQUIREMENTS:
- Use only Tailwind CSS classes (no custom CSS)
- Mobile-first responsive design
- Semantic HTML5 tags (section, article, etc.)
- Accessibility: proper heading hierarchy, ARIA labels
- Clean, modern, professional design
- Use spacing utilities (p-4, mb-6, etc.)
- Use text utilities (text-lg, font-semibold, etc.)
- Use grid/flex for layouts

STYLE GUIDELINES:
- Clean and readable typography
- Proper whitespace and spacing
- Visual hierarchy with headings
- Bullet points or numbered lists for features
- Tables for specifications
- Modern color scheme using Tailwind colors

CONTENT QUALITY:
- Engaging and persuasive language
- Focus on benefits, not just features
- Customer-centric tone
- SEO-friendly but natural language
- Scannable format (headings, lists, short paragraphs)

ALSO GENERATE:
- An optimized product title (max 70 characters)
- Title should match the ${template} style and include key benefits
- Include SEO keywords naturally

OUTPUT FORMAT:
Return a JSON object with two fields:
{
  "title": "Optimized product title here",
  "html": "Complete HTML description here"
}

The HTML should be ready to insert directly into a Shopify product description.
Start with a <div> wrapper and use nested semantic tags.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content generated by AI');
    }

    // Clean up the response (remove markdown code blocks if present)
    content = content
      .replace(/```json\n?/g, '')
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parse JSON response
    let optimizedTitle = title;
    let htmlDescription = content;
    
    try {
      const parsed = JSON.parse(content);
      optimizedTitle = parsed.title || title;
      htmlDescription = parsed.html || content;
    } catch (e) {
      // If not JSON, treat as plain HTML
      console.log('Response not JSON, using as plain HTML');
    }

    // Calculate basic metrics
    const characteristicsCount = (htmlDescription.match(/<li>/g) || []).length;
    const mediaCount = images?.length || 0;

    console.log('HTML description generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        optimizedTitle,
        htmlDescription,
        characteristicsCount,
        mediaCount,
        mobileOptimized: true,
        wordCount: htmlDescription.split(/\s+/).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-product-description-html:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate product description',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
