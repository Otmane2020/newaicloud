import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageReferenceTable } from "@/components/dashboard/UsageReferenceTable";
import {
  BookOpen,
  Rocket,
  ShoppingBag,
  Search,
  FileText,
  MessageSquare,
  Sparkles,
  Link2,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Package,
  RefreshCw,
  Image,
  Tags,
  BarChart3,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="space-y-3">
    {steps.map((step, index) => (
      <li key={step} className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>
        <span className="text-sm leading-6 text-muted-foreground">{step}</span>
      </li>
    ))}
  </ol>
);

const GuideCard = ({
  icon: Icon,
  title,
  description,
  steps,
}: {
  icon: typeof Rocket;
  title: string;
  description: string;
  steps: string[];
}) => (
  <Card className="p-6 md:p-8">
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
    <StepList steps={steps} />
  </Card>
);

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PublicHeader />

      <section className="relative overflow-hidden bg-slate-950 py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,.35),transparent_55%)]" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-6 border-white/10 bg-white/10 text-white hover:bg-white/10">
            <BookOpen className="mr-2 h-4 w-4" /> Documentation
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
            CatalogueOptimize AI Documentation
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Learn how to connect Shopify, audit your catalog, optimize product data, prepare Google Shopping feeds, create content and sync approved changes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")}>
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate("/demo")}>
              View demo
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <Tabs defaultValue="getting-started" className="space-y-8">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-7">
            <TabsTrigger value="getting-started" className="gap-2 py-3">
              <Rocket className="h-4 w-4" /> <span className="hidden sm:inline">Getting started</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2 py-3">
              <Package className="h-4 w-4" /> <span className="hidden sm:inline">Catalog</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2 py-3">
              <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Google Shopping</span>
            </TabsTrigger>
            <TabsTrigger value="seo-content" className="gap-2 py-3">
              <Search className="h-4 w-4" /> <span className="hidden sm:inline">SEO & Content</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-2 py-3">
              <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2 py-3">
              <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-2 py-3">
              <HelpCircle className="h-4 w-4" /> <span className="hidden sm:inline">FAQ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GuideCard
                icon={Store}
                title="1. Connect your Shopify store"
                description="Import your existing catalog and keep Shopify as the source of truth."
                steps={[
                  "Open the Shopify connection flow from the app.",
                  "Authorize CatalogueOptimize AI in Shopify Admin.",
                  "Wait for products, variants, collections, media and articles to import.",
                  "Review the imported catalog before running AI optimizations.",
                ]}
              />
              <GuideCard
                icon={Search}
                title="2. Run the catalog scan"
                description="The scan identifies incomplete or inconsistent product data before you spend AI credits."
                steps={[
                  "Open the Dashboard and launch the catalog health scan.",
                  "Review missing descriptions, attributes, image ALT text, identifiers and channel issues.",
                  "Use the priority list to focus on the products with the biggest impact.",
                  "Open a product to review the recommended actions in detail.",
                ]}
              />
              <GuideCard
                icon={Sparkles}
                title="3. Apply AI recommendations"
                description="Generate improvements one product at a time or in controlled batches."
                steps={[
                  "Choose the products or fields you want to optimize.",
                  "Generate titles, descriptions, categories, tags, landing content or media improvements.",
                  "Review the proposed changes before saving them.",
                  "Use bulk actions only after validating the output on a small sample.",
                ]}
              />
              <GuideCard
                icon={RefreshCw}
                title="4. Sync approved changes"
                description="Publish only the edits you have reviewed and approved."
                steps={[
                  "Check the final values in the product workspace.",
                  "Select the approved records.",
                  "Sync the changes back to Shopify.",
                  "Re-run the catalog scan to confirm that the issues are resolved.",
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GuideCard
                icon={FileText}
                title="Titles and descriptions"
                description="Improve weak supplier copy while keeping each product specific and commercially useful."
                steps={[
                  "Open Catalog → Products or Content → Titles & Descriptions.",
                  "Select one or more products.",
                  "Generate an improved title, description or both.",
                  "Review tone, specifications and claims before saving.",
                  "Sync approved copy to Shopify.",
                ]}
              />
              <GuideCard
                icon={Image}
                title="Product images and ALT text"
                description="Improve product galleries for merchandising, accessibility and search visibility."
                steps={[
                  "Open the Media workspace or a product gallery.",
                  "Use Vision AI to analyze the source image.",
                  "Generate descriptive ALT text or create a white/lifestyle background when appropriate.",
                  "Review the image and text output before replacing or adding media.",
                ]}
              />
              <GuideCard
                icon={Tags}
                title="Categories, tags and attributes"
                description="Standardize the structured data used by storefront filters and external channels."
                steps={[
                  "Select products with missing or inconsistent categorization.",
                  "Generate Google categories, product tags or enrichment suggestions.",
                  "Review identifiers, materials, colors, sizes and other attributes.",
                  "Apply the approved values in bulk and sync them to Shopify.",
                ]}
              />
              <GuideCard
                icon={Search}
                title="Smart product search"
                description="Find products that need work using catalog and visual attributes."
                steps={[
                  "Open Product Search.",
                  "Search by product name, category, color, material or style.",
                  "Filter by availability, price, SEO status or catalog issues.",
                  "Open matching products and launch the relevant optimization workflow.",
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="shopping" className="space-y-6">
            <Card className="border-blue-200 bg-blue-50/50 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <ShoppingBag className="mt-1 h-7 w-7 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-bold">Google Shopping workflow</h2>
                  <p className="mt-2 text-muted-foreground">
                    Prepare clean source data first, then generate a feed that can be used with Google Merchant Center.
                  </p>
                </div>
              </div>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <GuideCard
                icon={Store}
                title="Configure store settings"
                description="Set the commercial defaults used when preparing the Shopping feed."
                steps={[
                  "Open Google Shopping → Settings.",
                  "Enter the store name, currency and target country.",
                  "Set the default brand and product condition when required.",
                  "Save the settings before generating channel data.",
                ]}
              />
              <GuideCard
                icon={Package}
                title="Optimize Shopping product data"
                description="Resolve identifiers and categorization issues before creating the feed."
                steps={[
                  "Open the Products tab in Google Shopping.",
                  "Review missing GTIN, EAN, MPN, brand and category fields.",
                  "Generate AI category suggestions and complete valid identifiers where available.",
                  "Review every generated value before publishing.",
                ]}
              />
              <GuideCard
                icon={FileText}
                title="Generate and test the XML feed"
                description="Create the feed only after the catalog data has been reviewed."
                steps={[
                  "Open the XML Feed section.",
                  "Generate the current feed from your catalog.",
                  "Copy the feed URL shown by the app.",
                  "Run the built-in feed test and resolve any blocking issues.",
                  "Add the validated feed URL to Google Merchant Center.",
                ]}
              />
              <GuideCard
                icon={RefreshCw}
                title="Keep the feed synchronized"
                description="Use scheduled synchronization when your catalog changes frequently."
                steps={[
                  "Open the Synchronization section.",
                  "Enable automatic synchronization if your plan supports it.",
                  "Choose the appropriate update frequency.",
                  "Use Sync now when an immediate refresh is required.",
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="seo-content" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GuideCard
                icon={Search}
                title="SEO optimization"
                description="Improve products, collections, pages and homepage metadata from one workflow."
                steps={[
                  "Open the SEO workspace and choose Products, Collections, Pages or Homepage.",
                  "Import the latest Shopify content when needed.",
                  "Generate optimized titles, meta descriptions and supporting copy.",
                  "Run the SEO audit to identify remaining technical or content gaps.",
                  "Sync approved changes back to Shopify.",
                ]}
              />
              <GuideCard
                icon={Image}
                title="Image SEO"
                description="Use Vision AI to improve image accessibility and discoverability."
                steps={[
                  "Open a product, collection or homepage image.",
                  "Analyze the visual with Vision AI.",
                  "Generate descriptive ALT text that matches the actual image.",
                  "Review the text and apply it individually or in a controlled batch.",
                ]}
              />
              <GuideCard
                icon={FileText}
                title="AI blog articles"
                description="Create product-linked content without repetitive catalog copy."
                steps={[
                  "Open Blog AI → Articles.",
                  "Choose a topic and the products you want to feature.",
                  "Generate the article with SEO structure and product links.",
                  "Edit the draft and verify every factual product claim.",
                  "Publish the approved article to Shopify.",
                ]}
              />
              <GuideCard
                icon={RefreshCw}
                title="Automated content campaigns"
                description="Plan recurring article creation for stores that need an ongoing content cadence."
                steps={[
                  "Open Blog AI → Campaigns.",
                  "Create a campaign and choose its publication frequency.",
                  "Define the content scope and product selection rules.",
                  "Enable automatic publishing only after testing the workflow with manual review.",
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GuideCard
                icon={MessageSquare}
                title="Configure the AI sales assistant"
                description="Control the assistant's tone, response style and product recommendation behavior."
                steps={[
                  "Open Chat → Settings.",
                  "Choose the assistant style and response tone.",
                  "Add store-specific instructions and support rules.",
                  "Test the assistant against real catalog questions before publishing it.",
                ]}
              />
              <GuideCard
                icon={Link2}
                title="Install the storefront widget"
                description="Embed the assistant on your storefront after the catalog connection is ready."
                steps={[
                  "Enable the embeddable widget in Chat settings.",
                  "Choose the widget position, primary color and welcome message.",
                  "Copy the integration snippet or use the Shopify installation flow provided by the app.",
                  "Test product recommendations and checkout handoff on desktop and mobile.",
                ]}
              />
              <GuideCard
                icon={Package}
                title="Product recommendations"
                description="The assistant can use live catalog data to suggest relevant products and variants."
                steps={[
                  "Ask a product question in Chat → Robot.",
                  "Confirm that recommendations match the shopper's stated requirements.",
                  "Verify price, availability and variant details against Shopify.",
                  "Use conversation history to identify recurring customer questions.",
                ]}
              />
              <GuideCard
                icon={BarChart3}
                title="Learning and history"
                description="Use conversation and order context to improve the quality of future assistance."
                steps={[
                  "Review conversation history regularly.",
                  "Identify unanswered questions or weak recommendations.",
                  "Update assistant instructions or product data where the catalog is incomplete.",
                  "Re-test the affected scenarios after each change.",
                ]}
              />
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-8">
            <UsageReferenceTable />
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            {[
              ["Does CatalogueOptimize AI change my Shopify products automatically?", "No. The standard workflow lets you review AI recommendations before syncing approved changes. Automated workflows should be enabled only when you explicitly want them."],
              ["Can I use the app without changing my live catalog?", "Yes. You can connect Shopify, import the catalog and run scans before publishing any modification."],
              ["What should I check before sending a feed to Google Merchant Center?", "Review titles, descriptions, availability, price, brand, identifiers and Google product categories. Then run the feed validation and resolve blocking errors."],
              ["Can AI generate GTINs for any product?", "GTINs are regulated product identifiers. Only use a valid identifier assigned to the product by the manufacturer or an authorized standards body. Do not publish invented GTINs."],
              ["How do I get support?", "Use the Support link in the footer or contact the support address configured for your CatalogueOptimize AI account."],
            ].map(([question, answer]) => (
              <Card key={question} className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-semibold">{question}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </section>

      <section className="border-t bg-card/50 py-14">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold">Ready to optimize your catalog?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Connect Shopify, scan your catalog and review the first recommendations before publishing any change.
          </p>
          <Button className="mt-6" onClick={() => navigate("/auth?mode=signup")}>
            Start free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Documentation;
