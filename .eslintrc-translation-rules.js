/**
 * Custom ESLint rules for enforcing translation usage
 * 
 * These rules prevent hardcoded text from being committed to the codebase.
 * ALL user-facing text must use the translation system (t. or tf()).
 */

module.exports = {
  rules: {
    // Prevent hardcoded toast messages
    'no-hardcoded-toast': {
      create(context) {
        return {
          CallExpression(node) {
            // Check for toast.success("text"), toast.error("text"), etc.
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'toast' &&
              ['success', 'error', 'info', 'warning', 'loading'].includes(node.callee.property.name)
            ) {
              const firstArg = node.arguments[0];
              if (firstArg && firstArg.type === 'Literal') {
                context.report({
                  node,
                  message: 'Toast messages must use translations (t.toasts.* or tf())',
                  fix(fixer) {
                    return null; // No auto-fix, must be done manually
                  }
                });
              }
            }
            
            // Check for toast({ title: "text" })
            if (
              node.callee.name === 'toast' &&
              node.arguments[0]?.type === 'ObjectExpression'
            ) {
              const titleProp = node.arguments[0].properties.find(
                p => p.key?.name === 'title' && p.value?.type === 'Literal'
              );
              if (titleProp) {
                context.report({
                  node: titleProp,
                  message: 'Toast titles must use translations (t.toasts.*)',
                });
              }
            }
          }
        };
      }
    },
    
    // Prevent hardcoded Error messages
    'no-hardcoded-error': {
      create(context) {
        return {
          ThrowStatement(node) {
            if (
              node.argument?.type === 'NewExpression' &&
              node.argument.callee?.name === 'Error' &&
              node.argument.arguments[0]?.type === 'Literal'
            ) {
              context.report({
                node: node.argument,
                message: 'Error messages must use translations (t.errors.*)',
              });
            }
          }
        };
      }
    },
    
    // Prevent hardcoded Dialog/Alert content
    'no-hardcoded-dialog': {
      create(context) {
        return {
          JSXElement(node) {
            const name = node.openingElement?.name?.name;
            if (['DialogTitle', 'DialogDescription', 'AlertTitle', 'AlertDescription'].includes(name)) {
              const hasTextChild = node.children.some(
                child => child.type === 'JSXText' && child.value.trim().length > 0
              );
              if (hasTextChild) {
                context.report({
                  node,
                  message: `${name} content must use translations (wrap in {t.*})`,
                });
              }
            }
          }
        };
      }
    }
  }
};
