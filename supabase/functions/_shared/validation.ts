// Shared validation utilities for edge functions
// Note: Cannot import from src/ as edge functions run in Deno

interface ValidationError {
  path: string[];
  message: string;
}

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// Simple validation for import-products
export function validateImportProducts(data: any): ValidationResult<{
  shopName: string;
  apiToken: string;
  storeId?: string;
}> {
  const errors: ValidationError[] = [];

  if (!data.shopName || typeof data.shopName !== 'string') {
    errors.push({ path: ['shopName'], message: 'Shop name is required' });
  } else {
    const trimmed = data.shopName.trim();
    if (trimmed.length < 3) {
      errors.push({ path: ['shopName'], message: 'Shop name must be at least 3 characters' });
    } else if (trimmed.length > 100) {
      errors.push({ path: ['shopName'], message: 'Shop name must be less than 100 characters' });
    } else if (!/^[a-z0-9-]+$/.test(trimmed)) {
      errors.push({ path: ['shopName'], message: 'Shop name can only contain lowercase letters, numbers, and hyphens' });
    }
  }

  if (!data.apiToken || typeof data.apiToken !== 'string') {
    errors.push({ path: ['apiToken'], message: 'API token is required' });
  } else {
    const trimmed = data.apiToken.trim();
    if (trimmed.length < 32) {
      errors.push({ path: ['apiToken'], message: 'API token appears to be invalid' });
    } else if (trimmed.length > 500) {
      errors.push({ path: ['apiToken'], message: 'API token is too long' });
    }
  }

  if (data.storeId !== undefined && data.storeId !== null) {
    if (typeof data.storeId !== 'string') {
      errors.push({ path: ['storeId'], message: 'Store ID must be a string' });
    } else {
      // Simple UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.storeId)) {
        errors.push({ path: ['storeId'], message: 'Store ID must be a valid UUID' });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      shopName: data.shopName.trim(),
      apiToken: data.apiToken.trim(),
      storeId: data.storeId
    }
  };
}

// Simple validation for create-checkout
export function validateCreateCheckout(data: any): ValidationResult<{
  plan_id: string;
  billing_period: 'monthly' | 'yearly';
  success_url?: string;
  cancel_url?: string;
  force_immediate_payment?: boolean;
}> {
  const errors: ValidationError[] = [];

  if (!data.plan_id || typeof data.plan_id !== 'string') {
    errors.push({ path: ['plan_id'], message: 'Plan ID is required' });
  } else {
    const trimmed = data.plan_id.trim();
    if (trimmed.length < 1) {
      errors.push({ path: ['plan_id'], message: 'Plan ID is required' });
    } else if (trimmed.length > 50) {
      errors.push({ path: ['plan_id'], message: 'Plan ID is too long' });
    }
  }

  if (!data.billing_period || typeof data.billing_period !== 'string') {
    errors.push({ path: ['billing_period'], message: 'Billing period is required' });
  } else if (!['monthly', 'yearly'].includes(data.billing_period)) {
    errors.push({ path: ['billing_period'], message: "Billing period must be 'monthly' or 'yearly'" });
  }

  if (data.success_url !== undefined && data.success_url !== null) {
    if (typeof data.success_url !== 'string') {
      errors.push({ path: ['success_url'], message: 'Success URL must be a string' });
    } else {
      try {
        new URL(data.success_url);
      } catch {
        errors.push({ path: ['success_url'], message: 'Success URL must be a valid URL' });
      }
    }
  }

  if (data.cancel_url !== undefined && data.cancel_url !== null) {
    if (typeof data.cancel_url !== 'string') {
      errors.push({ path: ['cancel_url'], message: 'Cancel URL must be a string' });
    } else {
      try {
        new URL(data.cancel_url);
      } catch {
        errors.push({ path: ['cancel_url'], message: 'Cancel URL must be a valid URL' });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      plan_id: data.plan_id.trim(),
      billing_period: data.billing_period as 'monthly' | 'yearly',
      success_url: data.success_url,
      cancel_url: data.cancel_url,
      force_immediate_payment: data.force_immediate_payment || false
    }
  };
}
