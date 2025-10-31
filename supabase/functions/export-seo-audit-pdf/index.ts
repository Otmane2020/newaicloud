import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest audit report
    const { data: report, error: reportError } = await supabaseClient
      .from('seo_audit_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: 'No audit report found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store name
    const auditResults = report.audit_results as any;
    const storeName = auditResults?.storeName || 'Boutique';
    const storeUrl = auditResults?.storeUrl || '';
    const analyzedAt = new Date(report.created_at).toLocaleDateString('fr-FR');

    // Generate PDF HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    
    .header { text-align: center; padding: 40px 0; border-bottom: 3px solid #0ea5e9; margin-bottom: 40px; }
    .header h1 { font-size: 32px; color: #0ea5e9; margin-bottom: 10px; }
    .header .subtitle { font-size: 16px; color: #64748b; }
    
    .score-card { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
    .score-card .score { font-size: 72px; font-weight: bold; margin: 20px 0; }
    .score-card .label { font-size: 18px; opacity: 0.9; }
    
    .section { margin: 40px 0; padding: 30px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #0ea5e9; }
    .section-title { font-size: 24px; color: #0f172a; margin-bottom: 20px; font-weight: 600; }
    
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .metric-label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
    .metric-value { font-size: 28px; font-weight: bold; color: #0ea5e9; }
    .metric-score { font-size: 18px; color: #64748b; }
    
    .issue-list { list-style: none; }
    .issue-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #ef4444; }
    .issue-item.warning { border-left-color: #f59e0b; }
    .issue-item.info { border-left-color: #3b82f6; }
    .issue-count { font-weight: bold; color: #0f172a; }
    
    .recommendations { background: #ecfeff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .recommendations ul { margin-left: 20px; }
    .recommendations li { margin: 10px 0; color: #164e63; }
    
    .footer { text-align: center; padding: 40px 0; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; margin-top: 60px; }
    
    @media print {
      .container { padding: 20px; }
      .score-card { background: #0ea5e9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Rapport d'Audit SEO</h1>
      <div class="subtitle">${storeName}</div>
      <div class="subtitle" style="margin-top: 10px;">${storeUrl}</div>
      <div class="subtitle" style="margin-top: 5px;">Généré le ${analyzedAt}</div>
    </div>

    <!-- Global Score -->
    <div class="score-card">
      <div class="label">Score SEO Global</div>
      <div class="score">${report.global_score}/100</div>
      <div class="label">${getScoreGrade(report.global_score)}</div>
    </div>

    <!-- Scores par catégorie -->
    <div class="section">
      <h2 class="section-title">📈 Scores par Catégorie</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-label">Page d'accueil</div>
          <div class="metric-value">${report.homepage_score}</div>
          <div class="metric-score">/100</div>
        </div>
        <div class="metric">
          <div class="metric-label">Produits</div>
          <div class="metric-value">${report.products_score}</div>
          <div class="metric-score">/100</div>
        </div>
        <div class="metric">
          <div class="metric-label">Collections</div>
          <div class="metric-value">${report.collections_score}</div>
          <div class="metric-score">/100</div>
        </div>
        <div class="metric">
          <div class="metric-label">Blog</div>
          <div class="metric-value">${report.blog_score}</div>
          <div class="metric-score">/100</div>
        </div>
      </div>
    </div>

    <!-- Meta Titles Analysis -->
    ${generateMetaTitlesSection(report.meta_titles)}

    <!-- Meta Descriptions Analysis -->
    ${generateMetaDescriptionsSection(report.meta_descriptions)}

    <!-- Image ALT Tags Analysis -->
    ${generateImageAltSection(report.image_alt_tags)}

    <!-- Technical Indicators -->
    <div class="section">
      <h2 class="section-title">🔧 Indicateurs Techniques</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-label">SSL/HTTPS</div>
          <div class="metric-value" style="color: ${report.ssl_secure ? '#10b981' : '#ef4444'}">
            ${report.ssl_secure ? '✓ Activé' : '✗ Désactivé'}
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">Mobile-Friendly</div>
          <div class="metric-value" style="color: ${report.mobile_friendly ? '#10b981' : '#f59e0b'}">
            ${report.mobile_friendly ? '✓ Optimisé' : '⚠ À vérifier'}
          </div>
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    ${generateRecommendationsSection(report.audit_results?.results)}

    <!-- Footer -->
    <div class="footer">
      <div>Rapport généré par NewAI - Optimisation SEO Automatisée</div>
      <div style="margin-top: 10px;">Pour toute question, contactez notre équipe support</div>
    </div>
  </div>
</body>
</html>
`;

    // Return HTML that can be converted to PDF by the browser
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="rapport-seo-${storeName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getScoreGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Très Bon';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'À Améliorer';
}

function generateMetaTitlesSection(metaTitles: any): string {
  if (!metaTitles) return '';
  
  const totalIssues = (metaTitles.long?.length || 0) + 
                      (metaTitles.short?.length || 0) + 
                      (metaTitles.missing?.length || 0);
  
  if (totalIssues === 0) {
    return `
    <div class="section">
      <h2 class="section-title">📝 Meta Titles</h2>
      <div class="metric" style="border-left: 3px solid #10b981;">
        <div class="metric-label">Statut</div>
        <div class="metric-value" style="color: #10b981;">✓ Optimisés</div>
      </div>
    </div>`;
  }

  return `
    <div class="section">
      <h2 class="section-title">📝 Meta Titles - ${totalIssues} problèmes détectés</h2>
      <ul class="issue-list">
        ${metaTitles.long?.length ? `<li class="issue-item warning"><span class="issue-count">${metaTitles.long.length}</span> titres trop longs (>60 caractères)</li>` : ''}
        ${metaTitles.short?.length ? `<li class="issue-item warning"><span class="issue-count">${metaTitles.short.length}</span> titres trop courts (<30 caractères)</li>` : ''}
        ${metaTitles.missing?.length ? `<li class="issue-item"><span class="issue-count">${metaTitles.missing.length}</span> titres manquants</li>` : ''}
        ${metaTitles.duplicates?.length ? `<li class="issue-item"><span class="issue-count">${metaTitles.duplicates.length}</span> titres dupliqués</li>` : ''}
      </ul>
    </div>`;
}

function generateMetaDescriptionsSection(metaDescriptions: any): string {
  if (!metaDescriptions) return '';
  
  const totalIssues = (metaDescriptions.long?.length || 0) + 
                      (metaDescriptions.short?.length || 0) + 
                      (metaDescriptions.missing?.length || 0);
  
  if (totalIssues === 0) {
    return `
    <div class="section">
      <h2 class="section-title">📄 Meta Descriptions</h2>
      <div class="metric" style="border-left: 3px solid #10b981;">
        <div class="metric-label">Statut</div>
        <div class="metric-value" style="color: #10b981;">✓ Optimisées</div>
      </div>
    </div>`;
  }

  return `
    <div class="section">
      <h2 class="section-title">📄 Meta Descriptions - ${totalIssues} problèmes détectés</h2>
      <ul class="issue-list">
        ${metaDescriptions.long?.length ? `<li class="issue-item warning"><span class="issue-count">${metaDescriptions.long.length}</span> descriptions trop longues (>160 caractères)</li>` : ''}
        ${metaDescriptions.short?.length ? `<li class="issue-item warning"><span class="issue-count">${metaDescriptions.short.length}</span> descriptions trop courtes (<50 caractères)</li>` : ''}
        ${metaDescriptions.missing?.length ? `<li class="issue-item"><span class="issue-count">${metaDescriptions.missing.length}</span> descriptions manquantes</li>` : ''}
        ${metaDescriptions.duplicates?.length ? `<li class="issue-item"><span class="issue-count">${metaDescriptions.duplicates.length}</span> descriptions dupliquées</li>` : ''}
      </ul>
    </div>`;
}

function generateImageAltSection(imageAlt: any): string {
  if (!imageAlt) return '';
  
  const missingCount = imageAlt.missing?.length || 0;
  const optimizedCount = imageAlt.optimized?.length || 0;
  const totalImages = missingCount + optimizedCount;
  const score = totalImages > 0 ? Math.round((optimizedCount / totalImages) * 100) : 0;

  return `
    <div class="section">
      <h2 class="section-title">🖼️ Balises ALT des Images</h2>
      <div class="metrics-grid">
        <div class="metric" style="border-left: 3px solid ${missingCount > 0 ? '#ef4444' : '#10b981'};">
          <div class="metric-label">Images sans ALT</div>
          <div class="metric-value" style="color: ${missingCount > 0 ? '#ef4444' : '#10b981'};">${missingCount}</div>
          <div class="metric-score">sur ${totalImages}</div>
        </div>
        <div class="metric" style="border-left: 3px solid #0ea5e9;">
          <div class="metric-label">Score d'optimisation</div>
          <div class="metric-value">${score}%</div>
          <div class="metric-score">${optimizedCount} optimisées</div>
        </div>
      </div>
    </div>`;
}

function generateRecommendationsSection(results: any[]): string {
  if (!results || results.length === 0) return '';

  const allRecommendations: string[] = [];
  results.forEach(result => {
    if (result.recommendations && Array.isArray(result.recommendations)) {
      allRecommendations.push(...result.recommendations);
    }
  });

  if (allRecommendations.length === 0) return '';

  // Limit to top 10 recommendations
  const topRecommendations = allRecommendations.slice(0, 10);

  return `
    <div class="section">
      <h2 class="section-title">💡 Recommandations Prioritaires</h2>
      <div class="recommendations">
        <ul>
          ${topRecommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    </div>`;
}
