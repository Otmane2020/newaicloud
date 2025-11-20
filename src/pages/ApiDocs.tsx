import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Book, Zap, Shield } from "lucide-react";

export default function ApiDocs() {
  const API_BASE_URL = "https://nekqqlhrjgmyudmmewas.supabase.co/functions/v1/api-v1";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentation API</h1>
        <p className="text-muted-foreground">Guide complet d'utilisation de l'API NewAI.sale</p>
      </div>

      <Tabs defaultValue="intro" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="intro">Introduction</TabsTrigger>
          <TabsTrigger value="auth">Authentification</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="examples">Exemples</TabsTrigger>
        </TabsList>

        <TabsContent value="intro" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                <CardTitle>Bienvenue</CardTitle>
              </div>
              <CardDescription>
                L'API NewAI.sale vous permet d'automatiser toutes les fonctionnalités de la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">🚀 Fonctionnalités principales</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Optimisation SEO automatique de produits</li>
                  <li>Génération d'articles de blog IA</li>
                  <li>Création et gestion de produits Shopify</li>
                  <li>Traitement d'images (background removal, génération)</li>
                  <li>Analytics et statistiques en temps réel</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">⚡ Rate Limits</h3>
                <p className="text-sm text-muted-foreground">
                  Plan Enterprise : <Badge>100 requêtes/minute</Badge> par clé API
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🔒 Sécurité</h3>
                <p className="text-sm text-muted-foreground">
                  Toutes les requêtes doivent être faites en HTTPS. Les secrets API ne sont jamais exposés.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Authentification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">1. Obtenir une clé API</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Rendez-vous dans la section "Accès API" pour générer votre clé.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Utiliser la clé</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Ajoutez le header <code className="bg-muted px-2 py-1 rounded">X-API-Key</code> à chaque requête :
                </p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X POST ${API_BASE_URL}/seo/optimize-product \\
  -H "X-API-Key: newai_live_ak_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"product_id": "xxx", "store_id": "yyy"}'`}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Gestion des erreurs</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">401</Badge>
                    <span className="text-muted-foreground">Clé API manquante ou invalide</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">403</Badge>
                    <span className="text-muted-foreground">Endpoint non autorisé pour cette clé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">429</Badge>
                    <span className="text-muted-foreground">Rate limit dépassé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">500</Badge>
                    <span className="text-muted-foreground">Erreur serveur</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <CardTitle>POST /seo/optimize-product</CardTitle>
              </div>
              <CardDescription>Optimise le SEO d'un produit avec l'IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "product_id": "uuid-of-product",
  "store_id": "uuid-of-store",
  "optimize_title": true,
  "optimize_description": true,
  "language": "fr"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "product_id": "uuid",
  "optimized_title": "Nouveau titre SEO optimisé",
  "original_title": "Ancien titre",
  "seo_score": 87
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <CardTitle>POST /content/generate-article</CardTitle>
              </div>
              <CardDescription>Génère un article de blog avec l'IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "title": "Comment augmenter ses ventes en ligne",
  "keywords": ["e-commerce", "ventes", "conversion"],
  "store_id": "uuid-of-store",
  "language": "fr"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "article_id": "uuid",
  "title": "Comment augmenter ses ventes en ligne",
  "status": "draft"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <CardTitle>POST /products/create</CardTitle>
              </div>
              <CardDescription>Crée un nouveau produit automatiquement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "title": "Nouveau produit",
  "description": "Description du produit",
  "price": "29.99",
  "vendor": "Ma Marque",
  "product_type": "Accessoires",
  "store_id": "uuid-of-store"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "product_id": "uuid",
  "title": "Nouveau produit",
  "shopify_id": null
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <CardTitle>GET /products/list</CardTitle>
              </div>
              <CardDescription>Liste les produits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><code>limit</code> (optional): Nombre de produits (défaut: 10)</li>
                  <li><code>store_id</code> (optional): Filtrer par boutique</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Exemple</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`GET ${API_BASE_URL}/products/list?limit=5&store_id=xxx`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "count": 5,
  "products": [
    {
      "id": "uuid",
      "title": "Produit 1",
      "product_type": "Accessoires",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                <CardTitle>JavaScript / TypeScript</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`const API_KEY = "newai_live_ak_xxxxx";
const BASE_URL = "${API_BASE_URL}";

async function optimizeProduct(productId, storeId) {
  const response = await fetch(\`\${BASE_URL}/seo/optimize-product\`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      store_id: storeId,
      language: "fr",
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error);
  }
  
  return data;
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                <CardTitle>Python</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import requests

API_KEY = "newai_live_ak_xxxxx"
BASE_URL = "${API_BASE_URL}"

def optimize_product(product_id, store_id):
    response = requests.post(
        f"{BASE_URL}/seo/optimize-product",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "product_id": product_id,
            "store_id": store_id,
            "language": "fr"
        }
    )
    
    response.raise_for_status()
    return response.json()`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                <CardTitle>PHP</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<?php

$apiKey = "newai_live_ak_xxxxx";
$baseUrl = "${API_BASE_URL}";

function optimizeProduct($productId, $storeId) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init("$baseUrl/seo/optimize-product");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-API-Key: $apiKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        "product_id" => $productId,
        "store_id" => $storeId,
        "language" => "fr"
    ]));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

?>`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
