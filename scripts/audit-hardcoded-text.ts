#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';

interface AuditIssue {
  type: 'toast' | 'error' | 'dialog' | 'prop' | 'jsx_text';
  severity: 'critical' | 'high' | 'medium';
  file: string;
  line: number;
  text: string;
  suggestedKey?: string;
  context: string;
}

const issues: AuditIssue[] = [];

// Generate suggested translation key from text
function generateSuggestedKey(text: string, type: string): string {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  
  const prefix = type === 'toast' ? 'toasts.' : type === 'error' ? 'errors.' : type === 'dialog' ? 'dialogs.' : 'common.';
  return `${prefix}${clean}`;
}

// Scan all TypeScript files
function scanAllFiles() {
  const dirsToScan = [
    path.join(process.cwd(), 'src/components'),
    path.join(process.cwd(), 'src/pages'),
    path.join(process.cwd(), 'src/hooks')
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
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // 1. Hardcoded toasts
      const toastSimple = /toast\.(success|error|info|warning|loading)\(\s*["']([^"']+)["']/g;
      let match;
      while ((match = toastSimple.exec(line)) !== null) {
        if (!line.includes('t.') && !line.includes('tf(')) {
          issues.push({
            type: 'toast',
            severity: 'critical',
            file: relativePath,
            line: lineNumber,
            text: match[2],
            suggestedKey: generateSuggestedKey(match[2], 'toast'),
            context: line.trim()
          });
        }
      }
      
      const toastObject = /toast\(\{\s*title:\s*["']([^"']+)["']/g;
      while ((match = toastObject.exec(line)) !== null) {
        if (!line.includes('t.') && !line.includes('tf(')) {
          issues.push({
            type: 'toast',
            severity: 'critical',
            file: relativePath,
            line: lineNumber,
            text: match[1],
            suggestedKey: generateSuggestedKey(match[1], 'toast'),
            context: line.trim()
          });
        }
      }
      
      // 2. Hardcoded errors
      const throwError = /throw new Error\(\s*["']([^"']+)["']\s*\)/g;
      while ((match = throwError.exec(line)) !== null) {
        if (!line.includes('t.') && !line.includes('tf(')) {
          issues.push({
            type: 'error',
            severity: 'high',
            file: relativePath,
            line: lineNumber,
            text: match[1],
            suggestedKey: generateSuggestedKey(match[1], 'error'),
            context: line.trim()
          });
        }
      }
      
      // 3. Hardcoded Dialog/Alert content
      const dialogContent = /<(Dialog|Alert)(Title|Description)>\s*([A-ZÀ-Ÿ][^<{]+)/g;
      while ((match = dialogContent.exec(line)) !== null) {
        if (!line.includes('{t.') && match[3].trim().length > 3) {
          issues.push({
            type: 'dialog',
            severity: 'high',
            file: relativePath,
            line: lineNumber,
            text: match[3].trim(),
            suggestedKey: generateSuggestedKey(match[3], 'dialog'),
            context: line.trim()
          });
        }
      }
      
      // 4. Hardcoded props
      const propsPattern = /(placeholder|label|title|description):\s*["']([^"']+)["']/g;
      while ((match = propsPattern.exec(line)) !== null) {
        const text = match[2];
        // Only flag if it contains accents or common French/English words
        if ((/[àâäéèêëïîôùûüÿç]/i.test(text) || text.length > 20) && !line.includes('t.')) {
          issues.push({
            type: 'prop',
            severity: 'medium',
            file: relativePath,
            line: lineNumber,
            text,
            suggestedKey: generateSuggestedKey(text, 'common'),
            context: line.trim()
          });
        }
      }
      
      // 5. Hardcoded JSX text with accents
      const jsxText = />\s*([^<{]+[àâäéèêëïîôùûüÿç][^<{]+)\s*</gi;
      while ((match = jsxText.exec(line)) !== null) {
        const text = match[1].trim();
        if (text.length > 5 && !line.includes('language ===')) {
          issues.push({
            type: 'jsx_text',
            severity: 'medium',
            file: relativePath,
            line: lineNumber,
            text,
            suggestedKey: generateSuggestedKey(text, 'common'),
            context: line.trim()
          });
        }
      }
    });
  }
  
  dirsToScan.forEach(dir => scanDirectory(dir));
}

// Main execution
console.log('🔍 Running comprehensive hardcoded text audit...\n');

scanAllFiles();

// Generate report
const reportPath = path.join(process.cwd(), 'translation-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));

// Console output
console.log(`📊 Audit Results:\n`);
console.log(`Total issues found: ${issues.length}`);
console.log(`  🔴 Critical (toasts): ${issues.filter(i => i.type === 'toast').length}`);
console.log(`  🟠 High (errors): ${issues.filter(i => i.type === 'error').length}`);
console.log(`  🟡 High (dialogs): ${issues.filter(i => i.type === 'dialog').length}`);
console.log(`  🟢 Medium (props): ${issues.filter(i => i.type === 'prop').length}`);
console.log(`  🟢 Medium (jsx text): ${issues.filter(i => i.type === 'jsx_text').length}\n`);

// Group by file
const byFile = issues.reduce((acc, issue) => {
  if (!acc[issue.file]) acc[issue.file] = [];
  acc[issue.file].push(issue);
  return acc;
}, {} as Record<string, AuditIssue[]>);

console.log('📁 Top 10 files with most issues:\n');
Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([file, fileIssues]) => {
    console.log(`  ${file}: ${fileIssues.length} issues`);
  });

console.log(`\n✅ Full report saved to: ${reportPath}\n`);

if (issues.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
