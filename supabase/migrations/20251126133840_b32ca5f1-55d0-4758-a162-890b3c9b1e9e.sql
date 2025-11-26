-- Nettoyer les emails spam/boucle
DELETE FROM admin_emails 
WHERE subject LIKE '%[Copie]%' 
   OR subject LIKE '%[NewAI Copie]%'
   OR from_email LIKE '%notifications@newai.sale%';