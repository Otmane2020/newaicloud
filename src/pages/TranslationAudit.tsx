import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Search, FileText, Languages, Download, ListChecks, FileJson, AlertTriangle, Info, TrendingUp, Plus, Copy } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { translations as enTranslations } from "@/lib/translations/en";
import { translations as frTranslations } from "@/lib/translations/fr";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranslationIssue {
  component: string;
  file: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  recommendation?: string;
  translationKey?: string;
}

const TranslationAudit = () => {
  const [issues, setIssues] = useState<TranslationIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [stats, setStats] = useState({
    totalComponents: 0,
    fullyTranslated: 0,
    partiallyTranslated: 0,
    notTranslated: 0,
    totalKeys: 0,
    matchedKeys: 0,
    coveragePercent: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setIsScanning(true);
    const foundIssues: TranslationIssue[] = [];

    try {
      // Deep comparison of translation keys
      const { missingKeys, extraKeys } = compareTranslationKeys(enTranslations, frTranslations);
      
      // Report missing French translations
      missingKeys.forEach(key => {
        foundIssues.push({
          component: "Translation Files",
          file: "src/lib/translations/fr.ts",
          issue: `Missing French translation for key: ${key}`,
          severity: 'error',
          recommendation: `Add translation for "${key}" in fr.ts`,
          translationKey: key
        });
      });

      // Report extra French keys (might be obsolete)
      extraKeys.forEach(key => {
        foundIssues.push({
          component: "Translation Files",
          file: "src/lib/translations/fr.ts",
          issue: `Extra French key not in English: ${key}`,
          severity: 'warning',
          recommendation: `Remove unused key "${key}" from fr.ts or add to en.ts`,
          translationKey: key
        });
      });

      // Check specific components
      const components = [
        { name: 'PricingComparison', file: 'src/components/PricingComparison.tsx', path: 'landing.pricing.comparison' },
        { name: 'ContactForm', file: 'src/components/ContactForm.tsx', path: 'landing.contact' },
        { name: 'Index', file: 'src/pages/Index.tsx', path: 'landing.hero' },
        { name: 'Footer', file: 'src/components/Footer.tsx', path: 'footer' },
        { name: 'Navigation', file: 'src/components/Navigation.tsx', path: 'navigation' },
      ];

      let fullyTranslated = 0;
      let partiallyTranslated = 0;
      let notTranslated = 0;

      components.forEach(comp => {
        const enExists = checkTranslationPath(enTranslations, comp.path);
        const frExists = checkTranslationPath(frTranslations, comp.path);

        if (enExists && frExists) {
          fullyTranslated++;
          foundIssues.push({
            component: comp.name,
            file: comp.file,
            issue: "✅ Fully translated",
            severity: 'info',
            recommendation: "No action needed"
          });
        } else if (enExists && !frExists) {
          notTranslated++;
          foundIssues.push({
            component: comp.name,
            file: comp.file,
            issue: `❌ Missing French translation path: ${comp.path}`,
            severity: 'error',
            recommendation: `Add translation path "${comp.path}" to fr.ts`
          });
        } else if (!enExists && frExists) {
          partiallyTranslated++;
          foundIssues.push({
            component: comp.name,
            file: comp.file,
            issue: `⚠️ Missing English translation path: ${comp.path}`,
            severity: 'warning',
            recommendation: `Add translation path "${comp.path}" to en.ts`
          });
        } else {
          notTranslated++;
          foundIssues.push({
            component: comp.name,
            file: comp.file,
            issue: `❌ Missing translation path in both languages: ${comp.path}`,
            severity: 'error',
            recommendation: `Add translation path "${comp.path}" to both en.ts and fr.ts`
          });
        }
      });

      // Calculate coverage
      const totalEnKeys = countKeys(enTranslations);
      const totalFrKeys = countKeys(frTranslations);
      const matchedKeys = totalEnKeys - missingKeys.length;
      const coveragePercent = totalEnKeys > 0 ? Math.round((matchedKeys / totalEnKeys) * 100) : 100;

      setStats({
        totalComponents: components.length,
        fullyTranslated,
        partiallyTranslated,
        notTranslated,
        totalKeys: totalEnKeys,
        matchedKeys,
        coveragePercent,
      });

      setIssues(foundIssues);
      
      toast({
        title: "✅ Audit Complete",
        description: `Scanned ${components.length} components and ${totalEnKeys} translation keys`,
      });
    } catch (error) {
      console.error('Audit error:', error);
      toast({
        title: "❌ Audit Failed",
        description: "Unable to complete translation audit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const compareTranslationKeys = (enObj: any, frObj: any, prefix = ''): { missingKeys: string[]; extraKeys: string[] } => {
    const missingKeys: string[] = [];
    const extraKeys: string[] = [];

    const getAllKeys = (obj: any, currentPrefix = ''): string[] => {
      const keys: string[] = [];
      for (const key in obj) {
        const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys.push(...getAllKeys(obj[key], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    };

    const enKeys = getAllKeys(enObj);
    const frKeys = getAllKeys(frObj);

    // Find missing keys in French
    enKeys.forEach(key => {
      if (!frKeys.includes(key)) {
        missingKeys.push(key);
      }
    });

    // Find extra keys in French
    frKeys.forEach(key => {
      if (!enKeys.includes(key)) {
        extraKeys.push(key);
      }
    });

    return { missingKeys, extraKeys };
  };

  const countKeys = (obj: any): number => {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count += countKeys(obj[key]);
      } else {
        count++;
      }
    }
    return count;
  };

  const checkTranslationPath = (obj: any, path: string): boolean => {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current[key] === undefined) return false;
      current = current[key];
    }
    return true;
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const downloadReport = () => {
    try {
      console.log("Generating report...");
      const reportContent = `# Translation Audit Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Components: ${stats.totalComponents}
- Fully Translated: ${stats.fullyTranslated}
- Partially Translated: ${stats.partiallyTranslated}
- Not Translated: ${stats.notTranslated}

## Issues Found

${issues.map((issue, index) => `
### ${index + 1}. ${issue.component}
- **File:** ${issue.file}
- **Severity:** ${issue.severity.toUpperCase()}
- **Issue:** ${issue.issue}
${issue.recommendation ? `- **Recommendation:** ${issue.recommendation}` : ''}
`).join('\n')}

## Action Items

${issues.filter(i => i.severity === 'error').length > 0 ? `
### Critical Issues (Errors)
${issues.filter(i => i.severity === 'error').map(i => `- [ ] ${i.component}: ${i.issue}`).join('\n')}
` : ''}

${issues.filter(i => i.severity === 'warning').length > 0 ? `
### Warnings
${issues.filter(i => i.severity === 'warning').map(i => `- [ ] ${i.component}: ${i.issue}`).join('\n')}
` : ''}

---
*This report was automatically generated by the Translation Audit Tool*
`;

      console.log("Creating blob and download link...");
      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-audit-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Download completed and cleaned up");
      }, 100);

      toast({
        title: "✅ Report Downloaded",
        description: "Translation audit report has been saved as markdown file.",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "❌ Download Failed",
        description: "Unable to download report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateActionPlan = () => {
    try {
      const errorIssues = issues.filter(i => i.severity === 'error');
      const warningIssues = issues.filter(i => i.severity === 'warning');

      const actionPlanContent = errorIssues.length === 0 && warningIssues.length === 0
        ? generateMaintenancePlan()
        : generateFixPlan(errorIssues, warningIssues);

      const blob = new Blob([actionPlanContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-action-plan-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: errorIssues.length === 0 && warningIssues.length === 0 ? "✅ Maintenance Plan Created" : "✅ Action Plan Created",
        description: errorIssues.length === 0 && warningIssues.length === 0
          ? "Generated maintenance checklist for translation best practices"
          : `Generated action plan with ${errorIssues.length} critical and ${warningIssues.length} medium priority items`,
      });
    } catch (error) {
      console.error('Error generating action plan:', error);
      toast({
        title: "❌ Generation Failed",
        description: "Unable to generate action plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateMaintenancePlan = () => {
    return `# Translation Maintenance Plan 🎉
Generated: ${new Date().toLocaleString()}

## Project Status: FULLY TRANSLATED ✅

Congratulations! Your project has **${stats.coveragePercent}% translation coverage** with all ${stats.totalKeys} translation keys properly matched.

## Maintenance Checklist

### Monthly Tasks
- [ ] Review new components for hardcoded strings
- [ ] Verify translation quality with native speakers
- [ ] Check for context-appropriate translations
- [ ] Update translations for new features

### Best Practices
1. **Always use translation keys** - Never hardcode user-facing text
2. **Test both languages** - Switch language and verify all pages
3. **Keep keys organized** - Group related translations together
4. **Document context** - Add comments for complex translations
5. **Use consistent terminology** - Maintain a glossary

### Quality Assurance
- Run translation audit after each major feature
- Test language switching on all pages
- Verify mobile responsiveness with both languages
- Check for text overflow in translated content

### Future Improvements
- [ ] Add translation for new components
- [ ] Consider adding more language support
- [ ] Implement translation memory for consistency
- [ ] Set up automated translation testing

---
*Keep up the excellent work maintaining multilingual excellence!*
`;
  };

  const generateFixPlan = (errorIssues: TranslationIssue[], warningIssues: TranslationIssue[]) => {
    return `# Translation Action Plan
Generated: ${new Date().toLocaleString()}

## Coverage: ${stats.coveragePercent}%
**Status:** ${errorIssues.length > 0 ? '🔴 Action Required' : warningIssues.length > 0 ? '🟡 Minor Issues' : '🟢 Healthy'}

## Priority: Critical (${errorIssues.length})
${errorIssues.length > 0 ? errorIssues.map((issue, i) => `
${i + 1}. **${issue.component}**
   - File: \`${issue.file}\`
   - Issue: ${issue.issue}
   - Action: ${issue.recommendation || 'Add missing translation keys'}
   ${issue.translationKey ? `- Key: \`${issue.translationKey}\`` : ''}
`).join('\n') : '✅ No critical issues'}

## Priority: Medium (${warningIssues.length})
${warningIssues.length > 0 ? warningIssues.map((issue, i) => `
${i + 1}. **${issue.component}**
   - File: \`${issue.file}\`
   - Issue: ${issue.issue}
   - Action: ${issue.recommendation || 'Review and update translations'}
   ${issue.translationKey ? `- Key: \`${issue.translationKey}\`` : ''}
`).join('\n') : '✅ No warnings'}

## Implementation Steps
1. **Fix Critical Issues First** - Address all error-level issues
2. **Update Translation Files** - Modify en.ts and fr.ts
3. **Update Components** - Replace hardcoded strings with translation keys
4. **Test Both Languages** - Switch language and verify all pages
5. **Re-run Audit** - Confirm all issues are resolved

## Resources
- Translation files: \`src/lib/translations/en.ts\` and \`fr.ts\`
- Translation context: \`src/lib/language.tsx\`
- Documentation: Check TRANSLATION_GUIDELINES.md

---
*Generated by Translation Audit Tool*
`;
  };

  const downloadJSONReport = () => {
    try {
      const reportData = {
        generatedAt: new Date().toISOString(),
        stats,
        issues: issues.map(issue => ({
          ...issue,
          timestamp: new Date().toISOString()
        })),
        summary: {
          totalIssues: issues.length,
          errors: issues.filter(i => i.severity === 'error').length,
          warnings: issues.filter(i => i.severity === 'warning').length,
          info: issues.filter(i => i.severity === 'info').length,
        }
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-audit-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "✅ JSON Report Downloaded",
        description: "Translation audit exported as JSON for programmatic use.",
      });
    } catch (error) {
      console.error('Error downloading JSON report:', error);
      toast({
        title: "❌ Download Failed",
        description: "Unable to download JSON report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadErrorsOnly = () => {
    try {
      const errorIssues = issues.filter(i => i.severity === 'error' || i.severity === 'warning');
      
      if (errorIssues.length === 0) {
        toast({
          title: "ℹ️ No Issues",
          description: "No errors or warnings to export!",
        });
        return;
      }

      const reportContent = `# Translation Issues Report (Errors & Warnings Only)
Generated: ${new Date().toLocaleString()}

## Summary
- Errors: ${errorIssues.filter(i => i.severity === 'error').length}
- Warnings: ${errorIssues.filter(i => i.severity === 'warning').length}
- Coverage: ${stats.coveragePercent}%

## Issues

${errorIssues.map((issue, index) => `
### ${index + 1}. ${issue.component}
- **File:** ${issue.file}
- **Severity:** ${issue.severity.toUpperCase()}
- **Issue:** ${issue.issue}
${issue.recommendation ? `- **Recommendation:** ${issue.recommendation}` : ''}
${issue.translationKey ? `- **Key:** \`${issue.translationKey}\`` : ''}
`).join('\n')}
`;

      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-errors-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast({
        title: "✅ Errors Report Downloaded",
        description: `Exported ${errorIssues.length} issues requiring attention.`,
      });
    } catch (error) {
      console.error('Error downloading errors report:', error);
      toast({
        title: "❌ Download Failed",
        description: "Unable to download errors report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getMissingTranslations = () => {
    return issues.filter(i => 
      i.severity === 'error' && 
      i.translationKey && 
      i.file === 'src/lib/translations/fr.ts'
    );
  };

  const copyTranslationCode = () => {
    const missingTranslations = getMissingTranslations();
    
    if (missingTranslations.length === 0) {
      toast({
        title: "ℹ️ No Missing Translations",
        description: "All translations are up to date!",
      });
      return;
    }

    // Generate code snippet for missing translations
    const codeSnippet = `// Add these translations to src/lib/translations/fr.ts:\n\n${missingTranslations.map(issue => {
      const key = issue.translationKey!;
      const value = getValueFromPath(enTranslations, key);
      return `${key}: "${value || '[Translation needed]'}",`;
    }).join('\n')}`;

    navigator.clipboard.writeText(codeSnippet);
    
    toast({
      title: "✅ Code Copied",
      description: `Copied ${missingTranslations.length} translation keys to clipboard`,
    });
  };

  const getValueFromPath = (obj: any, path: string): any => {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current[key] === undefined) return null;
      current = current[key];
    }
    return typeof current === 'string' ? current : JSON.stringify(current);
  };

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const projectStatus = errorCount === 0 && warningCount === 0 ? 'healthy' : errorCount > 0 ? 'critical' : 'warning';

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-24">
        {/* Header with Status Badge */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Badge variant="outline" className="border-primary text-primary">
              <Languages className="w-4 h-4 mr-2" />
              Translation Audit
            </Badge>
            {projectStatus === 'healthy' && (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Fully Translated
              </Badge>
            )}
            {projectStatus === 'warning' && (
              <Badge variant="default" className="bg-warning text-warning-foreground">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Minor Issues
              </Badge>
            )}
            {projectStatus === 'critical' && (
              <Badge variant="destructive">
                <AlertCircle className="w-4 h-4 mr-1" />
                Action Required
              </Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Component Translation Status
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comprehensive audit of all components checking for missing translation keys and hardcoded text
          </p>
        </div>

        {/* Coverage Progress */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Translation Coverage
                </CardTitle>
                <CardDescription>
                  {stats.matchedKeys} of {stats.totalKeys} translation keys matched
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{stats.coveragePercent}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={stats.coveragePercent} className="h-3" />
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className={stats.fullyTranslated === stats.totalComponents ? "border-success" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Total Components
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalComponents}</div>
              <p className="text-xs text-muted-foreground mt-1">Scanned</p>
            </CardContent>
          </Card>
          
          <Card className={stats.fullyTranslated > 0 ? "border-success bg-success/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Fully Translated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.fullyTranslated}</div>
              <Progress value={(stats.fullyTranslated / stats.totalComponents) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
          
          <Card className={stats.partiallyTranslated > 0 ? "border-warning bg-warning/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Partially Translated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.partiallyTranslated}</div>
              <Progress value={(stats.partiallyTranslated / stats.totalComponents) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
          
          <Card className={stats.notTranslated > 0 ? "border-destructive bg-destructive/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Not Translated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.notTranslated}</div>
              <Progress value={(stats.notTranslated / stats.totalComponents) * 100} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Translation Issues ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issues.map((issue, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {getSeverityIcon(issue.severity)}
                          <span className="ml-1 capitalize">{issue.severity}</span>
                        </Badge>
                        <span className="font-semibold">{issue.component}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        📁 {issue.file}
                      </p>
                      
                      <p className="text-sm">
                        <strong>Issue:</strong> {issue.issue}
                      </p>
                      
                      {issue.recommendation && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm">
                            <strong className="text-primary">💡 Recommendation:</strong>{" "}
                            {issue.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={runAudit} 
              variant="outline" 
              size="lg"
              disabled={isScanning}
            >
              <Search className="w-4 h-4 mr-2" />
              {isScanning ? "Scanning..." : "Re-run Audit"}
            </Button>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="default" 
                  size="lg" 
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={getMissingTranslations().length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Missing Translations
                  {getMissingTranslations().length > 0 && (
                    <Badge className="ml-2 px-1.5 py-0 text-xs bg-success-foreground text-success">
                      {getMissingTranslations().length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-success" />
                    Add Missing Translations
                  </DialogTitle>
                  <DialogDescription>
                    Copy the code below and add it to your fr.ts translation file
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-96 w-full">
                  <div className="space-y-4">
                    {getMissingTranslations().map((issue, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="destructive" className="text-xs">
                                Missing
                              </Badge>
                              <code className="text-xs text-muted-foreground">
                                {issue.translationKey}
                              </code>
                            </div>
                            <div className="bg-muted p-3 rounded-md font-mono text-sm">
                              <div className="text-success">// English value:</div>
                              <div className="text-foreground">
                                {getValueFromPath(enTranslations, issue.translationKey || '')}
                              </div>
                              <div className="text-muted-foreground mt-2">
                                // Add French translation for: {issue.translationKey}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    copyTranslationCode();
                    setShowAddDialog(false);
                  }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              onClick={generateActionPlan} 
              variant="default" 
              size="lg" 
              className="bg-primary relative"
            >
              <ListChecks className="w-4 h-4 mr-2" />
              Generate Action Plan
              {(errorCount > 0 || warningCount > 0) && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                  {errorCount + warningCount}
                </Badge>
              )}
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Full Report (MD)
            </Button>
            <Button onClick={downloadJSONReport} variant="outline" size="sm">
              <FileJson className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button 
              onClick={downloadErrorsOnly} 
              variant="outline" 
              size="sm"
              disabled={errorCount === 0 && warningCount === 0}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Errors Only ({errorCount + warningCount})
            </Button>
          </div>
        </div>

        {/* Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Severity Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-2">
                <Badge variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                </Badge>
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm text-muted-foreground">
                    Critical translation missing - breaks user experience
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="default">
                  <AlertCircle className="w-4 h-4" />
                </Badge>
                <div>
                  <p className="font-semibold">Warning</p>
                  <p className="text-sm text-muted-foreground">
                    Translation inconsistency - should be fixed
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Badge variant="secondary">
                  <CheckCircle2 className="w-4 h-4" />
                </Badge>
                <div>
                  <p className="font-semibold">Info</p>
                  <p className="text-sm text-muted-foreground">
                    Component is properly translated
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TranslationAudit;
