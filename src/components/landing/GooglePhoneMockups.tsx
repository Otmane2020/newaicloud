import { useTranslation } from "@/lib/language";

export const GooglePhoneMockups = () => {
  const { language } = useTranslation();

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-muted/20 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            {language === 'fr' ? "Visible partout sur" : "Visible everywhere on"}{" "}
            <span className="text-primary">Google</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {language === 'fr' ? "Recherche, Shopping & Discover" : "Search, Shopping & Discover"}
          </p>
        </div>

        {/* Phone Mockups */}
        <div className="relative flex items-end justify-center gap-2 sm:gap-4 lg:gap-6 max-w-4xl mx-auto">
          {/* Left Phone - Google Search */}
          <div className="relative w-[100px] sm:w-[140px] lg:w-[180px] transform -rotate-6 translate-y-4">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-4 sm:h-6 flex items-center justify-center">
                <div className="w-8 sm:w-12 h-1 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Content */}
              <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 bg-card min-h-[160px] sm:min-h-[220px] lg:min-h-[280px]">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-2 h-2 sm:w-3 sm:h-3 text-warning fill-warning" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                
                {/* Product Card */}
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
                  <div className="w-full h-12 sm:h-16 lg:h-20 bg-gradient-to-br from-rose-200 to-rose-300 rounded-md mb-2 flex items-center justify-center">
                    <div className="w-8 h-10 sm:w-10 sm:h-14 lg:w-12 lg:h-16 bg-rose-400/50 rounded"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 sm:h-2 bg-foreground/20 rounded w-3/4"></div>
                    <div className="h-1.5 sm:h-2 bg-foreground/10 rounded w-1/2"></div>
                  </div>
                </div>
                
                {/* Text Lines */}
                <div className="space-y-1.5">
                  <div className="h-1.5 sm:h-2 bg-foreground/15 rounded w-full"></div>
                  <div className="h-1.5 sm:h-2 bg-foreground/10 rounded w-4/5"></div>
                  <div className="h-1.5 sm:h-2 bg-foreground/10 rounded w-3/5"></div>
                </div>
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] text-center mt-2 text-muted-foreground font-medium">
              {language === 'fr' ? "Résultats enrichis" : "Rich Results"}
            </p>
          </div>

          {/* Center Phone - Google Shopping (Main) */}
          <div className="relative w-[120px] sm:w-[160px] lg:w-[220px] z-10">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-4 sm:h-6 flex items-center justify-center">
                <div className="w-8 sm:w-12 h-1 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Google Header */}
              <div className="bg-card p-2 sm:p-3 border-b border-border">
                <div className="flex items-center gap-2 bg-muted rounded-full px-2 sm:px-3 py-1 sm:py-1.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div className="flex-1 h-1.5 sm:h-2 bg-foreground/10 rounded"></div>
                </div>
              </div>
              
              {/* Content - Shopping Results */}
              <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 bg-card min-h-[180px] sm:min-h-[240px] lg:min-h-[300px]">
                {/* Product with image */}
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
                  <div className="w-full h-14 sm:h-20 lg:h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-md mb-2 flex items-center justify-center">
                    <div className="w-10 h-6 sm:w-14 sm:h-8 lg:w-16 lg:h-10 bg-slate-500/50 rounded transform -rotate-12"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-1.5 sm:h-2 bg-success rounded w-12 sm:w-16"></div>
                      <div className="h-1 sm:h-1.5 bg-foreground/10 rounded w-8 sm:w-12"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-foreground/10"></div>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-foreground/10"></div>
                    </div>
                  </div>
                </div>
                
                {/* Another product */}
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3">
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-200 to-amber-300 rounded-md flex-shrink-0"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 sm:h-2 bg-foreground/20 rounded w-full"></div>
                      <div className="h-1.5 sm:h-2 bg-success rounded w-10 sm:w-14"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] text-center mt-2 text-primary font-semibold">
              Google Shopping
            </p>
          </div>

          {/* Right Phone - Google Discover / Grid */}
          <div className="relative w-[100px] sm:w-[140px] lg:w-[180px] transform rotate-6 translate-y-4">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-4 sm:h-6 flex items-center justify-center">
                <div className="w-8 sm:w-12 h-1 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Header with tabs */}
              <div className="bg-card p-2 sm:p-3 border-b border-border">
                <div className="flex gap-1 sm:gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/20"></div>
                  <div className="flex-1 h-1.5 sm:h-2 bg-foreground/10 rounded self-center"></div>
                </div>
              </div>
              
              {/* Content - Product Grid */}
              <div className="p-2 sm:p-3 bg-card min-h-[160px] sm:min-h-[220px] lg:min-h-[280px]">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {/* Product 1 */}
                  <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg aspect-square flex items-center justify-center">
                    <div className="w-5 h-6 sm:w-7 sm:h-9 lg:w-8 lg:h-10 bg-amber-600/30 rounded"></div>
                  </div>
                  {/* Product 2 */}
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg aspect-square flex items-center justify-center">
                    <div className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-blue-600/30 rounded-full"></div>
                  </div>
                  {/* Product 3 */}
                  <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg aspect-square flex items-center justify-center">
                    <div className="w-4 h-2 sm:w-6 sm:h-3 lg:w-7 lg:h-4 bg-orange-600/30 rounded-full"></div>
                  </div>
                  {/* Product 4 */}
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg aspect-square flex items-center justify-center">
                    <div className="w-4 h-5 sm:w-6 sm:h-7 lg:w-7 lg:h-8 bg-purple-600/30 rounded"></div>
                  </div>
                </div>
                
                {/* Price tags */}
                <div className="mt-2 sm:mt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-1.5 sm:h-2 bg-foreground/15 rounded w-1/3"></div>
                    <div className="h-1.5 sm:h-2 bg-success rounded w-1/4"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-1.5 sm:h-2 bg-foreground/15 rounded w-2/5"></div>
                    <div className="h-1.5 sm:h-2 bg-success rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[8px] sm:text-[10px] text-center mt-2 text-muted-foreground font-medium">
              Discover
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GooglePhoneMockups;
