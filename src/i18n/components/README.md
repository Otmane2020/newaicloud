# Component-Based Translation System

## Structure

Each component has its own translation files organized by language:

```
src/i18n/components/
├── index.ts              # Namespace definitions
├── hero.en.json          # Hero section - English
├── hero.fr.json          # Hero section - French
├── hero.ar.json          # Hero section - Arabic
├── features.en.json      # Features section - English
├── features.fr.json      # Features section - French
├── features.ar.json      # Features section - Arabic
└── ...
```

## Usage

### Basic Usage
```typescript
import { useTranslation } from '@/hooks/useTranslation';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <h1>{t('hero.title')}</h1>;
};
```

## Translation Detection Features

### 1. Missing Translation Warnings
The system automatically detects and logs missing translations:
```
⚠️ Missing translation for key: "hero.badge" in language: fr
```

### 2. Mixed Language Detection
Detects when Arabic and Latin scripts are mixed:
```
🚨 Mixed Arabic-Latin content detected: Hello مرحبا
❌ Mixed language detected in key: "hero.title"
```

### 3. Arabic Number Fix
Automatically wraps numbers in RTL marks to prevent reversal in Arabic text:
- Before: "123 منتج" → displays as "321 منتج"
- After: "123 منتج" → displays correctly as "123 منتج"

## Guidelines for Translators

### Arabic (RTL) Guidelines
1. **Numbers**: Keep numbers in Western Arabic numerals (1,2,3) not Eastern (١,٢,٣)
2. **Mixed content**: Avoid mixing English words in Arabic text
3. **Punctuation**: Use Arabic punctuation (،) instead of Latin (,)
4. **Test**: Always test RTL rendering in browser

### Translation Quality
- Keep translations concise and natural
- Maintain brand voice across languages
- Use appropriate formal/informal tone per language
- Consider cultural context

## Adding New Component Translations

1. Create translation files for each language:
```bash
touch src/i18n/components/mycomponent.en.json
touch src/i18n/components/mycomponent.fr.json
touch src/i18n/components/mycomponent.ar.json
```

2. Add namespace to index.ts:
```typescript
export const componentNamespaces = {
  // ... existing
  mycomponent: 'mycomponent',
} as const;
```

3. Use in component:
```typescript
const { t } = useTranslation();
<div>{t('mycomponent.title')}</div>
```

## Console Monitoring

Open browser console to see:
- ⚠️ Missing translation warnings
- 🚨 Mixed language content alerts
- ❌ Translation quality issues

This helps maintain high-quality translations across all languages.
