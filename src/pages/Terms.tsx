import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { FileText, CheckCircle, AlertCircle, Scale, CreditCard, Ban } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 bg-gradient-subtle">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-6 shadow-glow">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Conditions Générales d'Utilisation</h1>
              <p className="text-muted-foreground">Dernière mise à jour : 27 octobre 2025</p>
            </div>

            {/* Content */}
            <div className="bg-card rounded-2xl shadow-elegant p-8 space-y-8">
              {/* Section 1 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Acceptation des Conditions</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      En accédant et en utilisant NewAI, vous acceptez d'être lié par ces conditions générales d'utilisation. 
                      Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services. Votre utilisation continue 
                      de la plateforme constitue votre acceptation de toute modification de ces conditions.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Services Fournis</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      NewAI fournit une plateforme d'optimisation SEO alimentée par l'intelligence artificielle pour les boutiques Shopify, incluant :
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Génération automatique de descriptions de produits optimisées</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Optimisation des balises meta et alt texts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Création d'articles de blog SEO-friendly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Intégration Google Merchant Center</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Assistant IA pour l'optimisation e-commerce</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Tarification et Paiement</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Nous proposons plusieurs plans d'abonnement avec différentes fonctionnalités et limites d'utilisation :
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Les frais d'abonnement sont facturés mensuellement ou annuellement</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Les paiements sont traités via Stripe de manière sécurisée</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Les tarifs peuvent être modifiés avec un préavis de 30 jours</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Aucun remboursement pour les mois partiellement utilisés</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Ban className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Utilisation Interdite</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Vous vous engagez à ne pas :
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Utiliser le service pour des activités illégales ou frauduleuses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Tenter d'accéder aux systèmes de manière non autorisée</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Partager votre compte avec des tiers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Contourner les limitations d'utilisation de votre plan</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Reproduire, dupliquer ou copier notre technologie</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Limitation de Responsabilité</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      NewAI est fourni "en l'état" sans garantie d'aucune sorte. Nous ne garantissons pas que le service sera 
                      ininterrompu ou exempt d'erreurs. En aucun cas, nous ne serons responsables des dommages indirects, 
                      consécutifs ou spéciaux résultant de l'utilisation ou de l'impossibilité d'utiliser nos services.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Propriété Intellectuelle</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Tout le contenu généré par NewAI vous appartient. Cependant, nous conservons tous les droits sur notre 
                      plateforme, algorithmes, et technologie. Vous nous accordez une licence pour utiliser votre contenu 
                      uniquement dans le but de fournir nos services.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 7 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Résiliation</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Vous pouvez résilier votre compte à tout moment depuis vos paramètres. Nous nous réservons le droit de 
                      suspendre ou résilier votre compte en cas de violation de ces conditions. En cas de résiliation, 
                      vous perdrez l'accès à vos données après 30 jours.
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer note */}
              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Ces conditions sont régies par les lois françaises. Pour toute question : <a href="mailto:legal@newai.com" className="text-primary hover:underline">legal@newai.com</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
