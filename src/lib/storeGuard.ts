/**
 * FONCTION GARDE DE SÉCURITÉ MULTI-STORE
 * 
 * Cette fonction garantit qu'aucune donnée d'une autre boutique ne peut s'afficher.
 * Si une anomalie est détectée, elle log l'erreur et filtre les données incorrectes.
 */

import { toast } from "sonner";

interface StoreGuardResult<T> {
  validData: T[];
  invalidData: T[];
  hasViolations: boolean;
  violationDetails: string[];
}

/**
 * Valide que toutes les données appartiennent bien au store sélectionné
 */
export function validateStoreData<T extends { store_id?: string | null }>(
  data: T[],
  selectedStoreId: string,
  resourceType: 'product' | 'article' | 'page' | 'collection' | 'image'
): StoreGuardResult<T> {
  const validData: T[] = [];
  const invalidData: T[] = [];
  const violationDetails: string[] = [];

  data.forEach((item, index) => {
    // Vérifier si l'item a un store_id
    if (!item.store_id) {
      violationDetails.push(
        `⚠️ [STORE_GUARD] ${resourceType} #${index} has no store_id`
      );
      invalidData.push(item);
      return;
    }

    // Vérifier si le store_id correspond
    if (item.store_id !== selectedStoreId) {
      violationDetails.push(
        `🚨 [STORE_GUARD] CRITICAL: ${resourceType} #${index} belongs to store ${item.store_id} but selected store is ${selectedStoreId}`
      );
      invalidData.push(item);
      return;
    }

    // Item valide
    validData.push(item);
  });

  // Logger les violations
  if (invalidData.length > 0) {
    console.error('🚨 [STORE_GUARD] SECURITY VIOLATION DETECTED!');
    console.error(`📊 Found ${invalidData.length} items from wrong store`);
    console.error(`✅ Valid items: ${validData.length}`);
    console.error(`❌ Invalid items: ${invalidData.length}`);
    violationDetails.forEach(detail => console.error(detail));
  }

  return {
    validData,
    invalidData,
    hasViolations: invalidData.length > 0,
    violationDetails
  };
}

/**
 * Valide et filtre les données après une query Supabase
 * Utiliser après avoir récupéré les données de Supabase
 */
export function guardStoreData<T extends { store_id?: string | null }>(
  data: T[] | null,
  selectedStoreId: string | null | undefined,
  resourceType: 'product' | 'article' | 'page' | 'collection' | 'image'
): T[] {
  // Si pas de store sélectionné, retourner tableau vide
  if (!selectedStoreId) {
    console.log(`⚠️ [STORE_GUARD] No store selected, returning empty array for ${resourceType}`);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`ℹ️ [STORE_GUARD] No ${resourceType} data found for store ${selectedStoreId}`);
    return [];
  }

  // VALIDATION CRITIQUE : Vérifier que toutes les données appartiennent au bon store
  const guardResult = validateStoreData(data, selectedStoreId, resourceType);

  // Si des violations sont détectées, les afficher dans la console
  if (guardResult.hasViolations) {
    console.error('🚨🚨🚨 [STORE_GUARD] SECURITY BREACH DETECTED 🚨🚨🚨');
    console.error(`Resource type: ${resourceType}`);
    console.error(`Selected store: ${selectedStoreId}`);
    console.error(`Total items fetched: ${data.length}`);
    console.error(`Valid items: ${guardResult.validData.length}`);
    console.error(`Invalid items: ${guardResult.invalidData.length}`);
    
    // Afficher un toast d'erreur critique
    toast.error('Erreur de sécurité détectée', {
      description: `${guardResult.invalidData.length} élément(s) de boutique incorrecte détecté(s). Contactez le support.`
    });
  }

  // RETOURNER UNIQUEMENT LES DONNÉES VALIDES
  console.log(`✅ [STORE_GUARD] Returning ${guardResult.validData.length} valid ${resourceType}(s) for store ${selectedStoreId}`);
  return guardResult.validData;
}

/**
 * Fonction pour vérifier la cohérence du state après un setState
 */
export function verifyStateCoherence<T extends { store_id?: string | null }>(
  stateData: T[],
  selectedStoreId: string | null,
  componentName: string,
  resourceType: string
): void {
  if (!selectedStoreId || stateData.length === 0) return;

  const guardResult = validateStoreData(stateData, selectedStoreId, resourceType as any);
  
  if (guardResult.hasViolations) {
    console.error(`🚨 [STORE_GUARD] ${componentName} has state incoherence!`);
    console.error(`Component: ${componentName}`);
    console.error(`Resource: ${resourceType}`);
    console.error(`Selected store: ${selectedStoreId}`);
    console.error(`Items in state: ${stateData.length}`);
    console.error(`Valid items: ${guardResult.validData.length}`);
    console.error(`Invalid items: ${guardResult.invalidData.length}`);
    guardResult.violationDetails.forEach(detail => console.error(detail));
  }
}
