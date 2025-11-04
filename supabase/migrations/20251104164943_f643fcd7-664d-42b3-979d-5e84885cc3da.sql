-- PHASE 1: Correction Critique des Policies RLS sur sync_history
-- Permettre aux utilisateurs authentifiés de créer et mettre à jour leurs propres logs de synchronisation

-- Policy INSERT pour permettre aux utilisateurs de créer leurs logs
CREATE POLICY "Users can insert their own sync history"
ON sync_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE pour permettre aux utilisateurs de mettre à jour leurs logs
CREATE POLICY "Users can update their own sync history"
ON sync_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ajouter un index pour améliorer les performances des requêtes de synchronisation
CREATE INDEX IF NOT EXISTS idx_sync_history_user_store 
ON sync_history(user_id, store_id, created_at DESC);

-- Ajouter un index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_sync_history_status 
ON sync_history(status, created_at DESC);