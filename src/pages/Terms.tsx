import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { FileText, CheckCircle, AlertCircle, Scale, CreditCard, Ban } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function Terms() {
  const { t } = useTranslation();
  
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
              <h1 className="text-4xl font-bold mb-4">{t.terms.title}</h1>
              <p className="text-muted-foreground">{t.terms.lastUpdated}: 27 octobre 2025</p>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.acceptance}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.terms.acceptanceDesc}
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.services}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {t.terms.servicesDesc}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.service1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.service2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.service3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.service4}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.service5}</span>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.pricing}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {t.terms.pricingDesc}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.pricing1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.pricing2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.pricing3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.pricing4}</span>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.prohibited}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {t.terms.prohibitedDesc}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.prohibited1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.prohibited2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.prohibited3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.prohibited4}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.terms.prohibited5}</span>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.limitation}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.terms.limitationDesc}
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.intellectual}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.terms.intellectualDesc}
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
                    <h2 className="text-2xl font-semibold mb-3">{t.terms.termination}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.terms.terminationDesc}
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer note */}
              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  {t.terms.disclaimer} <a href="mailto:legal@newai.com" className="text-primary hover:underline">legal@newai.com</a>
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
