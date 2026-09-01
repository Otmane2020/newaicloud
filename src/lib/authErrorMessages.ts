export type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
};

export function isWeakPasswordError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;

  const code = String(error.code || '').toLowerCase();
  const message = String(error.message || '').toLowerCase();

  return (
    code === 'weak_password' ||
    code.includes('weak_password') ||
    message.includes('password is known to be weak') ||
    message.includes('easy to guess') ||
    message.includes('weak password') ||
    message.includes('password is too weak')
  );
}

export function showFriendlyAuthError(
  error: AuthErrorLike | null | undefined,
  language: 'fr' | 'en',
  showToast: (title: string, options?: { description?: string }) => void,
): void {
  if (isWeakPasswordError(error)) {
    showToast(language === 'fr' ? 'Mot de passe trop faible' : 'Password too weak', {
      description: language === 'fr'
        ? 'Ce mot de passe est trop facile à deviner. Choisissez-en un plus sécurisé avec des lettres, chiffres et caractères spéciaux.'
        : 'This password is too easy to guess. Choose a stronger password with letters, numbers, and special characters.',
    });
    return;
  }

  showToast(
    error?.message || (language === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.'),
  );
}
