-- Corriger les politiques RLS pour le bucket generated-images

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can upload generated images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to generated images" ON storage.objects;

-- Autoriser l'upload des images générées par les utilisateurs authentifiés
CREATE POLICY "Users can upload generated images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-images');

-- Autoriser la lecture publique des images générées
CREATE POLICY "Public read access to generated images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generated-images');