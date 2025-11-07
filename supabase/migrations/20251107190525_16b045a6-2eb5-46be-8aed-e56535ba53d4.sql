-- Fonction pour décrémenter shopify_stores_count lors de la suppression d'une connexion
CREATE OR REPLACE FUNCTION public.decrement_shopify_stores_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Décrémenter shopify_stores_count pour le mois actuel et tous les mois futurs
  UPDATE public.usage_tracking
  SET 
    shopify_stores_count = GREATEST(0, shopify_stores_count - 1),
    updated_at = now()
  WHERE seller_id = OLD.user_id
    AND month >= DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur shopify_connections
DROP TRIGGER IF EXISTS trigger_decrement_shopify_stores_on_delete ON public.shopify_connections;
CREATE TRIGGER trigger_decrement_shopify_stores_on_delete
  AFTER DELETE ON public.shopify_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_shopify_stores_count();

-- Fonction pour décrémenter products_count lors de la suppression d'un produit
CREATE OR REPLACE FUNCTION public.decrement_products_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Décrémenter products_count pour le mois actuel et tous les mois futurs
  UPDATE public.usage_tracking
  SET 
    products_count = GREATEST(0, products_count - 1),
    updated_at = now()
  WHERE seller_id = OLD.seller_id
    AND month >= DATE_TRUNC('month', CURRENT_DATE);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur shopify_products
DROP TRIGGER IF EXISTS trigger_decrement_products_on_delete ON public.shopify_products;
CREATE TRIGGER trigger_decrement_products_on_delete
  AFTER DELETE ON public.shopify_products
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_products_count();