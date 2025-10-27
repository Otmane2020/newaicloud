import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-1 bg-gradient-subtle">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-6 shadow-glow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Politique de Confidentialité</h1>
              <p className="text-muted-foreground">Dernière mise à jour : 27 octobre 2025</p>
            </div>

            {/* Content */}
            <div className="bg-card rounded-2xl shadow-elegant p-8 space-y-8">
              {/* Section 1 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Collecte des Données</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Nous collectons les informations que vous nous fournissez directement lors de la création de votre compte, 
                      y compris votre nom, adresse e-mail et les informations relatives à votre boutique Shopify. Nous collectons 
                      également automatiquement certaines informations sur votre utilisation de nos services.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Utilisation des Données</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Vos données sont utilisées pour :
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Fournir et améliorer nos services d'optimisation SEO</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Générer du contenu optimisé pour vos produits</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Communiquer avec vous concernant votre compte</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Assurer la sécurité et prévenir la fraude</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Protection des Données</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger 
                      vos données personnelles contre tout accès non autorisé, modification, divulgation ou destruction. 
                      Vos données sont stockées sur des serveurs sécurisés et chiffrées en transit.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Vos Droits</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Conformément au RGPD, vous disposez des droits suivants :
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Droit d'accès à vos données personnelles</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Droit de rectification de données inexactes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Droit à l'effacement de vos données</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Droit à la portabilité de vos données</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>Droit d'opposition au traitement</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-3">Contact</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
                      vous pouvez nous contacter à l'adresse : <a href="mailto:privacy@newai.com" className="text-primary hover:underline">privacy@newai.com</a>
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer note */}
              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Nous nous réservons le droit de modifier cette politique à tout moment. 
                  Toute modification sera publiée sur cette page avec une date de mise à jour révisée.
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
