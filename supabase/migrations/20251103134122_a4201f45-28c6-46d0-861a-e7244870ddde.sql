-- Supprimer les doublons dans seo_audit_reports en ne gardant que la ligne la plus récente par user_id
DELETE FROM seo_audit_reports
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM seo_audit_reports
  ORDER BY user_id, created_at DESC
);

-- Supprimer la contrainte existante si elle existe
ALTER TABLE seo_audit_reports 
DROP CONSTRAINT IF EXISTS seo_audit_reports_user_id_unique;

-- Ajouter la contrainte unique sur user_id
ALTER TABLE seo_audit_reports 
ADD CONSTRAINT seo_audit_reports_user_id_unique 
UNIQUE (user_id);