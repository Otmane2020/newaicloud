import { useTranslation } from "@/lib/language";

export const GooglePhoneMockups = () => {
  const { language } = useTranslation();

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/20 to-background overflow-hidden">
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

        {/* Phone Mockups - Desktop optimized */}
        <div className="relative flex items-end justify-center gap-4 sm:gap-6 lg:gap-10 max-w-5xl mx-auto">
          
          {/* Left Phone - Google Search Results */}
          <div className="relative w-[140px] sm:w-[180px] lg:w-[240px] transform -rotate-6 translate-y-4">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-5 sm:h-6 lg:h-7 flex items-center justify-center">
                <div className="w-10 sm:w-14 lg:w-16 h-1.5 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Google Search Bar */}
              <div className="bg-card p-2 sm:p-3 lg:p-4 border-b border-border">
                <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 sm:py-2">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground truncate">canapé velours vert</span>
                </div>
              </div>
              
              {/* Search Result with Product */}
              <div className="p-2 sm:p-3 lg:p-4 space-y-3 sm:space-y-4 bg-card min-h-[200px] sm:min-h-[280px] lg:min-h-[340px]">
                {/* Product Result Card */}
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3 lg:p-4">
                  <img 
                    src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop" 
                    alt="Canapé velours vert"
                    className="w-full h-16 sm:h-24 lg:h-32 object-cover rounded-md mb-2"
                  />
                  <div className="space-y-1">
                    <p className="text-[9px] sm:text-[11px] lg:text-sm font-medium text-primary line-clamp-1">Canapé Velours Vert Émeraude</p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <svg key={i} className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 text-warning fill-warning" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      ))}
                      <span className="text-[8px] sm:text-[9px] lg:text-[11px] text-muted-foreground">(127)</span>
                    </div>
                    <p className="text-[10px] sm:text-xs lg:text-sm font-semibold text-success">€899,00</p>
                  </div>
                </div>
                
                {/* Second Result Preview */}
                <div className="flex gap-2 items-center bg-muted/20 rounded-lg p-2">
                  <img 
                    src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=100&h=100&fit=crop" 
                    alt="Fauteuil"
                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] sm:text-[10px] lg:text-xs font-medium text-primary truncate">Fauteuil Scandinave</p>
                    <p className="text-[9px] sm:text-[11px] lg:text-sm font-semibold text-success">€349,00</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[9px] sm:text-[11px] lg:text-sm text-center mt-3 text-muted-foreground font-medium">
              {language === 'fr' ? "Résultats enrichis" : "Rich Results"}
            </p>
          </div>

          {/* Center Phone - Google Shopping (Main) */}
          <div className="relative w-[160px] sm:w-[200px] lg:w-[280px] z-10">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-5 sm:h-6 lg:h-7 flex items-center justify-center">
                <div className="w-10 sm:w-14 lg:w-16 h-1.5 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Google Shopping Header */}
              <div className="bg-card p-2 sm:p-3 lg:p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2 py-1">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-[9px] sm:text-[11px] lg:text-sm font-medium">Shopping</span>
                  </div>
                </div>
              </div>
              
              {/* Shopping Products Grid */}
              <div className="p-2 sm:p-3 lg:p-4 bg-card min-h-[220px] sm:min-h-[300px] lg:min-h-[380px]">
                {/* Main Product */}
                <div className="bg-muted/30 rounded-lg p-2 sm:p-3 lg:p-4 mb-3">
                  <img 
                    src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop" 
                    alt="Sneakers Nike"
                    className="w-full h-20 sm:h-28 lg:h-36 object-cover rounded-md mb-2"
                  />
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-[9px] sm:text-[11px] lg:text-sm font-medium line-clamp-1">Nike Air Max 90</p>
                      <p className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground">Nike Store</p>
                      <p className="text-[11px] sm:text-sm lg:text-base font-bold text-success">€149,99</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4].map(i => (
                          <svg key={i} className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 text-warning fill-warning" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                        <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 text-muted-foreground fill-muted-foreground" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      </div>
                      <span className="text-[7px] sm:text-[9px] lg:text-[11px] text-muted-foreground">2.3k avis</span>
                    </div>
                  </div>
                </div>
                
                {/* Grid of smaller products */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/20 rounded-lg p-1.5 sm:p-2">
                    <img 
                      src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop" 
                      alt="Sneakers"
                      className="w-full h-12 sm:h-16 lg:h-20 object-cover rounded mb-1"
                    />
                    <p className="text-[8px] sm:text-[10px] lg:text-xs font-semibold text-success">€89,00</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-1.5 sm:p-2">
                    <img 
                      src="https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&h=200&fit=crop" 
                      alt="Sneakers"
                      className="w-full h-12 sm:h-16 lg:h-20 object-cover rounded mb-1"
                    />
                    <p className="text-[8px] sm:text-[10px] lg:text-xs font-semibold text-success">€129,00</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[9px] sm:text-[11px] lg:text-sm text-center mt-3 text-primary font-semibold">
              Google Shopping
            </p>
          </div>

          {/* Right Phone - Google Discover */}
          <div className="relative w-[140px] sm:w-[180px] lg:w-[240px] transform rotate-6 translate-y-4">
            <div className="bg-card rounded-2xl sm:rounded-3xl border-4 sm:border-[6px] border-foreground/10 shadow-2xl overflow-hidden">
              {/* Status Bar */}
              <div className="bg-muted/50 h-5 sm:h-6 lg:h-7 flex items-center justify-center">
                <div className="w-10 sm:w-14 lg:w-16 h-1.5 bg-foreground/20 rounded-full"></div>
              </div>
              
              {/* Discover Header */}
              <div className="bg-card p-2 sm:p-3 lg:p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-[8px] sm:text-[10px] lg:text-xs text-white font-bold">D</span>
                  </div>
                  <span className="text-[9px] sm:text-[11px] lg:text-sm font-medium">Discover</span>
                </div>
              </div>
              
              {/* Discover Content */}
              <div className="p-2 sm:p-3 lg:p-4 bg-card min-h-[200px] sm:min-h-[280px] lg:min-h-[340px] space-y-3">
                {/* Featured Product Card */}
                <div className="rounded-lg overflow-hidden shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=250&fit=crop" 
                    alt="Montre luxe"
                    className="w-full h-20 sm:h-28 lg:h-36 object-cover"
                  />
                  <div className="bg-muted/30 p-2 sm:p-3">
                    <p className="text-[9px] sm:text-[11px] lg:text-sm font-medium line-clamp-2">
                      {language === 'fr' ? "Les montres de luxe tendance 2024" : "Trending luxury watches 2024"}
                    </p>
                    <p className="text-[8px] sm:text-[10px] lg:text-xs text-muted-foreground mt-1">Fashion Magazine</p>
                  </div>
                </div>
                
                {/* Grid products */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&h=150&fit=crop" 
                      alt="Décoration"
                      className="w-full h-14 sm:h-18 lg:h-24 object-cover"
                    />
                    <div className="bg-muted/20 p-1.5">
                      <p className="text-[7px] sm:text-[9px] lg:text-[11px] font-medium line-clamp-1">Déco Scandinave</p>
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=150&fit=crop" 
                      alt="Intérieur"
                      className="w-full h-14 sm:h-18 lg:h-24 object-cover"
                    />
                    <div className="bg-muted/20 p-1.5">
                      <p className="text-[7px] sm:text-[9px] lg:text-[11px] font-medium line-clamp-1">Design Moderne</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[9px] sm:text-[11px] lg:text-sm text-center mt-3 text-muted-foreground font-medium">
              Discover
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GooglePhoneMockups;
