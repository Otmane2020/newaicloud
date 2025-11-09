-- Ajouter la colonne is_pre_auth à oauth_states pour supporter le flow pre-auth
ALTER TABLE public.oauth_states 
ADD COLUMN IF NOT EXISTS is_pre_auth BOOLEAN DEFAULT false;

-- Modifier la colonne user_id pour la rendre nullable (pour le flow pre-auth)
ALTER TABLE public.oauth_states 
ALTER COLUMN user_id DROP NOT NULL;