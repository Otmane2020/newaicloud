#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

interface TranslationIssue {
  type: 'missing_key' | 'extra_key' | 'hardcoded_text' | 'missing_hook' | 'mixed_language_value';
  severity: 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  message: string;
  key?: string;
  value?: string;
}

const issues: TranslationIssue[] = [];

// Load translation files
function loadTranslations() {
  const frPath = path.join(process.cwd(), 'src/lib/translations/fr.ts');
  const enPath = path.join(process.cwd(), 'src/lib/translations/en.ts');
  
  const frContent = fs.readFileSync(frPath, 'utf-8');
  const enContent = fs.readFileSync(enPath, 'utf-8');
  
  return { frContent, enContent };
}

// Extract all keys from translation object
function extractKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const lines = content.split('\n');
  let currentPath: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Track nesting level
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    
    // Extract key name
    const keyMatch = trimmed.match(/^(\w+):\s*{/);
    if (keyMatch) {
      currentPath.push(keyMatch[1]);
    }
    
    // Extract leaf values
    const valueMatch = trimmed.match(/^(\w+):\s*["']/);
    if (valueMatch && currentPath.length > 0) {
      const fullKey = [...currentPath, valueMatch[1]].join('.');
      keys.add(fullKey);
    }
    
    // Pop from path on closing braces
    for (let i = 0; i < closeBraces - openBraces; i++) {
      currentPath.pop();
    }
  });
  
  return keys;
}

// Check for missing translations
function checkMissingTranslations() {
  const { frContent, enContent } = loadTranslations();
  
  const frKeys = extractKeys(frContent);
  const enKeys = extractKeys(enContent);
  
  // Keys in FR but not in EN
  frKeys.forEach(key => {
    if (!enKeys.has(key)) {
      issues.push({
        type: 'missing_key',
        severity: 'high',
        file: 'src/lib/translations/en.ts',
        message: `Missing English translation for key: ${key}`
      });
    }
  });
  
  // Keys in EN but not in FR
  enKeys.forEach(key => {
    if (!frKeys.has(key)) {
      issues.push({
        type: 'extra_key',
        severity: 'medium',
        file: 'src/lib/translations/fr.ts',
        message: `Missing French translation for key: ${key}`
      });
    }
  });
}

// Helper functions to detect mixed languages
function isProbablyFrench(text: string): boolean {
  if (text.length < 3) return false;
  
  // Check for French accents
  const hasAccents = /[àâäéèêëïîôùûüÿçœæ]/i.test(text);
  
  // Common French words/patterns
  const frenchWords = /\b(le|la|les|un|une|des|de|du|et|ou|dans|sur|avec|pour|par|est|sont|à|au|aux|ce|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses)\b/i;
  
  return hasAccents || frenchWords.test(text);
}

function isProbablyEnglish(text: string): boolean {
  if (text.length < 3) return false;
  
  // Should not have French accents
  if (/[àâäéèêëïîôùûüÿçœæ]/i.test(text)) return false;
  
  // Common English words
  const englishWords = /\b(the|a|an|and|or|in|on|at|to|for|of|with|by|from|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|should|could|may|might|can|this|that|these|those)\b/i;
  
  return englishWords.test(text);
}

// Extract all translation values from an object
function getAllTranslationValues(obj: any, prefix = ''): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      results.push({ key: fullKey, value });
    } else if (typeof value === 'object' && value !== null) {
      results.push(...getAllTranslationValues(value, fullKey));
    }
  }
  
  return results;
}

// Check for mixed languages in translation files
function checkMixedLanguages() {
  const { frContent, enContent } = loadTranslations();
  
  // Parse translation objects (simplified - we'll extract values from the file content)
  const enValues = getAllTranslationValuesFromContent(enContent, 'en');
  const frValues = getAllTranslationValuesFromContent(frContent, 'fr');
  
  // Check EN file for French text
  enValues.forEach(({ key, value, line }) => {
    if (isProbablyFrench(value) && value.length > 10) {
      issues.push({
        type: 'mixed_language_value',
        severity: 'high',
        file: 'src/lib/translations/en.ts',
        line,
        message: `French text detected in English translation: "${value}"`,
        key,
        value
      });
    }
  });
  
  // Check FR file for English text
  frValues.forEach(({ key, value, line }) => {
    if (isProbablyEnglish(value) && value.length > 10 && !isProbablyFrench(value)) {
      issues.push({
        type: 'mixed_language_value',
        severity: 'high',
        file: 'src/lib/translations/fr.ts',
        line,
        message: `English text detected in French translation: "${value}"`,
        key,
        value
      });
    }
  });
}

