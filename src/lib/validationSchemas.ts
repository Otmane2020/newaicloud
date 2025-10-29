import { z } from 'zod';

// Authentication schemas
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Adresse email invalide" })
    .max(255, { message: "L'email doit contenir moins de 255 caractères" }),
  password: z.string()
    .min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
    .max(128, { message: "Le mot de passe doit contenir moins de 128 caractères" })
});

export const signupSchema = loginSchema.extend({
  fullName: z.string()
    .trim()
    .min(2, { message: "Le nom complet doit contenir au moins 2 caractères" })
    .max(100, { message: "Le nom complet doit contenir moins de 100 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: "Le nom contient des caractères invalides" })
});

// Shopify connection schemas
export const shopifyConnectionSchema = z.object({
  storeName: z.string()
    .trim()
    .min(3, { message: "Le nom de la boutique doit contenir au moins 3 caractères" })
    .max(100, { message: "Le nom de la boutique doit contenir moins de 100 caractères" })
    .regex(/^[a-z0-9-]+$/, { message: "Le nom de la boutique ne peut contenir que des lettres minuscules, chiffres et tirets" }),
  apiKey: z.string()
    .trim()
    .min(32, { message: "La clé API semble invalide (trop courte)" })
    .max(500, { message: "La clé API est trop longue" }),
  apiSecret: z.string()
    .trim()
    .min(32, { message: "La clé secrète semble invalide (trop courte)" })
    .max(500, { message: "La clé secrète est trop longue" })
});

// Edge function input schemas
export const importProductsSchema = z.object({
  shopName: z.string()
    .trim()
    .min(3, { message: "Shop name must be at least 3 characters" })
    .max(100, { message: "Shop name must be less than 100 characters" })
    .regex(/^[a-z0-9-]+$/, { message: "Shop name can only contain lowercase letters, numbers, and hyphens" }),
  apiKey: z.string()
    .min(32, { message: "API key appears to be invalid" })
    .max(500, { message: "API key is too long" }),
  apiSecret: z.string()
    .min(32, { message: "API secret appears to be invalid" })
    .max(500, { message: "API secret is too long" }),
  storeId: z.string()
    .uuid({ message: "Store ID must be a valid UUID" })
    .optional()
});

export const createCheckoutSchema = z.object({
  plan_id: z.string()
    .trim()
    .min(1, { message: "Plan ID is required" })
    .max(50, { message: "Plan ID is too long" }),
  billing_period: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: "Billing period must be 'monthly' or 'yearly'" })
  }),
  success_url: z.string()
    .url({ message: "Success URL must be a valid URL" })
    .optional(),
  cancel_url: z.string()
    .url({ message: "Cancel URL must be a valid URL" })
    .optional()
});
