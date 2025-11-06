import { PublicHeader } from "@/components/PublicHeader";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";
import { useTranslation } from "@/lib/language";

export default function Privacy() {
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
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4">{t.privacy.title}</h1>
              <p className="text-muted-foreground">{t.privacy.lastUpdated}: 27 octobre 2025</p>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.privacy.dataCollection}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.privacy.dataCollectionDesc}
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
                    <h2 className="text-2xl font-semibold mb-3">{t.privacy.dataUsage}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {t.privacy.dataUsageIntro}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.dataUsage1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.dataUsage2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.dataUsage3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.dataUsage4}</span>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.privacy.dataProtection}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.privacy.dataProtectionDesc}
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
                    <h2 className="text-2xl font-semibold mb-3">{t.privacy.yourRights}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {t.privacy.yourRightsIntro}
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.right1}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.right2}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.right3}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.right4}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{t.privacy.right5}</span>
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
                    <h2 className="text-2xl font-semibold mb-3">{t.privacy.contact}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {t.privacy.contactDesc} <a href="mailto:privacy@newai.com" className="text-primary hover:underline">privacy@newai.com</a>
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer note */}
              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  {t.privacy.disclaimer}
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