// Extract translation values from file content with line numbers
function getAllTranslationValuesFromContent(content: string, lang: string): Array<{ key: string; value: string; line: number }> {
  const results: Array<{ key: string; value: string; line: number }> = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Match lines like: key: "value" or key: 'value'
    const match = line.match(/^\s*(\w+):\s*["']([^"']+)["']/);
    if (match) {
      const [, key, value] = match;
      results.push({ 
        key, 
        value, 
        line: index + 1 
      });
    }
  });
  
  return results;
}

// Scan component files for hardcoded text and missing useTranslation
function scanComponentFiles() {
  const dirsToScan = [
    path.join(process.cwd(), 'src/components'),
    path.join(process.cwd(), 'src/pages')
  ];
  
  function scanDirectory(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        scanFile(filePath);
      }
    });
  }
  
  function scanFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Check if file uses useTranslation
    const hasUseTranslation = content.includes('useTranslation');
    const hasJSX = content.includes('return (') || content.includes('return(');
    
    if (hasJSX && !hasUseTranslation) {
      // Check for potential hardcoded French text
      const frenchPatterns = [
        /['"]([^'"]*(?:é|è|ê|à|ç|ù)[^'"]*)['"]/g,
        /['"]([^'"]*(?:Créer|Modifier|Supprimer|Enregistrer|Annuler)[^'"]*)['"]/g
      ];
      
      let hasHardcodedFrench = false;
      frenchPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          hasHardcodedFrench = true;
        }
      });
      
      if (hasHardcodedFrench) {
        issues.push({
          type: 'missing_hook',
          severity: 'high',
          file: relativePath,
          message: 'Component contains potential hardcoded text but does not use useTranslation'
        });
      }
    }
    
    // Check for hardcoded text in JSX even if useTranslation is present
    if (hasUseTranslation) {
      lines.forEach((line, index) => {
        // Look for JSX text content with French characters
        const jsxTextMatch = line.match(/>\s*([^<{]+(?:é|è|ê|à|ç|ù)[^<{]+)\s*</);
        if (jsxTextMatch && !line.includes('language ===')) {
          const text = jsxTextMatch[1].trim();
          if (text.length > 3 && !text.match(/^\d+$/)) {
            issues.push({
              type: 'hardcoded_text',
              severity: 'medium',
              file: relativePath,
              line: index + 1,
              message: `Potential hardcoded text: "${text}"`
            });
          }
        }
        
        // Look for hardcoded strings in common UI patterns
        const patterns = [
          /title:\s*["']([^"']*(?:é|è|ê|à|ç|ù)[^"']*)["']/,
          /description:\s*["']([^"']*(?:é|è|ê|à|ç|ù)[^"']*)["']/,
          /placeholder:\s*["']([^"']*(?:é|è|ê|à|ç|ù)[^"']*)["']/,
          /label:\s*["']([^"']*(?:é|è|ê|à|ç|ù)[^"']*)["']/
        ];
        
        patterns.forEach(pattern => {
          const match = line.match(pattern);
          if (match && !line.includes('language ===') && !line.includes('t.')) {
            issues.push({
              type: 'hardcoded_text',
              severity: 'medium',
              file: relativePath,
              line: index + 1,
              message: `Hardcoded text in props: "${match[1]}"`
            });
          }
        });
      });
    }
  }
  
  dirsToScan.forEach(dir => scanDirectory(dir));
}

// Main validation
console.log('🔍 Validating translations...\n');

checkMissingTranslations();
checkMixedLanguages();
scanComponentFiles();

// Report results
if (issues.length === 0) {
  console.log('✅ No translation issues found!\n');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${issues.length} translation issues:\n`);
  
  // Group by severity and type
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');
  
  const mixedLanguageIssues = issues.filter(i => i.type === 'mixed_language_value');
  
  if (highIssues.length > 0) {
    console.log(`🔴 High Priority (${highIssues.length}):`);
    highIssues.forEach(issue => {
      console.log(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`    ${issue.message}\n`);
    });
  }
  
  if (mediumIssues.length > 0) {
    console.log(`🟡 Medium Priority (${mediumIssues.length}):`);
    mediumIssues.forEach(issue => {
      console.log(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`    ${issue.message}\n`);
    });
  }
  
  if (lowIssues.length > 0) {
    console.log(`🟢 Low Priority (${lowIssues.length}):`);
    lowIssues.forEach(issue => {
      console.log(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`    ${issue.message}\n`);
    });
  }
  
  console.log('\n📊 Summary:');
  console.log(`  Total issues: ${issues.length}`);
  console.log(`  High priority: ${highIssues.length}`);
  console.log(`  Medium priority: ${mediumIssues.length}`);
  console.log(`  Low priority: ${lowIssues.length}`);
  console.log(`  Mixed language values: ${mixedLanguageIssues.length}\n`);
  
  process.exit(1);
}
