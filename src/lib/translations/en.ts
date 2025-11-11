export const translations = {
  // ============= Landing Page Configuration =============
  landingConfig: {
    title: "Landing Page Configuration",
    description: "Choose style and format",
    forProduct: "For",
    
    visualStyle: {
      title: "Visual style",
      modern: "Modern",
      minimalist: "Minimalist",
      scandinavian: "Scandinavian",
      premium: "Premium",
      neutral: "Neutral",
      colorful: "Colorful"
    },
    
    layout: {
      title: "Page layout",
      oneColumn: "1 Column",
      twoColumns: "2 Columns",
      heroLeft: "Hero Left",
      heroRight: "Hero Right",
      desc: {
        oneColumn: "Centered, mobile ideal",
        twoColumns: "Image + Text",
        heroLeft: "Dominant image on left",
        heroRight: "Dominant image on right"
      }
    },
    
    colorPalette: {
      title: "Color palette",
      modern: "Modern",
      professionalBlue: "Professional Blue",
      earth: "Earthy",
      luxuryGold: "Luxury Gold",
      freshGreen: "Fresh Green",
      vibrant: "Vibrant",
      descriptions: {
        modern: "Elegant black and shades of gray",
        professionalBlue: "Navy blue to light blue",
        earth: "Natural brown and beige tones",
        luxuryGold: "Black with gold accents",
        freshGreen: "Forest green to pastel green",
        vibrant: "Intense and energetic red"
      },
      useCustom: "Use custom color",
      selected: "Selected color"
    },
    
    vendor: {
      title: "Brand management (Vendor)",
      description: "Choose how to define the product brand for the landing page",
      importShopify: "Import from Shopify",
      importShopifyDesc: "Use brand configured in Shopify",
      extractTitle: "Extract from title",
      extractTitleDesc: "Automatically detect from product title",
      generateAI: "Generate with AI",
      generateAIDesc: "Create an optimized brand name with AI",
      extractExample: "Ex:"
    },
    
    contentLength: {
      title: "Content length",
      short: "Short (400 words)",
      medium: "Medium (800 words)",
      long: "Long (1500 words)"
    },
    
    customHighlights: {
      title: "Custom highlights",
      description: "Add specific information to highlight (max 500 characters)",
      placeholder: "Example: French artisanal craftsmanship\n30-day money-back guarantee\nCertified eco-friendly materials",
      tip: "💡 One highlight per line - Max 5 lines recommended"
    },
    
    buttons: {
      cancel: "Cancel",
      confirm: "Confirm",
      generate: "Generate",
      resetPreferences: "Reset preferences"
    }
  },
  
  landingGeneration: {
    preparing: "Preparing generation...",
    resolving: "Resolving brand/vendor...",
    analyzing: "Analyzing product and image...",
    generating: "Generating AI content...",
    processing: "Processing AI response...",
    finalizing: "Finalizing HTML render...",
    syncing: "Syncing with Shopify...",
    initializing: "Initializing generation...",
    
    success: {
      generated: "Landing page generated successfully!",
      synced: "Landing page synced to Shopify",
      available: "Page available at:"
    },
    
    errors: {
      noContent: "No content to download",
      noContentSync: "No content to sync",
      generation: "Error during landing page generation.",
      sync: "Error syncing to Shopify",
      rateLimit: "Rate limit reached. Please try again later.",
      paymentRequired: "AI credits exhausted. Contact support for more information.",
      limitReached: "Optimization limit reached. Upgrade to a higher plan.",
      noGenerated: "No content generated. Try with another style or layout."
    },
    
    preview: {
      title: "Landing Page Preview",
      description: "Use the buttons below to preview, download or sync.",
      desktop: "Desktop",
      mobile: "Mobile",
      download: "Download",
      syncShopify: "Sync Shopify",
      synchronizing: "Synchronizing...",
      downloaded: "HTML downloaded successfully!",
      syncInProgress: "Syncing to Shopify..."
    }
  },

  // ============= Product Media Optimization =============
  mediaOptimization: {
    title: "Product image optimization",
    description: "Optimize your product images with AI. All versions are saved in history and can be restored.",
    
    stats: {
      totalImages: "Total images",
      products: "Products",
      savedVersions: "Saved versions",
      hdResolution: "HD Resolution"
    },
    
    tabs: {
      whiteBg: "White Background",
      aiBg: "AI Background",
      history: "History"
    },
    
    whiteBg: {
      title: "White Background HD Generation",
      description: "Generate professional product photos on pure white background in 2000x2000px resolution. Perfect for Google Shopping and marketplaces.",
      generate: "Generate",
      generating: "Generating..."
    },
    
    aiBg: {
      title: "AI Background Generation",
      description: "Generate 4 creative background variants for your products. AI automatically centers the product.",
      promptLabel: "Custom prompt (optional)",
      promptPlaceholder: "Ex: Luxurious, modern lifestyle, warm atmosphere...",
      variants: "4 Variants"
    },
    
    history: {
      selectImage: "Select an image",
      selectImageDesc: "Click on an image in the \"White Background\" or \"AI Background\" tabs to see its optimization history."
    },
    
    preview: {
      title: "White Background HD - Resolution 2000x2000px",
      description: "Compare the original image with the generated white background",
      original: "Original",
      optimized: "Optimized",
      downloadHD: "Download HD (2000px)",
      apply: "Apply",
      cancel: "Cancel",
      downloadStarted: "HD download started (2000x2000px)"
    },
    
    errors: {
      limitReached: "Optimization limit reached. Upgrade to a higher plan.",
      generation: "Error generating white background",
      aiGeneration: "Error generating AI backgrounds"
    }
  },

  // ============= Product Content Optimization =============
  contentOptimization: {
    title: "Optimized Product Content",
    subtitle: "Create captivating titles and rich HTML descriptions to seduce your customers and improve your natural visibility",
    description: "Generate professional HTML descriptions with structured titles (H1, H2, H3), automatic product photo integration and mobile-optimized layout for search engines.",
    infoAlert: "Create rich HTML descriptions with structured titles (H1, H2, H3), integrated media and professional layout to attract your customers and improve your natural referencing.",
    
    hero: {
      title: "Optimized Product Content",
      description: "Create captivating titles and rich HTML descriptions to seduce your customers and improve your natural visibility"
    },
    
    stats: {
      totalProducts: "Total products",
      optimized: "Optimized",
      notOptimized: "Not optimized",
      toSync: "To Sync",
      synchronized: "Synchronized"
    },
    
    search: {
      placeholder: "Search for a product..."
    },
    
    table: {
      headers: {
        image: "Image",
        title: "Title",
        description: "Description",
        status: "Status",
        actions: "Actions"
      },
      status: {
        premiumContent: "Premium Content",
        basicContent: "Basic Content",
        toOptimize: "To optimize"
      },
      noOptimizedDesc: "No optimized description",
      original: "Original"
    },
    
    tooltips: {
      optimize: "Optimize",
      whiteBg: "White background",
      aiBg: "AI Background",
      view: "View",
      generateLanding: "Generate AI Landing Page",
      sync: "Sync"
    },
    
    alerts: {
      whiteBg: "White background: Automatically removes the background and adds a professional white background.",
      aiBg: "AI Background: Generates a new personalized background with artificial intelligence."
    },
    
    dialogs: {
      whiteBg: {
        title: "White Background Configuration",
        description: "Choose which photo from the gallery you want to rework",
        imageSelection: "Photo selection to rework"
      },
      optimizationConfirm: {
        optimizing: "Optimizing selected products..."
      }
    },
    
    toasts: {
      limitReached: "Optimization limit reached",
      productsSynced: "product(s) synced",
      productsOptimized: "product(s) optimized",
      noProductToOptimize: "No product to optimize",
      noProductToSync: "No optimized product to sync",
      noSelectedProduct: "No selected product to sync",
      syncError: "Error during synchronization",
      notOptimizedYet: "This product has not been optimized yet"
    },
    
    templates: {
      label: "Description style",
      ecommerce: "E-commerce",
      luxury: "Luxury",
      technical: "Technical",
      descriptions: {
        ecommerce: "Direct and persuasive style with focus on customer benefits",
        luxury: "Sophisticated and elegant tone with refined narration",
        technical: "Precise and professional language with detailed specifications"
      }
    },
    
    badges: {
      existingDesc: "Existing description",
      noDesc: "No description",
      photos: "photo",
      photosPlural: "photos",
      noImage: "No image"
    },
    
    buttons: {
      optimizeAll: "Optimize all",
      syncAll: "Sync all",
      syncSelected: "Sync selected",
      optimize: "Optimize",
      whiteBg: "White background",
      aiBg: "AI Background",
      optimizing: "Optimizing...",
      generating: "Generating...",
      synchronizing: "Synchronizing...",
      generate: "Generate Premium Content"
    },
    
    preview: {
      title: "Premium Content Preview",
      generating: "Generating with Vision AI analysis...",
      description: "Structured HTML description with H1, H2, H3 titles and media - Mobile-friendly",
      optimizing: "Optimizing...",
      analyzingDesc: "Analyzing images and creating professional presentation",
      desktop: "Desktop",
      mobile: "Mobile",
      view360: "360° View",
      apply: "Apply",
      cancel: "Cancel"
    },
    
    qualityScore: {
      label: "Quality score",
      excellent: "Excellent quality - Complete structure and rich optimized content",
      good: "Good quality - Some improvements possible",
      medium: "Average quality - Add more content and structure"
    },
    
    sync: {
      title: "Shopify Sync",
      description: "Automatic application and sync to Shopify...",
      complete: "Shopify sync complete",
      error: "Sync error"
    },
    
    empty: {
      title: "No products found",
      description: "Import products from Shopify to get started"
    },
    
    errors: {
      generation: "Generation error",
      application: "Application error",
      limitReached: "Optimization limit reached",
      limitTrialing: "Current plan limit reached. Upgrade to a paid plan to continue.",
      limitPaid: "Monthly optimization limit reached. Upgrade to a higher plan.",
      creditsExhausted: "AI credits exhausted",
      creditsExhaustedDesc: "Contact support for more information."
    }
  },

  // ============= Page Optimization =============
  pageOptimization: {
    filters: {
      status: {
        all: "All",
        optimized: "Optimized",
        notOptimized: "Not optimized"
      },
      sync: {
        all: "All",
        synced: "Synced",
        notSynced: "Not synced"
      },
      quality: {
        all: "All scores",
        excellent: "Excellent",
        good: "Good",
        medium: "Medium",
        poor: "Poor"
      }
    },
    
    stats: {
      totalPages: "Total pages",
      optimized: "Optimized",
      notOptimized: "Not optimized",
      globalScore: "Global SEO Score"
    },
    
    buttons: {
      import: "Import pages",
      importing: "Importing...",
      optimizeSelected: "Optimize selection",
      optimizeAll: "Optimize all",
      syncAll: "Sync all",
      syncSelected: "Sync selection",
      selectAll: "Select all",
      viewFilters: "Filters"
    },
    
    table: {
      page: "Page",
      status: "Status",
      syncStatus: "Sync",
      seoScore: "SEO Score",
      actions: "Actions",
      optimized: "Optimized",
      notOptimized: "Not optimized",
      synced: "Synced",
      notSynced: "Not synced",
      never: "Never",
      optimize: "Optimize",
      reoptimize: "Re-optimize",
      syncAction: "Sync"
    },
    
    toasts: {
      userNotConnected: "User not connected",
      errorLoading: "Error loading pages",
      importing: "Importing pages from",
      importError: "Error",
      permissionWarning: "Permission required",
      importSuccess: "pages imported",
      importTotal: "pages imported in total!",
      pageOptimized: "Page optimized!",
      pagesOptimized: "Page(s) optimized",
      allOptimized: "All pages optimized!",
      alreadyOptimized: "All pages are already optimized",
      pageSynced: "Page synced!",
      pagesSynced: "page(s) synced!",
      noAiPages: "No AI-optimized pages to sync",
      onlyAiPages: "Only AI-optimized pages can be synced",
      limitReached: "Optimization limit reached. Upgrade to a higher plan.",
      limitTrialing: "Current plan limit reached. Upgrade to a paid plan to continue.",
      limitPaid: "Monthly optimization limit reached. Upgrade to a higher plan."
    },
    
    empty: {
      title: "No pages",
      description: "Import your Shopify pages to get started"
    }
  },

  // ============= Ads Campaign =============
  adsCampaign: {
    title: "Ad Campaigns",
    description: "Create attractive landing pages for your advertising campaigns",
    
    buttons: {
      new: "New Campaign",
      view: "View",
      copy: "Copy link",
      duplicate: "Duplicate",
      delete: "Delete"
    },
    
    types: {
      product: "Product",
      collection: "Collection",
      store: "Store"
    },
    
    status: {
      active: "Active",
      paused: "Paused",
      draft: "Draft"
    },
    
    details: {
      createdOn: "Created on",
      products: "Products:",
      collections: "Collections:",
      cta: "CTA:"
    },
    
    toasts: {
      deleted: "Campaign deleted",
      deleteError: "Deletion error",
      duplicated: "Campaign duplicated",
      duplicateError: "Duplication error",
      linkCopied: "Link copied",
      campaignError: "Error loading campaigns"
    },
    
    empty: {
      title: "No campaigns",
      description: "Start by creating your first advertising landing page",
      cta: "Create my first campaign"
    }
  },

  // ============= Ads Campaign Wizard =============
  adsCampaignWizard: {
    steps: {
      campaignType: "Campaign type",
      selectContent: "Content selection",
      messaging: "Message and CTA",
      design: "Design style",
      highlights: "Highlights",
      review: "Review"
    },
    
    step1: {
      nameLabel: "Campaign name *",
      namePlaceholder: "Ex: Element Collection Gallery",
      typeLabel: "Campaign type *",
      product: {
        title: "Product",
        description: "Artistic gallery to showcase your products"
      },
      collection: {
        title: "Collection",
        description: "Immersive experience for a complete collection"
      },
      store: {
        title: "Store",
        description: "Artistic presentation of your store universe"
      }
    },
    
    step2: {
      storeSummary: {
        title: "Your store summary",
        description: "AI will analyze your products and create a store summary",
        generate: "Generate summary with AI",
        generating: "Generating summary...",
        edit: "Edit summary",
        placeholder: "Your store summary...",
        error: "No Shopify store connected",
        success: "Summary generated successfully"
      },
      collections: {
        title: "Select collections",
        loading: "Loading...",
        empty: "No collections available",
        selected: "selected"
      },
      products: {
        title: "Select products",
        forCollections: "Products from selected collections",
        allProducts: "All your products",
        loading: "Loading...",
        empty: "No products available",
        selected: "selected"
      }
    },
    
    step3: {
      headline: {
        label: "Main title *",
        placeholder: "Ex: Discover our new collection"
      },
      subheadline: {
        label: "Subtitle",
        placeholder: "Ex: Exceptional products to enhance your interior"
      },
      cta: {
        label: "CTA button text *",
        placeholder: "Ex: View collection"
      }
    },
    
    step4: {
      title: "Choose your landing page style",
      description: "This style will influence the overall design and atmosphere",
      artistic: {
        title: "Artistic",
        description: "Creative design with animations and visual effects"
      },
      minimal: {
        title: "Minimalist",
        description: "Clean and elegant design, focus on product"
      },
      bold: {
        title: "Bold",
        description: "Impactful design with strong typography"
      }
    },
    
    step5: {
      title: "Highlights (optional)",
      description: "Add up to 3 selling points",
      placeholder: "Ex: Free shipping",
      add: "Add",
      remove: "Remove"
    },
    
    buttons: {
      back: "Back",
      next: "Next",
      create: "Create campaign",
      creating: "Creating..."
    },
    
    errors: {
      selectType: "Please select a campaign type",
      enterName: "Please name your campaign",
      selectCollection: "Please select at least one collection",
      selectProduct: "Please select at least one product",
      fillRequired: "Please fill all required fields",
      mustBeConnected: "You must be logged in",
      creationError: "Error creating campaign"
    },
    
    toasts: {
      creating: "Creating your artistic landing page...",
      shopifyCreating: "Creating Shopify page...",
      shopifyCreated: "Shopify page created successfully!",
      shopifyError: "Landing page created, but error creating Shopify page",
      success: "Campaign created successfully!",
      landingGenerated: "Artistic landing page generated",
      viewAction: "View",
      shopifyAction: "View on Shopify"
    }
  },

  // ============= AI Background Config =============
  aiBackgroundConfig: {
    title: "AI Background Configuration",
    description: "Customize generation settings for",
    products: "product(s)",
    
    parameters: {
      title: "Generation parameters",
      format: {
        label: "Image format",
        square: "Square (1:1)",
        portrait: "Portrait (3:4)",
        landscape: "Landscape (4:3)"
      },
      imageType: {
        label: "Image type",
        primary: {
          title: "Primary Image",
          description: "Product centered and clearly visible"
        },
        secondary: {
          title: "Secondary Image",
          description: "Lifestyle atmosphere photo"
        }
      },
      similarity: {
        label: "Similarity to original",
        veryClose: "🎯 Very close (90%)",
        close: "✓ Close (70%)",
        medium: "⚖️ Balanced (50%)",
        creative: "🎨 Creative (30%)",
        veryCreative: "✨ Very creative (10%)"
      }
    },
    
    imageSelection: {
      title: "Select photo to rework",
      main: "Main",
      gallery: "#"
    },
    
    presets: {
      label: "Preset style",
      placeholder: "Choose a style...",
      studio: "🎬 Professional studio",
      luxuryNature: "🌿 Luxurious nature",
      minimal: "⚪ Modern minimalist",
      lifestyle: "🏠 Warm lifestyle",
      urban: "🏙️ Contemporary urban",
      elegant: "✨ Classic elegance"
    },
    
    customPrompt: {
      label: "Or create your own prompt (in English)",
      placeholder: "Ex: Place this product on a wooden table with natural sunlight...",
      tip: "💡 Tip: Describe the desired environment, lighting and atmosphere"
    },
    
    buttons: {
      cancel: "Cancel",
      generate: "Generate backgrounds"
    }
  },

  // ============= Optimization Config Dialog =============
  optimizationConfig: {
    title: "Optimization Configuration",
    description: "Customize the style and structure of HTML content for",
    products: "product(s)",
    
    imageSelection: {
      label: "Photo to analyze",
      main: "Main",
      gallery: "Gallery"
    },
    
    customDescription: {
      label: "Additional information (optional)",
      placeholder: "Ex: Premium material, made in France, 5-year warranty, includes accessories...",
      hint: "These details will be integrated into the generated description"
    },
    
    style: {
      label: "Description style",
      modern: "Modern - Clean and minimalist design",
      elegant: "Elegant - Sophisticated and refined",
      professional: "Professional - Sober and direct",
      creative: "Creative - Bold and original"
    },
    
    layout: {
      label: "Content structure",
      compact: "Compact - Concise presentation",
      detailed: "Detailed - Rich sections",
      story: "Story - Engaging narration"
    },
    
    colorScheme: {
      label: "Color palette",
      vibrant: "Vibrant - Bright colors",
      pastel: "Pastel - Soft tones",
      monochrome: "Monochrome - Black & white",
      warm: "Warm - Warm tones"
    },
    
    contentLength: {
      label: "Content length",
      short: "Short - Essential (~500 words)",
      medium: "Medium - Balanced (~1000 words)",
      long: "Long - Detailed (~2000 words)"
    },
    
    buttons: {
      cancel: "Cancel",
      launch: "Launch optimization"
    }
  },

  aiAssistant: {
    title: "AI Assistant",
    subtitle: "Online and ready to help",
    welcome: "Hello! I'm your AI assistant. How can I help you today?",
    placeholder: "Type your message...",
    error: "Sorry, I encountered an error. Please try again."
  },
  notFound: {
    title: "Page not found",
    description: "The page you are looking for does not exist or has been moved.",
    backHome: "Back to home"
  },
  currency: {
    usd: "USD",
    eur: "EUR",
    symbol: "$",
    symbolEur: "€",
    monthly: "/month",
    yearly: "/year",
    save: "Save"
  },
  common: {
    error: "Error",
    success: "Success",
    loading: "Loading...",
    saving: "Saving...",
    saved: "Saved",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    search: "Search",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    yes: "Yes",
    no: "No",
    actions: "Actions",
    settings: "Settings",
    status: "Status",
    date: "Date",
    name: "Name",
    description: "Description",
    saveChanges: "Save Changes",
    summary: "Summary",
    none: "None",
    all: "All",
    active: "Active",
    draft: "Draft",
    recent: "Recent",
    sort: "Sort",
    category: "Category",
    apply: "Apply",
    generate: "Generate",
    sync: "Sync",
    optimize: "Optimize",
    refresh: "Refresh",
    view: "View",
    download: "Download",
    upload: "Upload",
    connect: "Connect",
    disconnect: "Disconnect",
    publish: "Publish",
    preview: "Preview",
    validate: "Validate",
    create: "Create",
    add: "Add",
    export: "Export",
    import: "Import",
    impossible: "Impossible",
    dataRefreshed: "Data refreshed",
  },
  
  navigation: {
    main: "Navigation",
    dashboard: "Dashboard",
    products: "Products",
    productOptimization: "Product Optimization",
    titleDescription: "Optimized Product Content",
    seoOptimization: "SEO Optimization",
    blog: "Blog",
    aiSearch: "AI Search",
    googleShopping: "Google Shopping",
    googleMerchant: "Google Merchant",
    chat: "Chat",
    account: "Account",
    catalog: "Catalog",
    seo: "SEO Optimisation",
    seoBlog: "SEO Blog",
    integration: "Integration",
    smartChat: "Smart Chat",
    logout: "Logout",
    collapse: "Collapse",
    tagOptimization: "Tag Optimization",
    altImage: "ALT Image",
    articles: "Articles",
    campaigns: "Campaigns",
    opportunities: "Opportunities",
    netlinking: "Netlinking",
    conversation: "Conversation",
    history: "History",
    productSource: "Product Source",
    notifications: "Notifications",
    subscription: "Subscription",
    shopify: "Shopify",
    adminPanel: "Admin Panel",
    currentPlan: "Current Plan",
    settings: "Settings",
    translations: "Translations",
    refresh: "Refresh",
    
    // SEO Submenu - Detailed
    seoSubmenu: {
      products: "Products",
      collections: "Collections",
      pages: "Pages",
      articles: "Articles",
      altImage: "ALT Images",
      homepage: "Homepage",
      tags: "Tags",
      automation: "Automation",
      audit: "SEO Audit",
    },
    
    // SEO Audit Submenu
    auditSubmenu: {
      overview: "Overview",
      homepage: "Homepage",
      issues: "Issues",
      actionPlan: "Action Plan",
      reports: "Reports",
    },
    
    // Blog Submenu
    blogSubmenu: {
      articles: "AI Articles",
      campaigns: "AI Campaigns",
      opportunities: "Opportunities",
      netlinking: "Netlinking",
      settings: "Settings",
    },
    
    // Google Shopping Submenu
    shoppingSubmenu: {
      feed: "XML Feed",
      settings: "Settings",
      synchronization: "Synchronization",
    },
    
    // Google Merchant Submenu
    merchantSubmenu: {
      feed: "XML Feed",
      settings: "Settings",
      synchronization: "Synchronization",
    },
    
    // Chat Submenu
    chatSubmenu: {
      assistant: "Assistant",
      robot: "AI Robot",
      orders: "Orders",
      learning: "Learning",
      history: "History",
      productSource: "Product Source",
      settings: "Chat Settings",
      smartPricing: "Smart Pricing AI",
    },
    
    // Account Submenu
    accountSubmenu: {
      profile: "My Profile",
      integrations: "Integrations",
      subscription: "Subscription",
      billing: "Billing",
    },
  },
  
  googleShopping: {
    title: "Google Shopping - AI Optimization",
    description: "Optimize your products with AI to maximize visibility on Google Shopping",
    products: "products",
    hero: {
      optimizationScore: "Google Shopping Optimization Score",
      optimized: "optimized",
      categoryGtinWhiteBg: "(Category + GTIN + AI White Background)",
    },
    guide: {
      quickOptimization: "Quick Optimization Guide",
      steps: "1. Select products → 2. Generate GTINs → 3. Generate AI Categories → 4. AI White Background → 5. Sync",
      shopifyGuide: "Shopify Optimization Guide",
      description: "Manage and optimize your Google Shopping attributes to improve product visibility",
    },
    stats: {
      totalProducts: "Total Products",
      inCatalog: "In your catalog",
      optimized: "Optimized",
      completed: "completed",
      toSync: "To Sync",
      readyForShopify: "Ready for Shopify",
    },
    actions: {
      optimizeAll: "Optimize All",
      generateGTINs: "Generate GTINs",
      whiteBackgroundAI: "AI White Background",
      generateCategoriesAI: "Generate AI Categories",
      sync: "Sync",
      searchPlaceholder: "Search for a product...",
      viewXMLFeed: "View XML Feed",
      refresh: "Refresh",
    },
    table: {
      image: "Image",
      title: "Title",
      productCategory: "Product Category",
      mpn: "MPN",
      condition: "Condition",
      gtin: "GTIN",
      status: "Status",
      actions: "Actions",
      optimizeWithAI: "Optimize with AI",
      edit: "Edit",
    },
    status: {
      pending: "Pending",
      optimized: "Optimized",
      synced: "Synced",
    },
    errors: {
      loadProducts: "Error loading products",
      saveData: "Error saving data",
      generateGtin: "Error generating GTINs",
      generateCategories: "Error generating categories",
      generateImages: "Image generation error",
      applyImages: "Error applying images",
    },
    success: {
      dataUpdated: "Google Shopping data updated",
      gtinsGenerated: "GTINs generated for {{count}} products",
      categoriesGenerated: "Categories generated: {{success}} success, {{errors}} errors",
      imagesApplied: "{{count}} images applied",
      optimizationComplete: "Optimization complete",
      feedRegenerated: "XML feed successfully regenerated! 🎉",
      productsExported: "{{count}} products exported to CSV! 📊",
    },
    prompts: {
      selectProduct: "Select at least one product",
      confirmOptimize: "{{count}} products will be optimized (missing category, GTIN and/or white background). Continue?",
      noImage: "No selected product has an image",
      allOptimized: "All products are already optimized!",
      generatingCSV: "Generating CSV file...",
      noProductsToExport: "No products to export",
    },
  },
  
  googleMerchant: {
    title: "Google Merchant Center",
    subtitle: "Synchronize your products with Google Shopping to maximize your visibility",
    score: "Optimization score",
    status: {
      operational: "Operational",
      error: "Error",
      testing: "Testing in progress",
      notTested: "Not tested",
    },
    buttons: {
      optimizeAll: "Optimize all",
      testFeed: "Test feed",
      regenerateXml: "Regenerate XML",
      downloadXml: "Download XML",
      exportCsv: "Export CSV",
      optimizeNow: "Optimize now",
    },
    alerts: {
      enrichData: "Enrich your Google Shopping data",
      enrichDescription: "Optimize your products with Google categories, GTIN, and AI white background to create an optimized feed and increase your visibility.",
    },
    feedUrl: {
      title: "XML Feed URL",
      subtitle: "Copy this URL for Google Merchant Center",
      label: "Your Google Shopping feed URL",
      copy: "Copy",
      copied: "Copied!",
      note: "Note: This newai.sale URL will work after publication. In preview, the test uses the direct Supabase URL.",
      preview: "Preview feed",
    },
    sync: {
      title: "Synchronization Status",
      subtitle: "Synchronize your products from Shopify to Google Shopping feed",
      lastSync: "Last synchronization",
      frequency: "Frequency",
      syncNow: "Synchronize now",
      syncing: "Synchronization in progress...",
      autoSyncTitle: "Automatic Synchronization Settings",
      autoSyncSubtitle: "Configure automatic synchronization from your Shopify store",
      autoSyncEnabled: "Automatic synchronization",
      autoSyncDescription: "Automatically synchronize changes from Shopify",
      frequencyLabel: "Synchronization frequency",
      frequencyOptions: {
        manual: "Manual",
        hourly: "Every hour",
        daily: "Daily",
        weekly: "Weekly",
      },
      howItWorks: "How it works: Automatic synchronization retrieves updates from your Shopify products (prices, stock, descriptions) and updates your Google Shopping feed. Changes are detected automatically according to the chosen frequency.",
    },
    integration: {
      title: "Google Merchant Center Integration",
      description: "Connect and manage your Google Merchant Center account",
      connect: "Connect with Google",
      disconnect: "Disconnect",
      connected: "Connected",
      notConnected: "Not connected",
      selectAccount: "Select a Merchant Center account",
      accountSelected: "Account selected",
      accounts: "Merchant Center Accounts",
      noAccounts: "No accounts found",
      createFeed: "Create and sync feed",
      autoCreate: "Auto-create feed after connection",
      success: {
        connected: "Successfully connected to Google Merchant Center",
        disconnected: "Disconnected from Google Merchant Center",
        feedCreated: "Feed created and synchronization started",
      },
      errors: {
        loadAccounts: "Error loading accounts",
        connect: "Connection error",
        disconnect: "Disconnection error",
        createFeed: "Error creating feed",
      },
    },
    monitoring: {
      title: "Sync Monitoring",
      subtitle: "Detailed performance and statistics",
      errorLoading: "Unable to load sync history",
      noSyncs: "No syncs found for this period",
      
      periods: {
        last7days: "Last 7 days",
        last30days: "Last 30 days",
        last90days: "Last 90 days",
      },
      
      status: {
        completed: "Completed",
        failed: "Failed",
        running: "Running",
        pending: "Pending",
      },
      
      stats: {
        totalSyncs: "Total Syncs",
        successRate: "Success Rate",
        avgDuration: "Average Duration",
        productsSynced: "Products Synced",
        successful: "successful",
        failed: "failed",
      },
      
      charts: {
        syncDuration: "Sync Duration (seconds)",
        productsSync: "Products Synced",
        statusDistribution: "Success/Failure Distribution",
        successRate: "Success Rate",
        duration: "Duration",
        products: "Products",
        success: "Success",
      },
      
      history: {
        title: "Detailed History",
        sync: "Sync",
        duration: "Duration",
        productsSynced: "products synced",
        failures: "failures",
      },
    },
  },
  
  googleAds: {
    title: "Google Ads",
    subtitle: "Manage your Google Ads campaigns",
    integration: {
      title: "Google Ads Integration",
      description: "Connect your Google Ads account to start managing campaigns",
      connect: "Connect Google Ads",
      disconnect: "Disconnect",
      connected: "Connected",
      notConnected: "Not connected",
      selectAccount: "Select an account",
      success: {
        connected: "Successfully connected to Google Ads",
        disconnected: "Disconnected from Google Ads",
      },
      errors: {
        connect: "Connection error",
        disconnect: "Disconnection error",
      },
    },
    campaigns: {
      title: "Your Google Ads Campaigns",
      subtitle: "Create and manage your campaigns automatically",
      newCampaign: "New Campaign",
      createNew: "Create New Campaign",
      firstCampaign: "Create your first campaign",
      firstCampaignDesc: "AI will help you create optimized campaigns automatically",
      createWithAI: "Create with AI",
      
      upcomingFeatures: {
        title: "Upcoming Features",
        feature1: "Automatic campaign creation based on your products",
        feature2: "AI-powered bid optimization",
        feature3: "Automatic ad generation",
        feature4: "Smart budget management",
      },
    },
    optimization: {
      title: "Optimization",
      
      metrics: {
        currentROAS: "Current ROAS",
        conversionRate: "Conversion Rate",
        avgCPC: "Average CPC",
        qualityScore: "Quality Score",
      },
      
      roasTitle: "ROAS AI Optimization",
      optimizeAuto: "Automatically optimize your campaigns",
      optimizeAutoDesc: "AI will analyze your performance and automatically optimize your bids, budgets and targeting to maximize your ROI",
      
      automaticOptimizations: {
        title: "Automatic Optimizations",
        feature1: "Automatic bid adjustment based on performance",
        feature2: "Budget reallocation to performing campaigns",
        feature3: "Negative keyword suggestions",
        feature4: "Underperforming ad optimization",
      },
    },
    analytics: {
      title: "Analytics",
      description: "Analyze your campaign performance in depth",
      connect: "Connect Google Analytics",
      overview: "Performance Overview",
      dashboards: "Dashboards under construction",
      dashboardsDesc: "Soon you'll visualize all your key metrics in real-time",
    },
    tracking: {
      title: "Conversion Tracking Setup",
      
      purchaseTracking: {
        title: "Purchase Tracking",
        description: "Automatically track purchase conversions on your site",
        action: "Configure",
      },
      
      googleTag: {
        title: "Google Ads Tag",
        description: "Install the Google Ads conversion tag on your site",
        action: "Get the code",
      },
      
      customEvents: {
        title: "Custom Events",
        description: "Create custom conversions for your specific goals",
        action: "Create an event",
      },
      
      trackingFeatures: {
        title: "Tracking Features",
        feature1: "Automatic e-commerce conversion tracking",
        feature2: "AI-powered multi-touch attribution",
        feature3: "Cross-device analysis",
        feature4: "Real-time conversion reports",
      },
    },
  },
  
  searchConsole: {
    products: {
      title: "Product Analysis",
      description: "Analyze your product performance in Google Search Console",
      performanceTracking: {
        title: "Performance Tracking",
        description: "Track clicks, impressions and CTR for each product",
      },
      suggestedOptimizations: {
        title: "Suggested Optimizations",
        description: "Identify products to optimize as a priority",
      },
      automaticAlerts: {
        title: "Automatic Alerts",
        description: "Receive alerts in case of significant drop",
      },
      underDevelopment: "Feature under development",
      underDevelopmentDesc: "This section will soon be available to analyze your products",
    },
    sitemaps: {
      title: "Sitemaps and Indexing",
      description: "Manage your sitemaps and track indexing of your pages and products",
      indexed: "Indexed Pages",
      pending: "Pending",
      errors: "Errors",
      submitSitemap: "Submit a sitemap",
      submitSitemapDescription: "Submit your sitemap URL to Google Search Console",
      submitButton: "Submit",
      placeholder: "https://example.com/sitemap.xml",
      productSitemap: {
        title: "Product Sitemap",
        description: "Automatically generate a sitemap for all your products",
        action: "Generate",
      },
      pageSitemap: {
        title: "Page Sitemap",
        description: "Include all your static pages and collections",
        action: "Generate",
      },
      underDevelopment: "Feature under development",
      underDevelopmentDesc: "Full sitemap management will be available soon",
    },
  },
  
  smartPricing: {
    errors: {
      loadData: "Error loading data",
      save: "Error saving",
      import: "Error importing",
      notDeployed: "Import function not yet deployed",
      analysis: "Analysis function not deployed",
    },
    success: {
      bulkApplied: "Modification applied successfully",
      costsImported: "Import completed: {{count}} costs imported",
      shippingImported: "Shopify shipping costs imported",
      analysisComplete: "Analysis complete: {{count}} product(s)",
    },
    prompts: {
      importCosts: "Importing costs in progress...",
      importShipping: "Importing shipping costs...",
      analyzing: "AI analysis of {{count}} product(s)...",
    },
  },

  dashboard: {
    welcome: "Welcome, {{name}} 👋",
    seoScore: "Global SEO Score",
    launchAudit: "Launch SEO Audit",
    optimizeProducts: "Optimize {{count}} products",
    optimizeProductsBtn: "Optimize Products",
    createArticle: "Create Article",
    manageStores: "Manage Stores",
    connectShopify: "Connect Shopify",
    importProducts: "Import products",
    quickActions: "Quick Actions",
    quickActionsDesc: "Access key features directly",
    items: "items",
    activity: {
      title: "Recent Activity",
      empty: "No recent activity",
    },
    usage: {
      title: "Usage Limits",
      description: "Your usage this month",
      remaining: "remaining optimizations",
      labels: {
        products: "Products",
        stores: "Shopify Stores",
        optimizations: "SEO Optimizations",
        articles: "AI Articles",
        shopifySearch: "AI Shopify Search",
        chatResponses: "AI Chat Responses",
        campaigns: "Auto Campaigns",
      }
    },
    plans: {
      title: "Choose Your Plan",
      subtitle: "Select the perfect plan for your business needs",
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save {{percent}}%",
      currentPlan: "Current Plan",
      upgrade: "Upgrade",
      downgrade: "Downgrade",
      changePlan: "Change Plan",
      perMonth: "/month",
      optimizationsCount: "{{count}} optimizations",
      descriptions: {
        starter: "Perfect for getting started",
        pro: "For growing businesses",
        enterprise: "For large operations",
      },
      features: {
        products: "products",
        optimizations: "optimizations/month",
        articles: "articles/month",
        campaigns: "campaigns",
        chatResponses: "chat responses/month",
        unlimitedProducts: "Unlimited products",
        optimizationsPerMonth: "SEO optimizations/month",
        articlesPerMonth: "blog articles/month",
        chatResponsesPerMonth: "chat responses/month",
        shopifyStores: "Shopify store(s)",
        seoAutomation: "SEO automation",
        prioritySupport: "Priority support"
      },
      errors: {
        missingConfig: "The \"{{planName}}\" plan must be configured in Stripe. Please create the prices in your Stripe dashboard.",
        genericError: "Unable to process request",
      }
    },
    metrics: {
      totalProducts: "Total Products",
      optimized: "Optimized",
      pending: "Pending",
      catalogValue: "Catalog Value",
      blogArticles: "Blog Articles",
      seoHealth: "SEO Health",
    },
    actions: {
      manageProducts: "Manage Products",
      fullCatalog: "Full catalog",
      optimizedCount: "{{optimized}}/{{total}} optimized",
      optimizeSeo: "Optimize SEO",
      pendingProducts: "Pending products",
      createArticle: "Create Article",
      aiGenerated: "AI generated blog",
      published: "{{count}} articles published",
      aiAssistant: "AI Assistant",
      smartChat: "Smart chat",
      online: "Online",
      analytics: "Analytics",
      trackPerformance: "Track your performance",
      connectShopify: "Connect Shopify",
      manageStores: "Manage stores",
      connectNow: "Connect now",
      connected: "Connected",
      connect: "Connect",
      stores: "{{count}} store(s)",
      homepage: "Homepage",
      updateSeo: "Update SEO",
      emailCampaigns: "Email Campaigns",
      comingSoon: "Coming soon",
    },
    seoChallenges: "Daily SEO Challenges",
    noChallenges: "No challenges available",
    noChallengesDesc: "New challenges coming soon!",
    cards: {
      aiOptimized: "AI Optimized Products",
      toOptimize: "To Optimize",
      seoScore: "Global SEO Score",
      articlesPublished: "Articles Published",
      optimizedValue: "Optimized Value",
      activeStores: "Active Stores",
      productsNoSeo: "Products without SEO",
      seoContent: "SEO Content",
      ofCatalog: "of catalog",
      synchronized: "Synchronized",
      notConnected: "Not connected",
      products: "products",
      actionRequired: "Action required",
      optimizedProducts: "products optimized",
      excellent: "Excellent",
      good: "Good",
      needsImprovement: "Needs Improvement",
    },
    recentActivity: {
      title: "Recent Activity",
      productsOptimized: "{{count}} products optimized",
      articlesPublished: "{{count}} articles published",
      storesConnected: "{{count}} store{{plural}} connected",
      today: "Today",
      thisWeek: "This week",
      thisMonth: "This month",
    },
    banners: {
      optimization: {
        title: "{{count}} products require SEO optimization",
        description: "Potential gain: +{{gain}} SEO score points",
        action: "Optimize Now",
      },
      lowScore: {
        title: "Your SEO score can be improved",
        description: "Optimize your titles, descriptions and images for better ranking",
        action: "View Recommendations",
      },
      success: {
        title: "Excellent work! Your SEO is top-notch",
        description: "Keep maintaining this quality level for your catalog",
        action: "View Details",
      },
    },
    trends: {
      thisMonth: "+12.5% this month",
      recentArticles: "+3 this month",
    },
    quality: {
      excellent: "Excellent",
      good: "Good",
      improve: "To improve",
    },
  },

  superAdmin: {
    navigation: {
      title: "Super Admin",
      dashboard: "Dashboard",
      users: "Users",
      emails: "Emails",
      templates: "Templates",
      emailStats: "Email Stats",
      analytics: "Analytics",
      logout: "Logout"
    },
    toasts: {
      logoutSuccess: {
        title: "Logged out successfully",
        description: "See you soon!"
      },
      logoutError: {
        title: "Error",
        description: "Unable to log out"
      },
      loginSuccess: {
        title: "Login successful",
        description: "Welcome to the admin panel",
      }
    },
    emailStats: {
      title: "Email Statistics",
      description: "Detailed analysis of your communications",
      timeRange: {
        last7: "Last 7 days",
        last14: "Last 14 days",
        last30: "Last 30 days",
        last90: "Last 90 days"
      },
      exportButton: "Export CSV",
      cards: {
        total: "Total Emails",
        sent: "Sent",
        received: "Received",
        responseRate: "Response rate",
        responseTime: "Response time",
        average: "Average",
        ofTotal: "of total",
        replied: "replied"
      },
      charts: {
        dailyVolume: "Daily volume",
        responseEvolution: "Response evolution",
        topSenders: "Top 10 Senders",
        sent: "Sent",
        received: "Received",
        replied: "Replied"
      },
      table: {
        email: "Email",
        count: "Count",
        replies: "Replies",
        rate: "Rate",
        avgTime: "Avg time (h)"
      },
      csv: {
        title: "Email Statistics",
        period: "Period",
        lastDays: "last days",
        metric: "Metric",
        value: "Value",
        totalEmails: "Total emails",
        emailsSent: "Emails sent",
        emailsReceived: "Emails received",
        emailsWithReply: "Emails with reply",
        avgResponseTime: "Average response time (h)",
        dailyStats: "Daily statistics",
        date: "Date",
        sent: "Sent",
        received: "Received",
        replied: "Replied",
        topSenders: "Top senders",
        number: "Number",
        responses: "Responses"
      }
    },
    emailTemplates: {
      title: "Email Templates",
      description: "Manage your quick response templates",
      newTemplate: "New Template",
      editTemplate: "Edit Template",
      deleteConfirm: "Are you sure you want to delete this template?",
      form: {
        name: "Template name",
        category: "Category",
        subject: "Subject",
        variables: "Available variables",
        variablesHelp: "Use {{variable}} in content to replace automatically",
        variablesPlaceholder: "Comma-separated: name, email, plan, subject",
        bodyText: "Message body (text)",
        bodyHtml: "Message body (optional HTML)"
      },
      categories: {
        general: "General",
        onboarding: "Onboarding",
        support: "Support",
        sales: "Sales"
      },
      buttons: {
        cancel: "Cancel",
        update: "Update",
        create: "Create",
        use: "Use",
        preview: "Preview",
        edit: "Edit",
        duplicate: "Duplicate",
        delete: "Delete"
      },
      usageCount: "Used {count} times",
      toasts: {
        loadError: "Unable to load templates",
        fillRequired: "Please fill all required fields",
        updated: "Template updated",
        created: "Template created",
        saveError: "Unable to save template",
        deleted: "Template deleted",
        deleteError: "Unable to delete template",
        duplicated: "Template duplicated",
        duplicateError: "Unable to duplicate template"
      },
      preview: {
        title: "Preview",
        subject: "Subject",
        htmlPreview: "HTML Preview",
        body: "Message body"
      }
    },
    userActivity: {
      title: "Activity History",
      description: "Detailed tracking of user actions",
      filters: {
        user: "User",
        allUsers: "All users",
        store: "Store",
        allStores: "All stores",
        page: "Page",
        allPages: "All pages"
      },
      stats: {
        total: "Total",
        totalActivities: "Total activities",
        today: "Today",
        todayActivities: "Today's activities",
        thisWeek: "This week",
        last7Days: "Last 7 days",
        thisMonth: "This month",
        last30Days: "Last 30 days",
        topPages: "Most visited pages",
        topActions: "Most frequent actions"
      },
      noActivities: "No activities found"
    }
  },
  account: {
    title: "Account Settings",
    trial: "Trial",
    upgrade: "Upgrade",
    tabs: {
      profile: "Profile",
      integrations: "Integrations",
      subscription: "Subscription",
      billing: "Billing Portal",
    },
    submenu: {
      profile: "My Profile",
      integrations: "Integrations",
      subscription: "Subscription",
      billing: "Billing",
    },
    profile: {
      title: "Personal Information",
      email: "Email",
      emailDesc: "Email address cannot be changed",
      fullName: "Full Name",
      fullNamePlaceholder: "Enter your full name",
      updateSuccess: "Profile updated successfully",
      updateError: "Error updating profile",
    },
    security: {
      title: "Security",
      newPassword: "New Password",
      newPasswordPlaceholder: "Enter new password",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "Confirm new password",
      changePassword: "Change Password",
      securityTips: "Security Tips",
      tip1: "Use at least 8 characters",
      tip2: "Mix uppercase and lowercase letters",
      tip3: "Include numbers and special characters",
      tip4: "Avoid personal information",
      fillAllFields: "Please fill in all fields",
      passwordTooShort: "Password must be at least 6 characters",
      passwordMismatch: "Passwords do not match",
      updateSuccess: "Password updated successfully",
      updateError: "Error changing password",
    },
    language: {
      title: "Language Preferences",
      description: "Choose your preferred language",
      english: "English",
      french: "French",
      changeSuccess: "Language changed to {{language}}",
    },
    billing: {
      title: "Billing Portal",
      description: "Manage your payment methods, view invoices, and update billing information",
      descriptionActive: "Your plan is active and operational",
      descriptionInactive: "Manage your subscription and view payment history",
      openPortal: "Open Billing Portal",
      loading: "Loading...",
      redirectInfo: "You will be redirected to Stripe's secure portal",
      error: "Unable to open billing portal",
    },
    subscription: {
      title: "Current Subscription",
      currentPlan: "Current Plan",
      active: "Active",
      expiresOn: "Expires on",
      renewalDate: "Renewal date",
      noSubscription: "No active subscription",
      choosePlan: "Choose a Plan",
      activateFullPlan: "Activate Full Plan",
      changePlan: "Change Plan",
      manageSubscription: "Manage Subscription",
      activating: "Activation...",
      activationSuccess: "Subscription activated successfully!",
      activationError: "Error activating subscription",
      portalError: "Error opening portal",
    },
  },

  referral: {
    title: 'Earn 100+ optimizations',
    subtitle: 'Refer your friends and get free optimizations',
    shareButton: 'Share',
    dialogTitle: 'Share and earn',
    dialogSubtitle: 'and get free optimizations',
    howItWorks: 'How it works:',
    step1: 'Share your invitation link',
    step2: 'They sign up and receive',
    step2Credits: '100 free optimizations',
    step3: 'You receive',
    step3Credits: '100 optimizations',
    step3Condition: 'once they publish their first site',
    linkTitle: 'Your invitation link:',
    usedBy: 'used by',
    users: 'users',
    user: 'user',
    copyButton: 'Copy link',
    copied: 'Copied!',
    linkCopied: 'Link copied!',
    successfulReferrals: 'Successful referrals',
    creditsEarned: 'Optimizations earned',
    viewTerms: 'View Terms and Conditions',
  },

  seoGauge: {
    title: "Global SEO Score",
    subtitle: "Complete analysis of your online visibility",
    currentScore: "CURRENT SCORE",
    categories: "SEO Categories",
    excellentCount: "{{count}}/6 Excellent",
    priorityRecommendation: "Priority Recommendation",
    potentialImpact: "Potential impact:",
    points: "points",
    scoreLabels: {
      excellent: "Excellent",
      good: "Good",
      needsImprovement: "Needs Improvement"
    },
    categoryNames: {
      homepage: "Homepage",
      products: "Products",
      collections: "Collections",
      content: "Content",
      images: "Images",
      technical: "Technical"
    },
    categoryDescriptions: {
      homepage: "Title and description of your homepage",
      products: "Product page SEO",
      collections: "Collection pages",
      content: "Articles and pages",
      images: "Alt texts",
      technical: "Shopify configuration"
    },
    recommendations: {
      homepage: "Optimize your homepage title and description to attract more qualified visitors. A good homepage SEO can increase your traffic by 20-30%.",
      products: "Enrich your product pages with optimized titles and descriptions. Better product SEO directly increases conversion rates.",
      collections: "Optimize your collections for better ranking on category searches. Collection pages are key entry points.",
      content: "Create optimized content to attract organic traffic. Quality articles reinforce your topical authority.",
      images: "Add descriptive alt texts to all your images. Images can represent up to 20% of organic traffic.",
      technical: "Check your technical configuration and metadata. A good technical foundation is essential for SEO."
    }
  },

  seo: {
    title: "SEO Optimization",
    description: "Optimize your store for search engines with AI tools",
    clearCache: "Clear Cache",
    altImage: {
      homepage: "🏠 Homepage",
      loadError: "Error loading images",
      noEmptyAlt: "No images without ALT text selected",
      noSyncable: "No syncable images",
      homepageCannotSync: "Homepage images cannot be synced to Shopify",
      homepageIgnored: "{{count}} homepage image(s) ignored",
      onlyProducts: "Only product images will be synced",
      unknownContent: "Unknown content",
      noStoreConnected: "No store connected",
      imagesImported: "{{count}} images imported from Shopify",
      noNewImages: "No new images found",
      errorImport: "Error during import",
      errorLoading: "Error loading images",
      noSelection: "No image selected",
      limitReached: "Limit reached. Only {{count}} images will be optimized.",
      generatedWithErrors: "{{success}} ALT texts generated, {{errors}} errors. Some images have deleted products.",
      allHaveAlt: "All images already have ALT text",
      quotaReached: "Quota reached: {{used}}/{{max}} optimizations used",
      monthlyLimitReached: "Monthly optimization limit reached",
      quotaLimited: "Limited quota: {{remaining}}/{{total}} images will be optimized",
      upgradeForMore: "Upgrade to a paid plan to optimize remaining images",
      limitReachedThisMonth: "Limit reached: only {{remaining}}/{{total}} images will be optimized this month",
      optimizedWithRemaining: "{{success}} images optimized. {{remaining}} remaining images - Upgrade to a paid plan to continue",
      optimizedWaitingNext: "{{success}} images optimized this month. {{remaining}} images awaiting next cycle",
      stats: {
        toOptimize: "To Optimize",
        emptyAlt: "Empty ALT text",
        aiOptimized: "AI-Optimized",
        withAlt: "With ALT text",
        toSync: "To Synchronize",
        aiOptimizedOnly: "AI-optimized only",
        synchronized: "Synchronized",
        syncedToShopify: "Synced to Shopify",
        clickToView: "Click to view"
      },
      info: {
        emptyImages: "{{count}} images without ALT text",
        aiOptimizedImages: "{{count}} AI-optimized images",
        toSyncImages: "{{count}} images to synchronize",
        syncedImages: "{{count}} synchronized images"
      }
    },
    homepage: {
      title: "Homepage SEO",
      description: "Optimize your Shopify homepage for search engines",
      connectShopifyFirst: "Please connect your Shopify store first to use this feature",
      bannerDescription: "Optimize your Shopify homepage SEO. Create an unforgettable first impression and boost your conversion rate.",
      badges: {
        smartAI: "Smart AI",
        showcasePage: "Showcase page",
        instantSync: "Instant sync",
      },
      actions: {
        generateAI: "Generate with AI",
        generating: "Generating...",
        syncToShopify: "Sync to Shopify",
        syncing: "Synchronizing...",
      },
      alertDescription: "Optimize your homepage meta tags to improve search engine visibility",
      fields: {
        seoTitle: "SEO Title",
        titlePlaceholder: "Enter your homepage title...",
        seoDescription: "SEO Description",
        descriptionPlaceholder: "Enter your homepage description...",
        characters: "characters",
      },
      preview: {
        title: "Search Result Preview",
      },
      errors: {
        loadError: "Error loading SEO data",
        generateError: "Error during generation",
        fillAllFields: "Please fill in all fields",
        syncError: "Error during synchronization",
      },
      success: {
        generated: "SEO generated successfully",
        synced: "SEO synced successfully to Shopify",
      },
      altGuide: {
        title: "Guide: Edit Homepage ALT Texts",
        description: "Complete instructions to manually update ALT texts for your Shopify homepage",
        sections: {
          limitation: {
            title: "⚠️ Why this limitation?",
            description: "Your homepage images are integrated into your Shopify theme (banners, sliders, sections).",
            note: "💡 The Shopify API does not allow apps to modify these images. You must edit them manually in the Theme Editor.",
          },
          export: {
            title: "1️⃣ Export generated ALT texts",
            steps: [
              "Click the <strong>\"Export Homepage ALT\"</strong> button above",
              "The downloaded file contains: <ul class='list-disc pl-5 mt-2'><li>The URL of each image</li><li>The current ALT text</li><li>The new AI-optimized ALT text</li></ul>",
            ],
            csvHeaders: ["Image URL", "Current ALT", "New ALT", "Section"],
            csvExample: ["cdn.shopify.com/...", "banner", "Modern sofa...", "Hero"],
          },
          modify: {
            title: "2️⃣ Edit in Shopify Theme Editor",
            stepLabel: "Step",
            steps: [
              {
                title: "Access Theme Editor",
                instructions: [
                  "Go to <strong>Shopify Admin → Online Store → Themes</strong>",
                  "Click <strong>\"Customize\"</strong> on your active theme",
                ],
              },
              {
                title: "Locate your images",
                instructions: [
                  "Browse through your homepage sections (Hero, Banner, Gallery, etc.)",
                  "Identify images listed in the CSV file",
                ],
              },
              {
                title: "Update ALT texts",
                instructions: [
                  "For each image, click on it in the editor",
                  "Look for the <strong>\"Alt text\"</strong> or <strong>\"Alternative text\"</strong> field",
                  "Replace with the new ALT text from the CSV file",
                  "Repeat for all images",
                ],
              },
              {
                title: "Save",
                instructions: [
                  "Click <strong>\"Save\"</strong> at the top right of the Theme Editor",
                ],
              },
            ],
          },
          bestPractices: {
            title: "✅ SEO Best Practices",
            doTitle: "✅ DO:",
            doList: [
              "Use AI-generated ALT texts (SEO optimized)",
              "Be descriptive and precise (10-15 words ideally)",
              "Include relevant keywords naturally",
              "Describe what the image shows",
            ],
            dontTitle: "❌ DON'T:",
            dontList: [
              "Generic ALT texts (\"image\", \"photo\", \"banner\")",
              "Keyword stuffing",
              "Texts too long (>125 characters)",
              "Leave ALT texts empty",
            ],
          },
          rescan: {
            title: "3️⃣ Re-scan after modification",
            description: "Once your modifications are done in Shopify: <ul class='list-disc pl-5 mt-2'><li>Return to this page</li><li>Click <strong>\"Re-scan Homepage\"</strong></li><li>Verify that your SEO score improves ✅</li></ul>",
          },
        },
      },
    },
    articleLanding: {
      errors: {
        loadArticle: "Error loading article"
      },
      toasts: {
        linkCopied: "Link copied!"
      },
      loading: "Loading article...",
      notFound: "Article not found",
      backToArticles: "Back to articles",
      back: "Back",
      contents: "Contents",
      copied: "Copied!",
      share: "Share",
      tableOfContents: "Table of Contents",
      read: "read",
      keywords: "keywords",
      published: "Published",
      draft: "Draft",
      shareLabel: "Share:"
    },
    productSource: {
      errors: {
        loadProducts: "Error loading products",
        enrichProduct: "Error during enrichment",
        deleteProducts: "Error during deletion"
      },
      success: {
        dataExported: "Data exported successfully",
        productEnriched: "Product enriched successfully!",
        csvExported: "CSV export successful",
        productsDeleted: "{{count}} product(s) deleted"
      },
      info: {
        allEnriched: "All products are already enriched",
        noSelection: "No product selected",
        enriching: "Enriching {{count}} product(s)..."
      },
      title: "Product Source (Enriched Catalog)",
      subtitle: "All your products with complete AI data",
      actions: {
        enrichSelection: "Enrich selection ({{count}})",
        deleteSelection: "Delete selection ({{count}})",
        enrichAll: "Enrich all",
        enriching: "Enriching...",
        exportCSV: "Export CSV",
        exportJSON: "Export JSON",
        refresh: "Refresh"
      },
      stats: {
        totalProducts: "Total Products",
        enrichmentRate: "Enrichment Rate",
        averageQuality: "Average Quality",
        visionAIActive: "Vision AI Active"
      },
      filters: {
        selectAll: "Select all ({{selected}}/{{total}})",
        search: "Search a product...",
        allStatuses: "All statuses",
        enriched: "Enriched",
        pending: "Pending",
        error: "Error",
        allCategories: "All categories",
        displayed: "{{count}} product(s) displayed"
      }
    },
    chat: {
      greeting: "Hello! I'm your sales advisor. How can I help you today?",
      welcome: "Welcome! I'm ready to assist you.",
      onlineStatus: "Online • Ready to help",
      inputPlaceholder: "💬 Type your message here...",
      sendHint: "Press Enter to send • Shift+Enter for new line",
      errors: {
        sendMessage: "Error sending message",
        connection: "Connection error",
        network: "Unable to connect. Check your connection.",
        auth: "Authentication error. Please log in again.",
        config: "AI service not configured. Contact support.",
        search: "No products found. Try different terms.",
        generic: "An error occurred. Please try again."
      },
      fallback: "Sorry, I'm experiencing technical issues. Please try again.",
      title: "AI Smart Chat",
      subtitle: "Your intelligent sales advisor",
      productsAvailable: "{{count}} products available",
      poweredByAI: "Powered by AI",
      codeEmbed: "Embed Code",
      hide: "Hide",
      embedConfig: {
        title: "Chat Embed Configuration",
        subtitle: "Customize and integrate the chat on your store",
        copyCode: "Copy code",
        copied: "Copied!",
        position: "Widget position",
        positions: {
          bottomRight: "Bottom right",
          bottomLeft: "Bottom left",
          topRight: "Top right",
          topLeft: "Top left"
        },
        welcomeMessage: "Welcome message",
        integrationCode: "Shopify integration code",
        instructions: {
          title: "📝 Installation instructions:",
          step1: "Copy the code above",
          step2: "In Shopify, go to Online Store → Themes",
          step3: "Click Edit code",
          step4: "Open theme.liquid",
          step5: "Paste the code just before the </body> tag",
          step6: "Save"
        }
      },
      copiedToClipboard: "Code copied to clipboard!",
      you: "You",
      assistant: "Assistant",
      enrichmentWarning: {
        title: "Improve chat function by integrating your products",
        description: "Current enrichment: {{percentage}}%. Enrich your products for more accurate recommendations.",
        action: "Start enrichment"
      }
    },
    chatRobot: {
      title: "NewAI Robot",
      home: "Home",
      listeningEnabled: "🎤 Listening enabled",
      microphoneError: "Unable to access microphone",
      processingError: "Processing error",
      listeningInProgress: "Listening in progress...",
      greeting: "Hello, I am your robot assistant",
      subtitle: "Press the microphone to start speaking",
      you: "You",
      robot: "Robot",
      processing: "Processing..."
    },
    subscription: {
      title: "Subscription Plans",
      subtitle: "Choose the plan that fits your needs and scale at your own pace",
      success: "Payment successful! Your subscription is now active.",
      cancelled: "Payment cancelled. You can try again whenever you want.",
      currentPlan: "Current Plan",
      yourCurrentPlan: "Your current plan",
      monthlyOptimizations: "Optimizations/month",
      products: "Products",
      articlesPerMonth: "Articles/month",
      stores: "Stores",
      limitReachedMessage: "💡 You've reached the limits of your current plan. Choose a higher plan below to continue.",
      currentPlanBadge: "Current Plan",
      recommendedPlanBadge: "Recommended Plan",
      bestValueBadge: "Best Value",
      selectThisPlan: "Select This Plan",
      upgrade: "Upgrade",
      perMonth: "/month",
      optimizationsMonth: "optimizations/month",
      articlesMonth: "articles/month",
      chatResponsesMonth: "chat responses/month",
      shopifyStores: "Shopify store(s)",
      unlimitedProducts: "Unlimited products",
      detailedComparison: "Detailed Comparison",
      comparePlans: "Compare all plan features",
      proGrowth: "For growing stores",
      enterpriseLarge: "For large operations",
      errors: {
        loadPlans: "Error loading plans",
        createCheckout: "Error creating payment session"
      },
      plans: {
        starter: {
          name: "Starter",
          description: "For growing stores"
        },
        pro: {
          name: "Pro",
          description: "For growing stores"
        },
        enterprise: {
          name: "Enterprise",
          description: "For large operations",
          bestValue: "Best value"
        }
      }
    },
    tags: {
      loadError: "Failed to load products",
      showing: "Showing {{count}} products to optimize",
      allHaveTags: "All products already have tags",
      allOptimized: "All products are already optimized",
      noSelected: "No product selected",
      alreadyOptimized: "{{count}} product{{s}} {{have}} already been optimized",
      trialCanRegenerate: "With your current plan, you can still regenerate them",
      regenerate: "Regenerate",
      haveTags: "{{count}} product{{s}} {{have}} already tags",
      wantRegenerate: "Do you want to regenerate them?",
      limitReached: "Limit reached. Only {{count}} product{{s}} will be optimized.",
      noToSync: "No products to synchronize",
      allSynced: "All products are synchronized",
      filters: {
        all: "All Products",
        toOptimize: "Not Optimized",
        optimized: "Optimized",
        toSync: "To Synchronize",
        synced: "Synchronized"
      }
    },
    banners: {
      pages: {
        title: "Pages SEO Management",
        description: "Optimize your Shopify pages with AI-powered SEO. Improve meta tags and boost your search rankings.",
        seoOptimized: "SEO Optimized",
        betterRankings: "Better Rankings",
        aiEnhanced: "AI Enhanced",
        seoScore: "SEO Score",
        optimizeBtn: "Optimize Pages"
      },
      articles: {
        title: "Articles SEO Management",
        description: "Optimize your blog articles with AI-powered SEO. Improve titles, meta descriptions, and boost your organic traffic by 40%.",
        seoOptimized: "SEO Optimized",
        trafficBoost: "+40% Traffic",
        aiEnhanced: "AI Enhanced",
        seoScore: "SEO Score",
        optimizeBtn: "Optimize Articles"
      }
    },
    submenu: {
      products: "Products",
      collections: "Collections",
      pages: "Pages",
      articles: "Articles",
      altimage: "ALT Image",
      homepage: "Homepage",
      tags: "Tags",
      kpisStats: "KPIs & Stats",
      automation: "Automation",
      auditSeo: "SEO Audit",
    },
    audit: {
      title: "Complete SEO Audit",
      description: "Get detailed analysis of your store's SEO performance",
      generateAudit: "Launch Audit",
      relaunchAudit: "Relaunch Audit",
      analyzing: "Analyzing...",
      lastAudit: "Last audit",
      
      subtabs: {
        overview: "Overview",
        homepage: "Homepage",
        issues: "Issues",
        actions: "Action Plan",
        reports: "Reports",
      },
      
      quickAccess: {
        title: "Quick Access",
        homepage: "Homepage",
        homepageDesc: "Homepage SEO analysis",
        issues: "Issues",
        issuesDesc: "{{count}} detected issues",
        actions: "Action Plan",
        actionsDesc: "{{count}} recommended actions",
      },
      
      noAudit: {
        title: "No audit yet",
        description: "Launch your first comprehensive SEO audit to identify optimization opportunities",
        benefits: {
          title: "What will you get?",
          comprehensive: "Comprehensive Analysis",
          comprehensiveDesc: "Complete evaluation of your store's SEO",
          opportunities: "Optimization Opportunities",
          opportunitiesDesc: "Concrete recommendations to improve your ranking",
          actionPlan: "Action Plan",
          actionPlanDesc: "Prioritized steps for maximum impact",
        },
        cta: "Ready to optimize your SEO?",
        ctaDesc: "Launch your first audit now",
      },
      
      overview: {
        title: "Audit Overview",
        globalScore: "Global SEO Score",
        categoryScores: "Category Scores",
        viewDetails: "View Details",
      },
      
      categories: {
        homepage: "Homepage",
        products: "Products",
        collections: "Collections",
        content: "Content",
        images: "Images",
        technical: "Technical",
      },
      
      score: {
        excellent: "Excellent",
        good: "Good",
        fair: "Fair",
        poor: "Poor",
        outOf: "out of",
      },
      
      issues: {
        title: "Detected Issues",
        category: "Category",
        priority: "Priority",
        issue: "Issue",
        impact: "Impact",
        action: "Action",
        fix: "Fix",
        high: "High",
        medium: "Medium",
        low: "Low",
      },
      
      actions: {
        title: "Action Plan",
        step: "Step",
        priority: "Priority",
        actions: "Actions",
        ready: "Ready to optimize automatically?",
        automate: "Automate Optimization",
      },
    },
    optimization: {
      title: "SEO Optimization",
      subtitle: "Generate optimized titles and descriptions automatically to improve your SEO and increase conversions by 40%.",
      smartSeo: "Smart SEO",
      visibility: "+40% visibility",
      fastGeneration: "Fast generation",
      globalScore: "Global SEO Score",
      notOptimized: "non-optimized",
      aiOptimized: "AI-optimized",
      optimized: "optimized",
      startOptimization: "Start Optimization",
      visionAI: {
        badge: "Optimized by Vision AI (Image Analysis)",
        description: "AI analyzes your images",
        features: "colors, materials, styles",
        fullDescription: "to automatically generate optimized SEO descriptions. Detect colors, materials, styles and enrich your content to maximize your visibility on Google."
      },
      notAiOptimized: "Not AI-Optimized",
      aiOptimizedLabel: "AI-Optimized",
      toSynchronize: "To Synchronize",
      synchronized: "Synchronized",
      allCategories: "All Categories",
      allStatus: "All Status",
      allSync: "All Sync",
      allQualities: "All Qualities",
      optimizeSelected: "Optimize Selected ({{count}})",
      optimizeAll: "Optimize All",
      syncSelection: "Sync Selection ({{count}})",
      syncAll: "Sync All ({{count}})",
      allProducts: "All Products",
      toOptimize: "To Optimize",
      optimizedTab: "Optimized",
      toSynchronizeTab: "To Synchronize",
      synchronizedTab: "Synchronized",
      image: "Image",
      seoTitle: "SEO Title",
      seoDescription: "SEO Description",
      seoScore: "SEO Score",
      status: "Status",
      synced: "Synced",
      actions: "Actions",
      alreadyOptimized: "Selected products are already optimized",
      noProductsSelected: "No products selected",
      empty: "Empty",
      existing: "Existing",
      clickToView: "Click to view",
      generatedByAI: "Generated by AI",
      aiOptimizedOnly: "AI-optimized only",
      aiOptimizedSynced: "AI-optimized synced",
      searchPlaceholder: "Search products by title...",
      filters: "Filters",
      list: "List",
      grid: "Grid",
      syncStatus: "Sync Status",
      seoQuality: "SEO Quality",
      excellent: "Excellent (≥80)",
      good: "Good (60-79)",
      medium: "Medium (40-59)",
      poor: "Poor (<40)",
      notOptimizedBadge: "Not optimized",
      pending: "Pending",
      yes: "Yes",
      no: "No",
      optimize: "Optimize",
      viewSync: "View & Sync",
      view: "View",
      productOptimized: "Product optimized!",
      generatingSeo: "Generating SEO...",
      synchronizing: "Synchronizing...",
      initialScore: "Initial score",
      excellentEmoji: "✅ Excellent",
      goodEmoji: "👍 Good",
      toImprove: "⚠️ To improve",
      syncCompleted: "Synchronization completed!",
      productsSynced: "{{count}} product(s) successfully synced with Shopify",
      showingToOptimize: "Showing {{count}} products to optimize",
      showingOptimized: "Showing {{count}} optimized products",
      showingSynchronized: "Showing {{count}} synchronized products",
      showingToSynchronize: "Showing {{count}} products to synchronize",
      allProductsOptimized: "All products are already optimized",
      optimizationError: "Error during optimization",
      loadError: "Failed to load products",
      trialLimitReached: "Current plan limit reached for SEO optimizations",
      someAlreadyOptimized: "Some products have already been optimized this month with your current plan.",
      noOptimizedProductsSelected: "No optimized products selected for sync",
      allOptimizedSynced: "All optimized products are already synced",
      noProductsToSynchronize: "No products to synchronize"
    },
    googleSearchConsole: {
      title: "Google Search Console",
      description: "Connect your Google Search Console account",
      connect: "Connect",
      disconnect: "Disconnect",
      connected: "Connected",
      notConnected: "Not Connected",
      connectWithGoogle: "Connect with Google",
    },
    pages: {
      title: "Pages SEO",
      subtitle: "Intelligent AI Optimization",
      description: "Transform your Shopify pages into SEO conversion machines. AI generates optimized meta titles and descriptions to maximize your visibility.",
      hero: {
        seoAutomated: "SEO Automated",
        completePages: "Complete Pages",
        shopifySync: "Shopify Sync",
        globalScore: "Global SEO Score",
        optimizeAll: "Optimize All",
        optimizing: "Optimizing...",
      },
      stats: {
        toOptimize: "To Optimize",
        emptyOrShopify: "Empty or Shopify",
        aiOptimized: "AI-Optimized",
        generatedByAI: "Generated by AI",
        synchronized: "Synchronized",
        withShopify: "With Shopify",
        toSync: "To Sync",
        aiOptimizedReady: "AI-optimized ready",
        allPages: "All Pages",
        totalPages: "Total pages",
        clickToView: "Click to view",
      },
      filters: {
        searchPlaceholder: "Search pages...",
        status: "Status",
        allStatus: "All Status",
        optimized: "Optimized",
        notOptimized: "Not Optimized",
        syncStatus: "Sync Status",
        allSync: "All Sync",
        synced: "Synced",
        notSynced: "Not Synced",
        quality: "SEO Quality",
        allQuality: "All Quality",
        excellent: "Excellent (≥80)",
        good: "Good (60-79)",
        medium: "Medium (40-59)",
        poor: "Poor (<40)",
      },
      actions: {
        importPages: "Import Pages",
        importing: "Importing...",
        optimizeSelected: "Optimize Selected ({{count}})",
        optimizeAll: "Optimize All",
        syncSelected: "Sync Selected ({{count}})",
        syncAll: "Sync All",
        refresh: "Refresh",
      },
      table: {
        selectAll: "Select all",
        page: "Page",
        seoTitle: "SEO Title",
        seoDescription: "SEO Description",
        status: "Status",
        syncStatus: "Sync",
        score: "Score",
        actions: "Actions",
        optimized: "Optimized",
        notOptimized: "Not Optimized",
        synced: "Synced",
        notSynced: "Not Synced",
        optimize: "Optimize",
        sync: "Sync",
        reoptimize: "Re-optimize",
      },
      messages: {
        userNotConnected: "User not connected",
        errorLoading: "Error loading pages",
        noShopifyStore: "No Shopify store connected",
        importingFrom: "Importing pages from {{storeName}}...",
        importError: "Error: {{message}}",
        permissionWarning: "{{message}}",
        pagesImported: "✅ {{count}} pages imported",
        totalImported: "🎉 {{count}} pages imported in total!",
        errorImporting: "Error importing pages",
        pageOptimized: "Page {{current}}/{{total}} optimized",
        errorOptimizingPage: "Error for page {{current}}",
        allPagesOptimized: "🎉 All pages optimized!",
        pagesOptimizedCount: "{{success}}/{{total}} pages optimized",
        allAlreadyOptimized: "All pages are already optimized",
        noOptimizedToSync: "No optimized pages to sync",
        pagesSynchronized: "{{success}}/{{total}} pages synchronized!",
        pageOptimizedSuccess: "Page optimized!",
        pageSynchronized: "Page synchronized!",
        error: "Error",
        noPages: "No pages",
        noPagesDescription: "Import your pages from Shopify to get started.",
      },
      empty: {
        title: "No pages found",
        description: "Import your Shopify pages to optimize their SEO content.",
      },
    },
  },

  blog: {
    title: "SEO AI Blog",
    description: "Create optimized articles with AI",
    submenu: {
      articles: "Article Management",
      articlesDesc: "List of your articles",
      aiArticles: "AI Articles",
      aiArticlesDesc: "Create an article with AI",
      campaigns: "AI Campaigns",
      campaignsDesc: "Scheduled automation",
      opportunities: "Opportunities",
      netlinking: "Netlinking",
      settings: "Settings",
      opportunitiesDesc: "Content ideas",
      netlinkingDesc: "Link management",
      settingsDesc: "Configuration",
    },
    createNew: "Create New Article",
    startCreating: "Start Creating",
    newCampaign: "New Campaign",
    createLinkingArticle: "Create Linking Article",
    configure: "Configure",
    management: {
      tabs: {
        all: "All",
        draft: "Draft",
        published: "Published",
        shopifySynced: "Synced"
      },
      status: {
        optimized: "Optimized",
        notOptimized: "Not Optimized",
        all: "All Status"
      },
      sync: {
        synced: "Synced",
        notSynced: "Not Synced",
        all: "All Sync"
      },
      quality: {
        all: "All Quality",
        excellent: "Excellent",
        good: "Good",
        medium: "Medium",
        poor: "Poor"
      },
      score: {
        excellent: "Excellent",
        good: "Good",
        medium: "Medium",
        poor: "Poor"
      },
      actions: {
        optimizeSelected: "Optimize Selected",
        syncToShopify: "Sync to Shopify",
        importArticles: "Import Articles",
        selectAll: "Select All",
        refresh: "Refresh",
        generateImage: "Generate Image",
        optimize: "Optimize"
      },
      messages: {
        optimizationSuccess: "Article optimized!",
        optimizationError: "Error during optimization",
        syncSuccess: "Article published to Shopify",
        syncError: "Sync error",
        importSuccess: "✅ {{totalArticles}} articles and {{totalImages}} images imported",
        importError: "Failed to import articles",
        noneSelected: "Select at least one article",
        loadError: "Failed to load articles",
        errorLoading: "Error loading data",
        importing: "Importing articles from Shopify...",
        optimizing: "Optimizing SEO for {{count}} article(s)...",
        generating: "Generating article...",
        generationSuccess: "Article generated successfully!",
        generationError: "Error during generation",
        syncing: "Syncing with Shopify..."
      },
      viewMode: {
        grid: "Grid",
        list: "List"
      },
      filters: {
        search: "Search articles...",
        status: "Status",
        sync: "Sync",
        quality: "Quality"
      },
      table: {
        title: "Title",
        seoScore: "SEO Score",
        status: "Status",
        actions: "Actions"
      },
      globalScore: {
        title: "Global Article SEO Score",
        subtitle: "Average SEO score of all articles",
        articles: "articles",
        article: "article"
      }
    },
    hero: {
      articles: {
        description: "View, edit, and manage all your blog articles. Track their status and publish them to your Shopify store.",
        count: "Articles",
        seoReady: "SEO Ready"
      }
    },
    dialogs: {
      featuredImage: {
        title: "Add Cover Image",
        generating: "Generating...",
        success: "Image generated successfully",
        noUrl: "No image URL received",
        errorGenerate: "Error generating image",
        enterUrl: "Please enter an image URL",
        invalidUrl: "Invalid image URL. Use a direct URL to an image (JPG, PNG, WebP, GIF, SVG, BMP)",
        errorUpdate: "Error updating image",
        imageSaved: "Image saved but article not updated",
        altGenerated: "✨ ALT generated and synced with Shopify!",
        altOptimized: "✨ Optimized ALT generated successfully!",
        errorOptimize: "Error during optimization"
      },
      opportunities: {
        errorLoading: "Error loading initial opportunities",
        errorApi: "API Error: {{message}}",
        invalidResponse: "Invalid API response format",
        errorDatabase: "Database error: {{message}}",
        noProducts: "No products found. Import products to generate opportunities.",
        detected: "✅ {{count}} opportunities detected",
        errorAnalysis: "Error analyzing catalog: {{message}}",
        generating: "Generating article...",
        generated: 'Article "{{title}}" generated successfully!',
        errorGenerate: "Error generating article",
        analyzing: "Analyzing catalog...",
        patience: "Patience, this can take up to 30 seconds"
      },
      netlinking: {
        errorLoading: "Error loading",
        extracted: "✅ {{count}} links extracted from {{articles}} article(s)",
        errorAnalysis: "Error analyzing articles",
        csvExported: "CSV export downloaded!",
        analyzing: "Analysis in progress...",
        analyzeAll: "Analyze all articles",
        loading: "Loading...",
        noLinks: "No links detected",
        autoDetect: "Links will be automatically detected when generating articles"
      },
      replaceLink: {
        title: "Replace broken link",
        description: "Replace the broken URL with a working one",
        oldUrl: "Old URL (broken)",
        anchorText: "Anchor text",
        newUrl: "New URL",
        verify: "Verify",
        updateAll: "Update all identical links in all articles",
        cancel: "Cancel",
        replace: "Replace link",
        toasts: {
          enterUrl: "Please enter a URL",
          verified: "URL verified successfully",
          urlAccessible: "URL seems accessible",
          replaced: "Link replaced successfully",
          error: "Error replacing link"
        }
      }
    }
  },

  products: {
    title: "Products",
    stats: "{{count}} product(s) • {{value}} €",
    importProducts: "Import Products",
    searchPlaceholder: "Search products...",
    slotsAvailable: "{{slots}} slots available",
    loadError: "Error loading products",
    filters: {
      all: "All",
      active: "Active",
      draft: "Draft",
      sortBy: "Sort",
      recent: "Recent",
      nameAsc: "A-Z",
      nameDesc: "Z-A",
      priceLow: "Price: Low to High",
      priceHigh: "Price: High to Low",
    },
    empty: {
      title: "No products",
      description: "Import your products from Shopify to get started",
      addProduct: "Add Product",
    },
    noResults: "No products match your search criteria",
    noVendor: "No vendor",
    stock: "Stock: {{count}}",
    noDescription: "No description",
  },

  collections: {
    title: "Collections",
    subtitle: "Manage your product collections",
    searchPlaceholder: "Search collections...",
    noCollections: "No collections found",
    empty: {
      title: "No collections",
      description: "Use the 'Import All' button in the Integration tab to import your collections from Shopify",
    },
    optimizeSeo: "Optimize SEO",
    syncToShopify: "Sync to Shopify",
    imageAlt: "Collection image",
    stats: {
      collections: "Collections",
      totalImages: "Total Images",
      products: "Products",
    },
    actions: {
      refresh: "Refresh",
      viewGrid: "Grid View",
      viewList: "List View",
    },
    card: {
      products: "products",
      images: "images",
      handle: "Handle",
    },
    import: {
      importing: "Importing collections...",
      notAuthenticated: "Not authenticated",
      noActiveConnection: "No active Shopify connection",
      imagesImported: "✅ {{count}} collection images imported",
      importError: "Error during import",
      importingArticles: "Importing articles...",
      importingArticlesInProgress: "Article import in progress...",
      importingArticleImages: "Importing article images...",
      articlesAndImagesImported: "✅ {{totalArticles}} articles and {{totalImages}} images imported",
      fullImportInProgress: "Full import in progress...",
      step1: "1/3 - Importing collections...",
      step2: "2/3 - Importing articles...",
      step3: "3/3 - Importing pages...",
      noContentFound: "No content found on Shopify",
      fullImportComplete: "✅ Full import: {{parts}}",
    },
    loading: "Loading collections...",
    loadError: "Error loading collections",
    importComplete: "Import Complete",
    importCollections: "Import Collections",
    importImages: "Import Collections + Images",
    importing: "Importing...",
    optimizing: "Optimizing...",
    syncing: "Syncing...",
    optimization: {
      title: "Collection Optimization",
      description: "Optimize your Shopify collections with AI. Generate titles, SEO descriptions and images with Vision AI",
      optimizeAll: "Optimize All",
      optimizeSelected: "Optimize Selected",
      globalScore: "Global SEO Score",
      scoreWeighting: "(50% Title + 30% Description + 20% Image)",
      optimized: "optimized",
      table: {
        image: "Image",
        title: "Title",
        products: "Products",
        description: "Description",
        seoTitle: "SEO Title",
        seoDescription: "SEO Description",
        seoScore: "SEO Score",
        status: "Status",
        synced: "Synced",
        actions: "Actions"
      },
      features: {
        intelligent: "Intelligent SEO",
        visibility: "+40% visibility",
        fast: "Fast generation",
      },
      tabs: {
        all: "All Collections",
        optimized: "Optimized",
        notOptimized: "Not Optimized",
      },
      messages: {
        optimizationSuccess: "{{count}} collections optimized",
        optimizationError: "Error during optimization",
        syncSuccess: "{{count}} collections synced",
        syncError: "Error during synchronization",
        collectionsToOptimize: "{{count}} collections to optimize",
        collectionsOptimized: "{{success}}/{{total}} collections optimized!",
        allOptimized: "All collections are already optimized",
        trialLimitReached: "Trial limit reached. Upgrade to continue.",
        noneSelected: "No collections selected",
        invalidIds: "Invalid collection IDs",
        optimizationFailed: "Optimization failed",
        alreadyOptimizedTrial: "This collection is already optimized (trial limit reached)",
        monthlyLimitReached: "Monthly limit reached. Upgrade to continue.",
      },
      actions: {
        optimizeAll: "Optimize All",
        syncAll: "Sync All",
        syncToShopify: "Sync to Shopify",
        refresh: "Refresh",
      },
    },
    viewMode: {
      grid: "Grid View",
      list: "List View",
    },
  },

  chat: {
    title: "AI Assistant",
    history: "Chat History",
    settings: "Chat Settings",
    newChat: "New Chat",
    placeholder: "Ask me anything...",
    send: "Send",
    thinking: "Thinking...",
    noHistory: "No chat history",
    deleteSession: "Delete Session",
    submenu: {
      assistant: "Chat Assistant",
      robot: "AI Robot",
      orders: "Orders",
      learning: "Learning",
      history: "History",
      productSource: "Product Source",
      settings: "Chat Settings",
    },
    robot: {
      title: "Voice Assistant",
      startListening: "Start Listening",
      stopListening: "Stop Listening",
      speaking: "Speaking...",
    },
    ordersManagement: {
      title: "Orders Management",
      description: "Track and manage your Shopify orders",
      comingSoon: "Coming Soon",
      comingSoonDesc: "Order management will be available soon"
    },
    knowledgeBase: {
      title: "Knowledge Base",
      description: "Enrich your assistant's responses with your information",
      add: "Add",
      edit: "Edit question",
      new: "New question",
      dialogDescription: "Add information that the assistant will use to respond",
      category: "Category",
      question: "Question",
      questionPlaceholder: "What is the question?",
      answer: "Answer",
      answerPlaceholder: "The detailed answer...",
      keywords: "Keywords (comma separated)",
      keywordsPlaceholder: "delivery, time, shipping",
      update: "Update",
      cancel: "Cancel",
      questionsCount: "{{count}} question(s) in this category",
      noQuestions: "No questions in this category",
      confirmDelete: "Are you sure you want to delete this question?",
      deleted: "Question deleted",
      updated: "Question updated successfully",
      added: "Question added successfully",
      errorLoad: "Unable to load knowledge base",
      errorSave: "Unable to save",
      errorDelete: "Unable to delete",
      errorTest: "Unable to test",
      userNotConnected: "User not connected",
      categories: {
        delivery: "🚚 Delivery",
        return: "🔄 Returns",
        pickup: "📦 Pickup Points",
        payment: "💳 Payment",
        support: "📱 Support",
        general: "ℹ️ General"
      },
      suggested: "Suggested questions",
      testChat: "Test chat",
      testPlaceholder: "Ask a question to test the base...",
      test: "Test",
      assistantResponse: "Assistant response:",
      noResponse: "No response",
      templates: {
        deliveryTime: "What are the delivery times?",
        deliveryTimeAnswer: "Standard delivery times are 3 to 5 business days.",
        deliveryZones: "What are the delivery zones?",
        deliveryZonesAnswer: "We deliver to mainland France, Corsica and throughout Europe.",
        returnPolicy: "What is the return policy?",
        returnPolicyAnswer: "You have 14 days to return an unused item.",
        pickupLocation: "Where can I pick up my order?",
        pickupLocationAnswer: "In-store pickup is available at our retail locations.",
        paymentMethods: "What payment methods do you accept?",
        paymentMethodsAnswer: "We accept credit cards, Visa, Mastercard, PayPal and bank transfer.",
        contactSupport: "How to contact you?",
        contactSupportAnswer: "You can contact us by email or phone from Monday to Friday."
      }
    },
    settingsPage: {
      title: "Chat Settings",
      description: "Configure your AI assistant's style and behavior",
      assistantName: {
        title: "Assistant name",
        description: "Customize your sales advisor's name",
        label: "Assistant name",
        placeholder: "Nicolas",
        hint: "This name will be displayed in the chat and used in conversations"
      },
      assistantStyle: {
        title: "Assistant style",
        description: "Choose your assistant's personality"
      },
      responseSettings: {
        title: "Response settings",
        description: "Customize tone and length"
      },
      save: "Save settings",
      saved: "Settings saved successfully!",
      error: "Error saving settings"
    }
  },

  auth: {
    login: "Login",
    signup: "Sign Up",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    resetPassword: "Reset Password",
    updatePassword: "Update Password",
    sendResetLink: "Send Reset Link",
    backToLogin: "Back to Login",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    resetLinkSent: "Reset link sent to your email",
    passwordUpdated: "Password updated successfully",
    loginError: "Login failed",
    signupError: "Sign up failed",
    invalidEmail: "Invalid email address",
    passwordTooShort: "Password must be at least 6 characters",
    signInWithGoogle: "Sign in with Google",
    signUpWithGoogle: "Sign up with Google",
    continueWithGoogle: "Continue with Google",
  },

  onboarding: {
    title: "Choose your NewAI plan",
    subtitle: "Choose the plan that fits your needs • Immediate access to all features",
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Save {{percent}}%",
    perMonth: "/month",
    perYear: "/year",
    mostPopular: "Most Popular",
    selectPlan: "Select Plan",
    startTrial: "Start Free Trial",
    features: "Features",
    allFeatures: "All Features",
    billing: {
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save up to 20%"
    },
    trial: {
      available: "💳 Free trial available on Starter plan",
      freeTrial: "🎁 {{days}} days free trial",
      startTrial: "Start free trial",
      cardRequired: "💳 Card required • First payment on {{date}}"
    },
    verification: {
      title: "Verifying your subscription",
      checking: "We're verifying your payment with Stripe...",
      verifyNow: "Verify now",
      success: "Subscription verified successfully!",
      activated: "Your subscription has been activated successfully!"
    },
    errors: {
      loadingPlans: "Error loading plans",
      mustBeConnected: "You must be logged in",
      noActiveSubscription: "No active subscription found. Please contact support.",
      paymentError: "Error creating payment"
    },
    planFeatures: {
      unlimited: "Unlimited",
      products: "products",
      optimizations: "optimizations/month",
      articles: "articles/month",
      campaigns: "campaigns",
      chatResponses: "chat responses/month",
      subscribe: "Subscribe now",
      perMonth: "/month",
      mostPopular: "Most Popular",
      bestValue: "Best Value",
      forGrowth: "For growing stores",
      forEnterprise: "For large stores and agencies",
      chooseTier: "Choose a tier"
    },
    infoFooter: {
      starterOnly: "✨ Starter Plan only: 14 days free trial with reduced limits",
      cardRequired: "💳 Credit card required • Cancel anytime during trial at no cost",
      proEnterprise: "💡 Pro and Enterprise plans: immediate payment, no free trial",
      cancelAnytime: "🔒 Cancel anytime before the end of the trial"
    }
  },

  merchant: {
    title: "Google Merchant Center",
    description: "Manage your feed and synchronize your products",
    syncFeed: "Sync Feed",
    downloadFeed: "Download Feed",
    feedUrl: "Feed URL",
    lastSync: "Last Sync",
    totalProducts: "Total Products",
    status: "Status",
    openMerchantCenter: "Open Merchant Center",
    submenu: {
      feed: "XML Feed",
      settings: "Settings",
      products: "Products",
      sync: "Synchronization",
    },
    tabs: {
      feed: {
        description: "Manage your Google Shopping XML feed",
      },
      settings: {
        description: "Configure your store and feed settings",
      },
      sync: {
        description: "Synchronize with Shopify",
      },
    },
    feed: {
      products: "products",
      inDatabase: "in database",
      optimizationScore: "Optimization Score",
      optimizationDetails: "{{optimized}} products out of {{total}} optimized (Category + GTIN + White Background)",
      noProducts: "No products to optimize",
      statusTitle: "Feed Status",
      lastTest: "Last Test",
      detectedProducts: "Detected Products",
      format: "Format",
      formatValue: "XML Google Shopping",
      enrichment: {
        title: "Enrich your Google Shopping data",
        description: "Optimize your products with Google categories, GTIN, and AI white background to create an optimized feed and increase your visibility.",
        action: "Optimize now"
      },
      url: {
        title: "XML Feed URL",
        description: "Copy this URL for Google Merchant Center",
        label: "Your Google Shopping feed URL",
        copy: "Copy",
        copied: "Copied!",
        preview: "Preview feed",
        note: {
          title: "Note:",
          description: "This newai.sale URL will work after publication. In preview, the test uses the direct Supabase URL."
        }
      },
      actions: {
        optimizeAll: "Optimize All",
        testFeed: "Test Feed",
        regenerate: "Regenerate XML",
        downloadXML: "Download XML",
        exportCSV: "Export CSV"
      },
      status: {
        operational: "Operational",
        error: "Error",
        testing: "Testing",
        notTested: "Not Tested",
        never: "Never",
        generating: "Generating CSV file..."
      },
      success: {
        regenerated: "XML feed regenerated successfully! 🎉",
        exported: "{{count}} products exported to CSV! 📊"
      },
      errors: {
        invalidFormat: "Invalid XML format",
        unknown: "Unknown error",
        regenerateFailed: "Error regenerating feed",
        noProducts: "No products to export",
        exportFailed: "Error exporting CSV"
      },
      csv: {
        headers: {
          id: "ID",
          title: "Title",
          description: "Description",
          price: "Price",
          url: "URL",
          imageUrl: "Image URL",
          availability: "Availability",
          brand: "Brand",
          category: "Google Category",
          gtin: "GTIN",
          mpn: "MPN",
          condition: "Condition",
          whiteBackground: "AI White Background"
        },
        inStock: "in stock",
        outOfStock: "out of stock",
        yes: "Yes",
        no: "No"
      },
      info: {
        format: {
          title: "Format",
          description: "XML Google Shopping Feed compliant with official specifications"
        },
        update: {
          title: "Update",
          description: "Feed updated automatically in real-time"
        },
        schedule: {
          title: "Schedule",
          description: "Automatic daily synchronization"
        }
      }
    },
    settings: {
      title: "Google Shopping Feed Configuration",
      description: "Configure your XML feed settings for Google Merchant Center",
      storeName: "Store name",
      storeNameHint: "Used in your feed URL",
      storeNameDesc: "The store name can be used as an alternative identifier in your feed",
      storeNamePlaceholder: "my-store",
      autoUpdate: "Automatic update",
      autoUpdateDesc: "Automatically sync the feed with your changes",
      generateGtin: "Automatically generate GTIN",
      generateGtinDesc: "Include GTIN codes in the Google Shopping XML feed",
      gtinFormat: "GTIN Format",
      gtinCountryHint: "Main country of sale",
      defaultCurrency: "Default currency",
      defaultCondition: "Default condition",
      defaultBrand: "Default brand",
      defaultBrandPlaceholder: "Your main brand",
      defaultBrandHint: "Used for products without a specified brand",
      collectionFiltering: "Collection filtering",
      filterMode: "Filter mode",
      collectionsToInclude: "Collections to include",
      collectionsToExclude: "Collections to exclude",
      noCollections: "No collections available",
      collectionsSelected: "{{count}} collection(s) selected",
      save: "Save settings",
      saved: "Settings saved successfully! 🎉",
      errorSave: "Error saving settings",
      errorLoad: "Error loading settings",
      testFeed: "Test feed",
      feedTested: "XML feed tested successfully! ✅",
      errorTest: "Error testing feed",
      userNotConnected: "User not connected",
      invalidXml: "Invalid XML format",
      filterModes: {
        all: "All collections",
        include: "Include only certain collections",
        exclude: "Exclude certain collections"
      },
      conditions: {
        new: "New",
        refurbished: "Refurbished",
        used: "Used"
      },
      validation: {
        storeNameRequired: "Store name is required",
        storeNameFormat: "Store name must contain only lowercase letters, numbers and hyphens",
        storeNameTooShort: "Store name must be at least 3 characters",
        storeNameTooLong: "Store name cannot exceed 50 characters"
      },
      statusBadges: {
        operational: "✓ Operational",
        error: "✗ Error",
        untested: "⏳ Not tested"
      }
    }
  },

  shopping: {
    title: "Google Shopping",
    description: "Manage your Google Shopping campaigns",
    variants: "Product Variants",
    feed: "Shopping Feed",
    optimize: "Optimize for Google",
    syncAll: "Sync All Products",
  },

  notificationSettings: {
    title: "Notification Settings",
    emailNotifications: "Email Notifications",
    pushNotifications: "Push Notifications",
    seoUpdates: "SEO Updates",
    productAlerts: "Product Alerts",
    blogPublished: "Blog Published",
    weeklyReport: "Weekly Report",
    saveSettings: "Save Settings",
  },

  admin: {
    title: "Admin Dashboard",
    subtitle: "User and subscription management",
    users: "Users",
    plans: "Subscription Plans",
    analytics: "Analytics",
    settings: "Settings",
    totalUsers: "Total Users",
    activeSubscriptions: "Active Subscriptions",
    revenue: "Revenue",
    stats: {
      freeTrials: "Free Trials",
      noSubscription: "No Subscription",
    },
    table: {
      user: "User",
      currentPlan: "Current Plan",
      signupDate: "Signup Date",
      subscriptionStatus: "Subscription Status",
      actions: "Actions",
    },
    status: {
      active: "Active",
      trial: "Trial",
      cancelled: "Cancelled",
      none: "None",
    },
    errors: {
      loadData: "Error loading data",
      updatePlan: "Error updating plan",
      updateStatus: "Error updating status"
    },
    success: {
      planUpdated: "Plan updated successfully",
      statusUpdated: "Status updated successfully"
    }
  },

  articles: {
    title: "Article Management",
    createNew: "Create New Article",
    draft: "Draft",
    published: "Published",
    scheduled: "Scheduled",
    edit: "Edit Article",
    delete: "Delete Article",
    publish: "Publish",
    schedule: "Schedule",
    preview: "Preview",
    seoScore: "SEO Score",
    wordCount: "{{count}} words",
    noArticles: "No articles yet",
    landing: {
      title: "Article Landing Page",
      preview: "Preview Landing Page",
      edit: "Edit Landing Page",
    },
  },

  productDetail: {
    title: "Product Details",
    backToProducts: "Back to Products",
    optimizeSeo: "Optimize SEO",
    editProduct: "Edit Product",
    variants: "Variants",
    images: "Images",
    description: "Description",
    price: "Price",
    stock: "Stock",
    vendor: "Vendor",
    tags: "Tags",
    collections: "Collections",
    seoTitle: "SEO Title",
    seoDescription: "SEO Description",
  },

  integration: {
    title: "Shopify Integrations",
    description: "Connect and manage your Shopify stores",
    tabs: {
      connections: "Connections",
      sync: "Synchronization",
      metadata: "Metadata",
    },
    installGuide: {
      title: "Connect your Shopify store",
      subtitle: "One last step before enjoying NewAI to optimize your SEO",
      storeDetected: "Store detected",
      autoFilled: "Your information will be automatically pre-filled",
      step1: {
        title: "Authenticate",
        description: "Create an account or log in within 30 seconds"
      },
      step2: {
        title: "Automatic redirection",
        description: "You will be redirected to your store connection"
      },
      step3: {
        title: "One-click connection",
        description: "Simply validate the pre-filled information"
      },
      createAccount: "Create a free account",
      alreadyHaveAccount: "I already have an account",
      secureConnection: "🔒 Secure connection • ⚡ 2-minute setup • 🎯 Store automatically detected"
    },
    sync: {
      mode: {
        title: "Sync mode",
        description: "Choose how to manage AI-optimized content",
        smart: {
          title: "Smart (Recommended)",
          description: "Protects AI-optimized content. ONLY replaces non-optimized content. Ideal for preserving your SEO optimizations while retrieving new data.",
        },
        full: {
          title: "Full",
          description: "Overwrites ALL content with Shopify data. ⚠️ You will lose all AI optimizations (titles, descriptions, ALT texts). Only use if you want a complete reset.",
        },
      },
      contentTypes: {
        title: "Content types to sync",
        products: "Products",
        collections: "Collections",
        pages: "Pages",
        articles: "Articles",
        images: "Images",
      },
      schedule: {
        title: "Sync schedule",
        hour: "Sync time (24h)",
        day: "Day of week",
        dayOfMonth: "Day of month (1-31)",
        timezone: "Timezone",
        nextSync: "Next sync",
        planned: "Scheduled for",
      },
      daysOfWeek: {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",
      },
      history: {
        title: "Sync history",
        noRecent: "No recent synchronization",
      },
      progress: {
        title: "Synchronization in Progress...",
        importing: "Importing {{type}}",
        stages: {
          preparing: "Preparing data...",
          syncing: "Synchronization in progress...",
          finalizing: "Finalizing...",
          almostDone: "Almost done!",
        },
      },
      result: {
        title: "Synchronization Complete!",
        description: "All data imported successfully",
        totalImported: "Imported Items",
        detailedReport: "Detailed Report",
        close: "Close",
        beforeAfter: "Before → After",
        imported: "Imported",
      },
      types: {
        products: "Products",
        collections: "Collections",
        pages: "Pages",
        articles: "Articles",
        images: "Images",
      },
      chooseManagement: "Choose how to manage AI-optimized content",
      noRecentSync: "No recent synchronization",
      selectContentType: "Select at least one content type",
    },
    store: {
      metadata: {
        title: "Store Metadata",
        description: "This information improves AI SEO generation by providing precise context about your business.",
        fields: {
          label: "Business Name",
          category: "Business Sector",
          phone: "Phone",
          address: "Address",
          hours: "Business Hours",
          description: "Store description",
        },
        placeholders: {
          label: "e.g.: Sweet Deco",
          category: "e.g.: Interior Design",
          phone: "e.g.: +33 1 23 45 67 89",
          hours: "e.g.: Mon-Fri 9am-6pm, Sat 10am-5pm",
          address: "e.g.: 123 rue de Rivoli, 75001 Paris, France",
          description: "Briefly describe your business and positioning...",
        },
        hints: {
          label: "Publicly displayed name (used for SEO and AI)",
          category: "Helps AI target the right SEO keywords for your sector",
          description: "Short description of your store and values (used by AI to personalize content)",
        },
        button: "Save Metadata",
        toasts: {
          saved: "Metadata saved successfully",
          errorLoading: "Error loading metadata",
          errorSaving: "Error saving",
          noStore: "No active store found",
          noStoreConnected: "No store connected. Connect a store to manage its metadata.",
        },
      },
    },
    metadata: {
      noActiveStore: "No active store found",
      noStoreConnected: "No store connected. Connect a store to manage its metadata.",
    },
    collections: {
      selectToImport: "Select the collections you want to import",
      noCollectionFound: "No collection found",
      noCollectionText: "No collections were found in your Shopify store",
      noStoreSelected: "No store selected",
      selectAtLeastOne: "Please select at least one collection",
    },
    connection: {
      enterStoreName: "Please enter your store name",
      chooseMethod: "Choose your connection method",
      chooseConnectionMethod: "Choose your connection method:",
    },
    connect: "Connect Store",
    disconnect: "Disconnect",
    connected: "Connected",
    notConnected: "Not Connected",
    syncNow: "Sync Now",
    lastSync: "Last Sync",
    never: "Never",
    selectCollections: "Select Collections",
    importAll: "Import All",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    confirmImport: "Confirm Import",
    importConfirmTitle: "Confirm Import",
    importConfirmDescription: "Import {{count}} collection(s) from Shopify",
    importing: "Importing...",
    importSuccess: "Import completed successfully",
    importError: "Error during import",
    connectionGuide: "Connection Guide",
    tokenGuide: "How to get your access token",
    storeUrl: "Store URL",
    accessToken: "Access Token",
    storeName: "Store Name",
    autoSync: "Auto-sync",
    syncFrequency: "Sync Frequency",
    daily: "Daily",
    weekly: "Weekly",
    manual: "Manual",
    updateMetadata: "Update Metadata",
    limitReached: "Import limit reached",
    limitMessage: "You've reached your import limit. Upgrade to continue.",
    upgradePlan: "Upgrade Plan",
    browser: {
      requestTitle: "Stay Updated with Real-time Notifications",
      requestDescription: "Enable browser notifications to receive instant updates about your SEO optimizations, sync progress, and important alerts.",
      benefit1: "Instant alerts for completed optimizations",
      benefit2: "Real-time sync progress updates",
      benefit3: "Never miss important SEO opportunities",
      allow: "Enable Notifications",
      later: "Maybe Later",
      enabled: "Browser notifications enabled!",
      denied: "Notifications blocked. You can enable them in your browser settings.",
    },
  },

  chatTabs: {
    chat: "Smart AI Chat",
    orders: "Orders",
    learning: "Learning",
    ordersManagement: {
      title: "Orders Management",
      description: "Manage customer orders via AI assistant",
      comingSoon: "Coming Soon",
      comingSoonDesc: "This feature will be available soon to help you manage customer orders directly via AI chat.",
    },
  },

  subscription: {
    invalidTrial: {
      title: "Action Required: Payment Validation",
      description: "Your subscription is in an invalid state. You have a paid plan but the payment has not been completed.",
      clickBelow: "Click the button below to complete payment and activate your subscription.",
      button: "Validate My Payment",
      processing: "Processing...",
      toasts: {
        redirecting: "Redirecting to payment...",
        unableToFix: "Unable to fix subscription. Please contact support.",
        failed: "Failed to fix subscription. Please contact support.",
        error: "Error generating payment session",
      },
    },
  },

  trial: {
    limitReached: "Current plan limit reached",
    usageMessage: "You've used {{usage}} of {{limit}} {{resourceType}} on your current plan. Upgrade to continue.",
    activateMyPlan: "Upgrade to Higher Plan",
    warningTitle: "Trial ending soon",
    daysLeft: "{{days}} days left in your trial",
    activateSubscription: "Activate Subscription",
    daysRemaining: "{{days}} days remaining",
  },

  footer: {
    brand: "NewAI",
    tagline: "AI-powered SEO for Shopify stores",
    product: "Product",
    features: "Features",
    pricing: "Pricing",
    resources: "Resources",
    documentation: "Documentation",
    blog: "Blog",
    support: "Support",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    company: "Company",
    about: "About Us",
    contact: "Contact",
    address: "123 SEO Street, Tech City, TC 12345",
    allRightsReserved: "All rights reserved",
  },

  shopify: {
    connection: {
      imported: "{{count}} products imported successfully!",
      errorImport: "Error during import",
      allFieldsRequired: "All fields are required",
      secretKeyInvalid: "Secret key must start with shpss_ or shpat_",
      connectionSaved: "Shopify connection saved successfully",
      errorAutoImport: "Error during automatic import",
      autoImportImpossible: "Automatic import impossible",
      credentialsNotReloaded: "Credentials could not be reloaded. Please retry in a few seconds.",
      errorSaving: "Error saving connection",
      confirmDelete: "Are you sure you want to delete this connection? You will need to recreate it to import products.",
      connectionDeleted: "Connection deleted successfully",
      errorDeleting: "Error deleting",
      connectFirst: "Please connect your store first",
      cannotLoadData: "Cannot load connection data",
      credentialsMissing: "Missing credentials",
      reconnectRequired: "Your Shopify connection must be updated. Please delete this connection and recreate it with your API credentials.",
      apiKeyMissing: "Missing API Key",
      apiKeyRequired: "Your connection must be updated. Please recreate it with complete API credentials.",
      invalidToken: "Invalid or missing API token. Please reconnect your Shopify store.",
      authError: "Authentication error. Please verify your API token.",
      errorImporting: "Error importing products"
    }
  },

  adminPanel: {
    title: "Admin Panel",
    users: "Users",
    totalUsers: "Total Users",
    activeUsers: "Active Users",
    newUsers: "New Users This Month",
    subscriptions: "Subscriptions",
    activeSubscriptions: "Active Subscriptions",
    trialUsers: "Trial Users",
    revenue: "Revenue",
    totalRevenue: "Total Revenue",
    monthlyRevenue: "Monthly Revenue",
    analytics: "Analytics",
    viewUser: "View User",
    editUser: "Edit User",
    deleteUser: "Delete User",
    userEmail: "User Email",
    userName: "User Name",
    userPlan: "User Plan",
    userStatus: "User Status",
    createdAt: "Created At",
    lastLogin: "Last Login",
    actions: "Actions",
    exportData: "Export Data",
    filters: "Filters",
    filterByPlan: "Filter by Plan",
    filterByStatus: "Filter by Status",
    searchUsers: "Search users...",
  },

  errors: {
    generic: "An error occurred",
    error: "Error",
    networkError: "Network error. Please check your connection.",
    serverError: "Server error. Please try again later.",
    unauthorized: "You are not authorized to perform this action.",
    notFound: "Resource not found",
    validation: "Validation error",
    required: "This field is required",
    invalidFormat: "Invalid format",
    tooShort: "Too short",
    tooLong: "Too long",
    tryAgain: "Try again",
    goBack: "Go back",
    contactSupport: "Contact support",
    missingConfiguration: "Missing Configuration",
  },

  forms: {
    title: "Title",
    titlePlaceholder: "Enter title",
    description: "Description",
    descriptionPlaceholder: "Enter description",
    content: "Content",
    contentPlaceholder: "Enter content",
    image: "Image",
    uploadImage: "Upload Image",
    changeImage: "Change Image",
    removeImage: "Remove Image",
    category: "Category",
    selectCategory: "Select category",
    tags: "Tags",
    addTag: "Add tag",
    status: "Status",
    publish: "Publish",
    draft: "Draft",
    schedule: "Schedule",
    publishDate: "Publish Date",
    author: "Author",
    url: "URL",
    slug: "Slug",
    metaTitle: "Meta Title",
    metaDescription: "Meta Description",
    keywords: "Keywords",
    required: "Required",
    optional: "Optional",
    charactersRemaining: "{{count}} characters remaining",
    validation: {
      required: "This field is required",
      selectOption: "Please select an option",
      enterValue: "Please enter a value",
      selectAtLeastOne: "Please select at least one item",
      fillAllFields: "Please fill all required fields",
    },
    placeholders: {
      selectPlan: "Select a plan",
      selectAudience: "Select your audience",
      selectCategory: "Select a category",
      selectCollection: "Select a collection",
      selectProduct: "Select a product",
    },
  },

  modals: {
    confirm: "Confirm",
    cancel: "Cancel",
    delete: "Delete",
    save: "Save",
    close: "Close",
    confirmDelete: "Confirm Deletion",
    confirmDeleteMessage: "Are you sure you want to delete this item?",
    deleteWarning: "This action cannot be undone",
    unsavedChanges: "Unsaved Changes",
    unsavedChangesMessage: "You have unsaved changes. Do you want to save them?",
    saveAndClose: "Save and Close",
    discardChanges: "Discard Changes",
    loading: "Loading...",
    processing: "Processing...",
    pleaseWait: "Please wait...",
  },

  badges: {
    new: "New",
    hot: "Hot",
    sale: "Sale",
    featured: "Featured",
    recommended: "Recommended",
    popular: "Popular",
    optimizedByAI: "AI-Optimized",
    limited: "Limited",
    exclusive: "Exclusive",
    beta: "Beta",
    comingSoon: "Coming Soon",
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  },

  buttons: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    update: "Update",
    submit: "Submit",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    viewMore: "View More",
    loadMore: "Load More",
    refresh: "Refresh",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    export: "Export",
    import: "Import",
    download: "Download",
    upload: "Upload",
    share: "Share",
    copy: "Copy",
    duplicate: "Duplicate",
    archive: "Archive",
    restore: "Restore",
  },

  toasts: {
    success: {
      saved: "Saved successfully",
      updated: "Updated successfully",
      created: "Created successfully",
      deleted: "Deleted successfully",
      copied: "Copied!",
      syncSuccess: "Synchronized with Shopify",
      taskCompleted: "Task marked as completed",
      subscriptionActivated: "Subscription activated!",
      subscriptionActivatedMessage: "Your subscription is now active",
      welcomeBonus: "Welcome bonus!",
      welcomeBonusMessage: "Bonus credits added to your account"
    },
    error: {
      generic: "An error occurred",
      loading: "Error loading data",
      saving: "Error saving",
      updating: "Error updating",
      deleting: "Error deleting",
      payment: "Error creating payment",
      sync: "Synchronization error",
      portal: "Error opening subscription portal"
    },
    info: {
      processing: "Processing...",
      importing: "Importing...",
      generating: "Generating..."
    },
    warning: {
      limitReached: "Limit reached",
      trialExpired: "Limit reached",
      paymentCancelled: "Payment cancelled",
      paymentCancelledMessage: "Your payment was cancelled"
    },
    savedSuccessfully: "Saved successfully",
    deletedSuccessfully: "Deleted successfully",
    updatedSuccessfully: "Updated successfully",
    createdSuccessfully: "Created successfully",
    copiedToClipboard: "Copied to clipboard",
    linkCopied: "Link copied",
    imageCopied: "Image copied",
    errorOccurred: "An error occurred",
    tryAgainLater: "Please try again later",
    invalidInput: "Invalid input",
    requiredFields: "Please fill in all required fields",
    changesSaved: "Changes saved",
    changesDiscarded: "Changes discarded",
    itemDeleted: "Item deleted",
    itemRestored: "Item restored",
    subscriptionActivated: "Subscription Activated",
    subscriptionActivatedMessage: "🎉 Your subscription has been activated successfully!",
    paymentCancelled: "Payment Cancelled",
    paymentCancelledMessage: "Your payment was cancelled",
    welcomeBonus: "Welcome Bonus Activated!",
    welcomeBonusMessage: "You will receive 100 free optimizations when you activate a paid plan",
  },

  pages: {
    home: "Home",
    notFound: "Page Not Found",
    notFoundMessage: "The page you're looking for doesn't exist",
    goHome: "Go to Home",
    unauthorized: "Unauthorized",
    unauthorizedMessage: "You don't have permission to access this page",
    maintenance: "Under Maintenance",
    maintenanceMessage: "We'll be back soon!",
  },

  landing: {
    header: {
      home: "Home",
      features: "Features",
      benefits: "Benefits",
      pricing: "Pricing",
      login: "Login",
      signup: "Sign Up",
    },
    hero: {
      badge: "🚀 AI-Powered E-commerce Optimization",
      title: "Transform Your Shopify Store Into a",
      titleHighlight: "Traffic Machine",
      titleEnd: "With AI",
      subtitle: "Automate SEO optimization, generate high-quality content, and boost your organic traffic. Get your first results in under 5 minutes.",
      ctaPrimary: "Start Free Trial — 14 Days Free",
      ctaSecondary: "Watch Demo",
      setupTime: "Setup in 5 minutes",
    },
    howItWorks: {
      badge: "Process",
      title: "4 Simple Steps to Success",
      subtitle: "From installation to results in minutes",
      steps: [
        {
          title: "Install from Shopify",
          description: "One-click installation directly from the Shopify App Store",
        },
        {
          title: "AI Scans Your Store",
          description: "Our AI analyzes all your products and identifies optimization opportunities",
        },
        {
          title: "Get Recommendations",
          description: "Receive actionable AI-powered suggestions to improve your SEO",
        },
        {
          title: "See Results",
          description: "Watch your traffic and rankings improve within days",
        },
      ],
    },
    features: {
      badge: "Key Features",
      title: "What Our AI Actually Does",
      subtitle: "Concrete actions that boost your SEO and drive traffic",
      items: [
        {
          title: "Auto Meta Tag Analysis",
          description: "AI scans and optimizes all your meta titles, descriptions, and keywords for maximum search visibility",
          tags: ["SEO", "Automation", "Analytics"],
        },
        {
          title: "Image ALT Optimization",
          description: "Advanced Vision AI analyzes your product images visually and generates contextual, SEO-optimized ALT text based on actual image content and product details",
          tags: ["Vision AI", "Image Analysis", "Visual Recognition"],
        },
        {
          title: "SEO Content Generation",
          description: "Create high-quality, SEO-optimized product descriptions and blog articles that rank",
          tags: ["Content", "AI Writing", "Blog"],
        },
        {
          title: "Smart Tagging System",
          description: "AI-powered automatic tagging for better product organization and discoverability",
          tags: ["Tags", "Organization"],
        },
        {
          title: "Google Merchant Feed",
          description: "Automatic XML feed generation and real-time sync with Google Shopping",
          tags: ["Google", "Shopping", "Feed"],
        },
        {
          title: "Full Automation",
          description: "Set it and forget it. AI continuously optimizes your store in the background",
          tags: ["Automation", "AI", "24/7"],
        },
      ],
    },
    testimonials: {
      badge: "Testimonials",
      title: "Trusted by E-commerce Stores",
      subtitle: "See what store owners say about NewAI",
      items: [
        {
          quote: "Our organic traffic increased by 180% in just 2 months. The AI does all the heavy lifting!",
          author: "Sarah Chen",
          role: "Fashion Store Owner",
        },
        {
          quote: "I save 15+ hours every week on SEO. The ROI is incredible. Best investment for my store.",
          author: "Marcus Johnson",
          role: "Electronics Retailer",
        },
        {
          quote: "Finally ranked on Google's first page! The AI knew exactly what to optimize. Game changer.",
          author: "Emma Rodriguez",
          role: "Home Decor Shop",
        },
      ],
    },
    benefits: {
      badge: "Results",
      title: "Proven results for Shopify stores",
      subtitle: "Join hundreds of sellers who have transformed their store with AI optimization",
      cta: "Start now",
      items: [
        {
          title: "3x Faster",
          description: "Automate product entry and optimization",
        },
        {
          title: "50% More traffic",
          description: "AI-optimized SEO attracts qualified visitors",
        },
        {
          title: "10h+ saved",
          description: "Automated content creation and management",
        },
        {
          title: "Better Google ranking",
          description: "Structured data and optimized feeds",
        },
      ],
      stats: [
        { value: "10K+", label: "Products Optimized" },
        { value: "500+", label: "Active Sellers" },
        { value: "95%", label: "Satisfaction Rate" },
        { value: "24/7", label: "AI Support" },
      ],
    },
    pricing: {
      badge: "Pricing",
      title: "Plans & Pricing",
      subtitle: "Choose the plan that fits your store size. All plans include Shopify integration and dedicated support.",
      monthly: "Monthly",
      yearly: "Yearly",
      yearlyDiscount: "-20%",
      perMonth: "/month",
      billedAnnually: "billed annually (i.e. {{currency}}{{total}}/year)",
      comparisonTitle: "Plan Comparison Table",
      comparisonSubtitle: "Compare all features in detail",
      comparison: {
        monthly: "Monthly",
        annual: "Annual",
        save20: "-20%",
        billedAnnually: "billed annually",
        features: {
          categories: {
            products: "Products",
            seoOptimizations: "SEO Optimizations",
            aiImageGeneration: "AI Image Generation",
            ai: "AI",
            integrationsTools: "Integrations & Tools",
            netlinkingBlog: "Netlinking & Blog",
            supportPerformance: "Support & Performance"
          },
          items: {
            maximumProducts: "Maximum products",
            shopifyImport: "Shopify Import",
            multiStoreManagement: "Multi-store management",
            monthlyOptimizations: "Monthly optimizations",
            automaticOptimization: "Automatic optimization",
            syncToShopify: "Sync to Shopify",
            seoQualityAnalysis: "SEO quality analysis",
            altTextGeneration: "Alt text generation (counts as optimization)",
            altImageVision: "Alt image Vision",
            landingProductPage: "Landing product page",
            imageWhiteBackground: "Image white background",
            generateBackground: "Generate background",
            aiArticlesPerMonth: "AI articles per month",
            aiChatPerMonth: "AI chat per month",
            aiCampaignsBlog: "AI campaigns Blog",
            aiVisionImages: "AI Vision (images)",
            googleSearchConsole: "Google Search Console",
            googleShoppingFeed: "Google Shopping Feed",
            seoAudit: "SEO Audit",
            productSync: "Product sync",
            seoOpportunities: "SEO opportunities",
            blogSyncToShopify: "Blog sync to Shopify",
            netlinkingAnalysis: "Netlinking analysis",
            emailSupport: "Email support",
            prioritySupport: "Priority support",
            dedicatedAccountManager: "Dedicated account manager",
            apiAccess: "API Access"
          }
        }
      },
      plans: {
        starter: {
          name: "Starter",
          description: "For small stores wanting to discover the power of AI",
          trial: "14-day free trial",
          cta: "Start Free Trial",
          highlight: "Enjoy the power of AI with essential features and quotas tailored to your start.",
          badge: "",
          features: [
            "100 analyzed products",
            "100 AI SEO optimizations / month (titles, meta, ALT, tags)",
            "1 AI article / month",
            "20 Shopify AI searches / month",
            "50 AI Chat responses / month",
            "1 Shopify store connected",
            "Basic automation (SEO + blog + chat)",
            "Email support",
          ],
        },
        pro: {
          name: "Pro",
          description: "For growing stores",
          cta: "Try for free",
          highlight: "The perfect balance between power, automation, and scalability.",
          badge: "Most Popular 🔥",
          features: [
            "1,000 analyzed products",
            "500 AI SEO optimizations / month",
            "5 AI articles / month",
            "3 automatic AI campaigns / month (up to 30 articles/campaign)",
            "300 Shopify AI searches / month",
            "500 AI Chat responses / month",
            "Up to 2 Shopify stores connected",
            "Integrated Google Merchant Center",
            "Full automation (SEO + blog + chat)",
            "24/7 priority support",
          ],
        },
        enterprise: {
          name: "Enterprise",
          description: "For large stores and agencies",
          cta: "Contact us",
          highlight: "Fully managed AI suite with high quotas, API access, and personal support.",
          badge: "",
          features: [
            "Unlimited products",
            "2,000 AI SEO optimizations / month",
            "20 AI articles / month",
            "10 automatic AI campaigns / month (up to 30 articles/campaign)",
            "2,000 Shopify AI searches / month",
            "3,000 AI Chat responses / month",
            "Up to 5 Shopify stores connected",
            "Multi-stores & custom API access",
            "Dedicated account manager",
            "Custom training sessions",
            "Guaranteed SLA",
          ],
        },
      },
    },
    faq: {
      title: "Frequently Asked Questions",
      subtitle: "Get answers to common questions",
    },
    cta: {
      title: "Ready to transform your store?",
      subtitle: "Start your 14-day free trial today.",
      button: "Start Free Trial",
    },
    contact: {
      badge: "Get in Touch",
      title: "Let's Talk About Your Store",
      subtitle: "Have a question? Need help? Send us a message and we'll get back to you quickly.",
      form: {
        name: "Full Name",
        namePlaceholder: "Your name",
        nameRequired: "Name is required",
        email: "Email",
        emailPlaceholder: "your@email.com",
        emailRequired: "Email is required",
        emailInvalid: "Invalid email address",
        subject: "Subject",
        subjectPlaceholder: "Subject of your message",
        message: "Message",
        messagePlaceholder: "Your message...",
        messageRequired: "Message is required",
        submit: "Send Message",
        submitting: "Sending...",
      },
      success: {
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible.",
      },
      error: {
        title: "Error",
        description: "Unable to send message. Please try again.",
        fillRequired: "Please fill in all required fields",
      },
    },
    campaign: {
      notFound: "Campaign not found",
      notFoundMessage: "This landing page doesn't exist or has been deleted.",
      generating: "Generating landing page...",
      pleaseWait: "Please wait a few moments",
    },
  },

  performance: {
    title: "Performance Monitor",
    subtitle: "Track performance metrics",
    loading: "Loading metrics...",
    noMetrics: "No metrics available",
    overview: "Overview",
    metrics: "Metrics",
    stats: {
      totalOperations: "Total Operations",
      avgTime: "Average Time",
      trackedOperations: "Tracked Operations",
    },
    chart: {
      title: "Last 500 Measurements",
      allOperations: "All Operations Combined",
    },
    pageSpeed: "Page Speed",
    loadTime: "Load Time",
    timeToInteractive: "Time to Interactive",
    firstContentfulPaint: "First Contentful Paint",
    largestContentfulPaint: "Largest Contentful Paint",
    cumulativeLayoutShift: "Cumulative Layout Shift",
    score: "Score",
    good: "Good",
    needsImprovement: "Needs Improvement",
    poor: "Poor",
    recommendations: "Recommendations",
    optimize: "Optimize",
  },

  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated",
    dataCollection: "Data Collection",
    dataCollectionDesc: "We collect information you provide directly when creating your account, including your name, email address, and information related to your Shopify store. We also automatically collect certain information about your use of our services.",
    dataUsage: "Data Usage",
    dataUsageIntro: "Your data is used to:",
    dataUsage1: "Provide and improve our SEO optimization services",
    dataUsage2: "Generate optimized content for your products",
    dataUsage3: "Communicate with you regarding your account",
    dataUsage4: "Ensure security and prevent fraud",
    dataProtection: "Data Protection",
    dataProtectionDesc: "We implement appropriate technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your data is stored on secure servers and encrypted in transit.",
    yourRights: "Your Rights",
    yourRightsIntro: "In accordance with GDPR, you have the following rights:",
    right1: "Right to access your personal data",
    right2: "Right to correct inaccurate data",
    right3: "Right to deletion of your data",
    right4: "Right to data portability",
    right5: "Right to object to processing",
    contact: "Contact",
    contactDesc: "For any questions about this privacy policy or to exercise your rights, you can contact us at:",
    disclaimer: "We reserve the right to modify this policy at any time. Any changes will be published on this page with a revised update date.",
  },

  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated",
    acceptance: "Acceptance of Terms",
    acceptanceDesc: "By accessing and using NewAI, you agree to be bound by these terms of service. If you do not agree to these terms, please do not use our services. Your continued use of the platform constitutes your acceptance of any modifications to these terms.",
    services: "Services Provided",
    servicesDesc: "NewAI provides an AI-powered SEO optimization platform for Shopify stores, including:",
    service1: "Automated generation of optimized product descriptions",
    service2: "Meta tags and alt text optimization",
    service3: "Creation of SEO-friendly blog articles",
    service4: "Google Merchant Center integration",
    service5: "AI assistant for e-commerce optimization",
    pricing: "Pricing and Payment",
    pricingDesc: "We offer several subscription plans with different features and usage limits:",
    pricing1: "Subscription fees are billed monthly or annually",
    pricing2: "Payments are processed securely via Stripe",
    pricing3: "Prices may change with 30 days' notice",
    pricing4: "No refunds for partially used months",
    prohibited: "Prohibited Use",
    prohibitedDesc: "You agree not to:",
    prohibited1: "Use the service for illegal or fraudulent activities",
    prohibited2: "Attempt to access systems in an unauthorized manner",
    prohibited3: "Share your account with third parties",
    prohibited4: "Circumvent usage limitations of your plan",
    prohibited5: "Reproduce, duplicate or copy our technology",
    limitation: "Limitation of Liability",
    limitationDesc: "NewAI is provided \"as is\" without warranty of any kind. We do not guarantee that the service will be uninterrupted or error-free. In no event shall we be liable for indirect, consequential or special damages resulting from the use or inability to use our services.",
    intellectual: "Intellectual Property",
    intellectualDesc: "All content generated by NewAI belongs to you. However, we retain all rights to our platform, algorithms, and technology. You grant us a license to use your content solely for the purpose of providing our services.",
    termination: "Termination",
    terminationDesc: "You may terminate your account at any time from your settings. We reserve the right to suspend or terminate your account in case of violation of these terms. Upon termination, you will lose access to your data after 30 days.",
    disclaimer: "These terms are governed by French law. For any questions:",
  },

  blogPage: {
    title: "NewAI Blog",
    subtitle: "Discover how AI revolutionizes e-commerce SEO, Google Merchant Center, and intelligent sales assistance",
    searchPlaceholder: "Search articles...",
    allArticles: "All Articles",
    loading: "Loading articles...",
    min: "min",
    minRead: "min read",
    readArticle: "Read Article",
    noArticles: "No articles match your search",
    backToArticles: "Back to Articles",
    ctaTitle: "Ready to Transform Your Store?",
    ctaDescription: "Join hundreds of merchants using NewAI to automate their SEO and boost their sales.",
    ctaMainTitle: "Ready to Boost Your E-commerce with AI?",
    ctaMainDescription: "Join hundreds of merchants automating their SEO and multiplying their sales with NewAI",
    startTrial: "Start Free Trial",
    learnMore: "Learn More",
    articleNotFound: "Article not found",
    articleNotFoundDesc: "The article you're looking for doesn't exist",
    errorLoading: "Error loading articles",
    errorLoadingDesc: "Could not load blog articles",
  },

  docPage: {
    badge: "Complete Documentation",
    title: "Documentation",
    subtitle: "Everything you need to know to optimize your Shopify store with AI-powered tools",
    tabs: {
      gettingStarted: "Getting Started",
      demo: "Demo & Guides",
      features: "Features",
      integration: "Integration",
      guides: "Guides",
      faq: "FAQ",
    },
  },

  documentation: {
    title: "Documentation",
    gettingStarted: "Getting Started",
    quickStart: "Quick Start Guide",
    tutorials: "Tutorials",
    apiReference: "API Reference",
    examples: "Examples",
    faq: "FAQ",
    searchDocs: "Search documentation...",
    tableOfContents: "Table of Contents",
    nextTopic: "Next Topic",
    previousTopic: "Previous Topic",
  },

  activities: {
    productOptimized: "Product Optimized",
    articlePublished: "Article Published",
    seoAuditCompleted: "SEO Audit Completed",
    shopifyConnected: "Shopify Connected",
    productsImported: "Products Imported",
    collectionsSynced: "Collections Synced",
    recentActivity: "Recent Activity",
    noActivity: "No recent activity",
  },

  search: {
    title: "AI Product Search",
    subtitle: "Intelligent search powered by AI - Find the perfect product in natural language",
    placeholder: "E.g: blue Scandinavian sofa for living room under 500€",
    button: "Search",
    searching: "Searching...",
    searchingInProgress: "Searching in progress...",
    error: {
      enterQuery: "Please enter a search query",
      searchError: "Error during search",
    },
    noProducts: "No products found",
    tryOtherKeywords: "Try with other keywords or a different description",
    productsFound: "{{count}} product{{plural}} found",
    features: {
      advanced: "Advanced AI",
      advancedDesc: "Understands natural language queries and purchase intent",
      contextual: "Contextual Search",
      contextualDesc: "Analyzes context to find the most relevant products",
      instant: "Instant Results",
      instantDesc: "Intelligent relevance scoring for optimal results",
    },
  },

  
  seoAuditDashboard: {
    title: "SEO Audit Dashboard",
    subtitle: "Complete analysis of your online visibility",
    toasts: {
      auditGenerated: "SEO audit generated successfully!",
      auditError: "Error generating audit",
    },
    advancedAI: "Advanced AI Analysis",
    categoriesAnalyzed: "6 Categories Analyzed",
    intelligentScoring: "Intelligent Scoring",
    personalizedPlan: "Personalized Action Plan",
    secureAnalysis: "🔒 100% Automatic and Secure Analysis",
    scoreLabel: {
      excellent: "🎯 Excellent",
      good: "📈 Good", 
      average: "⚠️ Average",
      low: "🚨 Low"
    },
    overview: {
      title: "Global SEO Score",
      subtitle: "Complete analysis of your online visibility",
      analysisDate: "Audit generated on",
      progression: "PROGRESSION",
      pointsRemaining: "{{count}} pts remaining",
      categoriesOptimized: "on {{count}} categories",
      optimized: "optimized"
    },
    motivational: {
      excellent: "🎉 Excellent work! Your store is very well optimized for SEO. Keep it up!",
      good: "👍 Good score! A few more optimizations will help you reach excellence.",
      average: "💪 Average score! Follow our recommendations to significantly improve your visibility.",
      low: "🚨 Significant improvement potential! Implement our priority recommendations to boost your SEO."
    },
    categoryDetail: {
      title: "Category Breakdown",
      subtitle: "Click on a category to access corresponding optimizations"
    },
    quickAccess: {
      homepage: "Homepage",
      homepageDesc: "Analyze and optimize your homepage",
      issues: "Issues Detected",
      issuesDesc: "{{count}} issues to fix",
      actionPlan: "Action Plan",
      actionPlanDesc: "{{count}} priority actions"
    },
    categories: {
      homepage: "Homepage",
      products: "Products",
      collections: "Collections",
      content: "Content",
      images: "Images",
      technical: "Technical"
    },
    categoryDescriptions: {
      homepage: "Title and meta description",
      products: "Product SEO pages",
      collections: "Collection pages",
      content: "Articles and pages",
      images: "Alt texts",
      technical: "Shopify configuration"
    },
    homepageSection: {
      title: "Homepage SEO Analysis",
      subtitle: "Detailed optimization of your home page"
    },
    issuesSection: {
      title: "Issues Detected",
      subtitle: "{{count}} issues requiring your attention",
      priority: "Priority",
      high: "🔴 High",
      medium: "🟡 Medium",
      low: "🟢 Low",
      issueFound: "{{count}} improvement point identified by AI analysis",
      issueFoundPlural: "{{count}} improvement points identified by AI analysis",
      highPriority: "{{count}} high priority",
      highPriorityPlural: "{{count}} high priorities",
    },
    actionsSection: {
      title: "Action Plan",
      subtitle: "{{count}} recommended actions to improve your SEO",
      status: "Status",
      pending: "To do",
      inProgress: "In progress",
      completed: "Completed",
      actionPlan: "Action Plan",
      priorityActions: "{{count}} priority actions",
    }
  },

  dialogs: {
    upgrade: {
      limitReached: {
        title: "🎯 Limit Reached",
        description: "You've reached the {{limitType}} limit of the free plan. Upgrade to the Starter plan now to continue (immediate payment)."
      },
      trialExpired: {
        title: "⏰ Limit Reached",
        description: "You've reached the limit of your current plan. Upgrade to the Starter plan to continue."
      },
      activateNow: "Activate Now",
      manageSub: "Manage Subscription",
      later: "Later",
      loading: "Loading...",
      starter: {
        title: "Starter Plan",
        price: "$9.99",
        perMonth: "/ month",
        features: {
          products: "100 analyzed products",
          optimizations: "100 AI SEO optimizations / month",
          articles: "1 AI article / month",
          searches: "20 Shopify AI searches / month",
          chatResponses: "50 AI Chat responses / month",
          stores: "1 Shopify store connected",
          automation: "Basic automation",
          support: "Email support"
        }
      },
      activateMyPlan: "Activate my subscription",
      activateSubscription: "Activate subscription",
      unlockFeatures: "Unlock all features by activating your subscription",
      selectPlan: "Select a plan",
      youReachedLimit: "You've reached the limit of your plan",
      chooseOptimizations: "Choose the number of optimizations per month:",
      activateThisPlan: "Activate This Plan",
    },
    limit: {
      upgradeRequired: "🚀 Upgrade Required",
      reachedLimit: "You've reached your usage limit for this feature.",
      limitTypes: {
        optimizations: "SEO Optimizations",
        articles: "AI Articles",
        chat: "Chat Responses",
        shopifySearch: "Shopify Searches",
        campaigns: "AI Campaigns"
      },
      usageMessage: "You've used {{usage}} of {{limit}} {{type}}",
      activatePlan: "Activate Plan",
      maybeLater: "Maybe Later"
    },
    trialLimit: {
      title: "🚀 Upgrade to higher plan",
      description: "You have reached the limit of your current plan:",
      usageFormat: "{{limitType}}: {{currentUsage}}/{{maxUsage}} used",
      activateMyPlan: "Activate My Plan",
      later: "Maybe Later",
      unlockFeatures: "Unlock all features with a paid plan",
      starter: {
        title: "Starter Plan",
        price: "$9.99",
        perMonth: "/month",
        features: {
          products: "1000 products",
          optimizations: "100 SEO optimizations/month",
          articles: "10 AI articles/month",
          searches: "100 AI searches/month",
          chatResponses: "50 chat responses/month",
          stores: "1 Shopify store",
          automation: "SEO automation",
          support: "Priority support",
        },
      },
    }
  },

  banners: {
    limitWarning: {
      limitReached: "⚠️ Trial limit reached for: {{limitTypes}}",
      monthlyLimitReached: "Monthly limit reached. Upgrade to continue.",
      approaching: "📊 You're approaching your free trial limits",
      activateNow: "Activate now",
      upgradeNow: "Upgrade Now",
      viewPlans: "View plans",
      loading: "Loading...",
      limitLabels: {
        optimizations: "SEO optimizations",
        articles: "articles",
        chat: "chat responses",
        searches: "Shopify searches",
        products: "products",
        stores: "stores",
        campaigns: "campaigns"
      }
    }
  },

  homepageAudit: {
    title: "SEO Audit & Optimization",
    subtitle: "Analyze your homepage SEO, generate optimized meta tags, and sync to Shopify",
    toasts: {
      auditLoaded: "Audit loaded",
      auditLoadedDesc: "Last audit loaded automatically",
      generatingError: "Error generating SEO content",
      connectShopify: "Please connect your Shopify store first",
      currentSeoImported: "Current SEO imported successfully",
      importError: "Error importing SEO",
      fillAllFields: "Please fill all fields",
      syncVerified: "✅ Synchronization verified on Shopify",
      syncVerifiedDesc: "Changes are visible on your store",
      syncWarning: "⚠️ Synchronization completed",
      syncWarningDesc: "Metafields are created but may take a few minutes to appear",
      permissionDenied: "Permission denied",
      permissionDeniedDesc: "Verify that your Shopify token has the necessary permissions",
      syncError: "Error during synchronization",
    },
    scoreLabels: {
      excellent: "Excellent",
      good: "Good",
      average: "Average",
      needsImprovement: "Needs Improvement",
    },
    features: {
      completeAnalysis: "Complete analysis",
      scoreBreakdown: "Score breakdown",
      aiOptimization: "AI optimization",
      shopifySync: "Shopify sync",
    },
    buttons: {
      analyzing: "Analyzing...",
      analyzeHomepage: "Analyze Homepage",
      importing: "Importing...",
      importCurrentSeo: "Import Current SEO",
      generating: "Generating...",
      optimizeWithAI: "Optimize with AI",
      syncing: "Synchronizing...",
      syncToShopify: "Sync to Shopify",
    },
    sections: {
      overallScore: "Overall Score",
      detailedAnalysis: "Detailed Analysis",
      structure: "Structure",
      content: "Content",
      technical: "Technical",
      bonus: "Bonus",
      aiRecommendations: "AI Recommendations",
      personalizedSuggestions: "Personalized suggestions to improve your SEO score",
      quickActions: "Quick Actions",
      seoOptimization: "SEO Optimization",
      importOptimizeSync: "Import current SEO, optimize with AI, and sync to Shopify",
      importBeforeOptimize: "Import your current homepage SEO, then optimize it with AI before syncing",
    },
    elements: {
      titleTag: "Title Tag",
      metaDescription: "Meta Description",
      h1Tag: "H1 Tag",
      h2Tags: "H2 Tags",
      imageAltTexts: "Image Alt Texts",
      canonicalTag: "Canonical Tag",
      schemaMarkup: "Schema.org Markup",
      openGraphTags: "Open Graph Tags",
      twitterCard: "Twitter Card",
      internalLinks: "Internal Links",
      contentLength: "Content Length",
      https: "HTTPS",
      missing: "Missing",
      present: "Present",
      detected: "Detected",
      found: "found",
      characters: "characters",
      imagesWithAlt: "images with alt text",
      enabled: "Enabled",
      disabled: "Disabled",
      fixImages: "Fix {{count}} images",
      storeMetadata: "Store metadata",
      shopifyEditor: "Shopify Editor",
      imagesToOptimize: "{{count}} images to optimize",
      optimizeLinks: "Optimize {{count}} internal links",
      configureMetadata: "Configure metadata",
      seoTitle: "SEO Title",
      seoDescription: "SEO Description",
      importOrGenerate: "Import or generate SEO",
      analyzedOn: "Analyzed on",
    },
  },

  articleManagement: {
    title: "Articles SEO Management",
    subtitle: "Optimize SEO title and meta description for your articles",
    stats: {
      total: "Total",
      ai: "AI",
      shopify: "Shopify",
      published: "Published",
      synced: "Synced",
      seoOptimized: "SEO Optimized",
    },
    actions: {
      createArticle: "Create Article",
      optimizeSeo: "Optimize SEO",
      synchronize: "Synchronize",
      delete: "Delete",
    },
    filters: {
      allSources: "All sources",
      allStatuses: "All statuses",
      allScores: "All scores",
      seoScore: "SEO Score",
      excellent: "Excellent (≥80%)",
      good: "Good (55-79%)",
      medium: "Medium (40-54%)",
      poor: "Poor (<40%)",
      notSynced: "Not synced",
    },
    table: {
      articleTitle: "Article Title",
      seoTitle: "SEO Title",
      seoMetaDescription: "SEO Meta Description",
      seoScore: "SEO Score",
      source: "Source",
      syncStatus: "Sync Status",
      actions: "Actions",
    },
    noArticles: "No articles found",
    itemsSelected: "{{count}} item(s) selected",
  },

  performanceMonitor: {
    title: "Performance Monitoring",
    loadingMetrics: "Loading metrics...",
    noMetrics: "No metrics available. Use the chat to generate data.",
    stats: {
      totalOperations: "Total Operations",
      averageTime: "Average Time",
      operationsTracked: "Operations Tracked",
      last500: "Last 500 measurements",
      allOperations: "All operations combined",
      uniqueTypes: "Unique operation types",
    },
    chart: {
      title: "Response time by operation",
      average: "Average (ms)",
      maximum: "Maximum (ms)",
      mean: "Mean",
      min: "Min",
      max: "Max",
      measurements: "Measurements",
    },
  },

  pricing: {
    title: "Smart Pricing AI",
    description: "AI-powered pricing optimization",
    detailedComparison: "Detailed comparison",
    stats: {
      avgMargin: "Average Margin",
      totalProducts: "Total Products",
      optimized: "Optimized Prices",
      potential: "Potential Revenue",
    },
    table: {
      product: "Product",
      currentPrice: "Current Price",
      smartPrice: "Smart Price",
      marketPrice: "Market Price",
      margin: "Margin",
      actions: "Actions",
    },
    actions: {
      analyzePrices: "Analyze Prices",
      importCosts: "Import Costs",
      syncToShopify: "Sync to Shopify",
      bulkUpdate: "Bulk Update",
    },
    config: {
      taxRate: "Tax Rate",
      targetMargin: "Target Margin",
      minMargin: "Minimum Margin",
      competitorPricing: "Competitor Pricing",
    },
    messages: {
      pricesAnalyzed: "Prices analyzed successfully",
      pricesSynced: "Prices synced to Shopify",
      costsImported: "Costs imported successfully",
      analysisError: "Error analyzing prices",
    },
  },


  tables: {
    noData: "No data available",
    loading: "Loading...",
    rowsPerPage: "Rows per page",
    page: "Page",
    of: "of",
    selected: "{{count}} selected",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    actions: "Actions",
    filters: "Filters",
    export: "Export",
    import: "Import",
  },

  blogWizard: {
    title: "Blog Wizard",
    description: "Create high-quality SEO articles with AI",
    steps: {
      topic: "Topic Selection",
      settings: "Article Settings",
      generation: "Generation",
      review: "Review & Publish",
    },
    topicStep: {
      title: "Choose Your Topic",
      subtitle: "What would you like to write about?",
      topicLabel: "Article Topic",
      topicPlaceholder: "Enter your article topic...",
      keywords: "Target Keywords",
      keywordsPlaceholder: "keyword1, keyword2, keyword3",
      tone: "Writing Tone",
      tones: {
        professional: "Professional",
        casual: "Casual",
        friendly: "Friendly",
        expert: "Expert",
      },
    },
    settingsStep: {
      title: "Article Settings",
      subtitle: "Configure your article details",
      wordCount: "Word Count",
      includeSections: "Include Sections",
      sections: {
        introduction: "Introduction",
        mainContent: "Main Content",
        conclusion: "Conclusion",
        faq: "FAQ Section",
      },
    },
    generationStep: {
      title: "Generating Article",
      subtitle: "AI is creating your article...",
      analyzing: "Analyzing topic...",
      researching: "Researching content...",
      writing: "Writing article...",
      optimizing: "Optimizing for SEO...",
    },
    reviewStep: {
      title: "Review Your Article",
      subtitle: "Make final adjustments before publishing",
      preview: "Preview",
      edit: "Edit",
      seoScore: "SEO Score",
      readability: "Readability",
      publish: "Publish Article",
      saveDraft: "Save as Draft",
    },
    messages: {
      topicRequired: "Please enter a topic",
      keywordsRequired: "Please add at least one keyword",
      generationSuccess: "Article generated successfully!",
      generationError: "Error generating article",
      publishSuccess: "Article published successfully!",
      publishError: "Error publishing article",
    },
  },

  campaignWizard: {
    title: "Campaign Wizard",
    description: "Create automated marketing campaigns",
    steps: {
      type: "Campaign Type",
      targeting: "Targeting",
      content: "Content",
      schedule: "Schedule",
      review: "Review",
    },
    typeStep: {
      title: "Select Campaign Type",
      subtitle: "What type of campaign would you like to create?",
      types: {
        product: "Product Launch",
        seasonal: "Seasonal Campaign",
        promotional: "Promotional Campaign",
        newsletter: "Newsletter",
      },
    },
    targetingStep: {
      title: "Define Your Audience",
      subtitle: "Who should see this campaign?",
      audience: "Target Audience",
      segments: "Customer Segments",
      locations: "Geographic Locations",
    },
    contentStep: {
      title: "Campaign Content",
      subtitle: "Create your campaign message",
      headline: "Headline",
      description: "Description",
      callToAction: "Call to Action",
      images: "Campaign Images",
    },
    scheduleStep: {
      title: "Schedule Campaign",
      subtitle: "When should this campaign run?",
      startDate: "Start Date",
      endDate: "End Date",
      timezone: "Timezone",
      automated: "Automated Sending",
    },
    reviewStep: {
      title: "Review Campaign",
      subtitle: "Verify all details before launching",
      summary: "Campaign Summary",
      preview: "Preview",
      launch: "Launch Campaign",
      saveDraft: "Save as Draft",
    },
    messages: {
      typeRequired: "Please select a campaign type",
      contentRequired: "Please add campaign content",
      scheduleRequired: "Please set a schedule",
      launchSuccess: "Campaign launched successfully!",
      launchError: "Error launching campaign",
      draftSaved: "Campaign saved as draft",
    },
  },

  productComponents: {
    card: {
      viewDetails: "View Details",
      addToCart: "Add to Cart",
      outOfStock: "Out of Stock",
      sale: "Sale",
      new: "New",
    },
    search: {
      placeholder: "Search products...",
      noResults: "No products found",
      resultsCount: "{{count}} products found",
      filters: "Filters",
      sortBy: "Sort By",
      sortOptions: {
        relevance: "Relevance",
        priceLowHigh: "Price: Low to High",
        priceHighLow: "Price: High to Low",
        nameAZ: "Name: A-Z",
        nameZA: "Name: Z-A",
        newest: "Newest First",
      },
    },
    enrichment: {
      title: "Product Enrichment",
      description: "Enhance product data with AI",
      analyze: "Analyze Product",
      suggestions: "AI Suggestions",
      apply: "Apply Suggestions",
      enriching: "Enriching...",
      enriched: "Product enriched successfully!",
      enrichmentError: "Error enriching product",
    },
    landing: {
      title: "Product Landing Page",
      customize: "Customize Landing Page",
      preview: "Preview Landing Page",
      publish: "Publish Landing Page",
      sections: {
        hero: "Hero Section",
        features: "Features",
        specifications: "Specifications",
        reviews: "Reviews",
        relatedProducts: "Related Products",
      },
    },
    source: {
      title: "Product Source",
      description: "Find and import products",
      search: "Search Products",
      import: "Import Products",
      selected: "{{count}} products selected",
      importing: "Importing...",
      importSuccess: "Products imported successfully!",
      importError: "Error importing products",
    },
  },

  notifications: {
    title: "Notifications",
    description: "Stay updated with your SEO tasks",
    types: {
      seoOptimization: "SEO Optimization",
      productUpdate: "Product Update",
      blogPublished: "Blog Published",
      campaignLaunched: "Campaign Launched",
      limitWarning: "Limit Warning",
      systemAlert: "System Alert",
    },
    messages: {
      productOptimized: "{{count}} product(s) optimized successfully",
      blogArticlePublished: "New blog article published: {{title}}",
      campaignLaunched: "Campaign \"{{name}}\" launched successfully",
      limitReached: "You've reached {{percent}}% of your {{limitType}} limit",
      trialEnding: "Your trial ends in {{days}} days",
      subscriptionExpired: "Your subscription has expired",
      syncComplete: "Shopify sync completed successfully",
      syncError: "Shopify sync failed - please check your connection",
    },
    actions: {
      markAsRead: "Mark as Read",
      markAllAsRead: "Mark All as Read",
      viewDetails: "View Details",
      dismiss: "Dismiss",
      settings: "Notification Settings",
    },
    empty: {
      title: "No notifications",
      description: "You're all caught up!",
    },
    samples: {
      optimizeProducts: {
        title: "Optimize your products",
        message: "You have products that need SEO optimization",
        actionLabel: "Go to Products",
      },
      missingAlts: {
        title: "Missing ALT tags",
        message: "Some images are missing ALT text descriptions",
        actionLabel: "Fix ALT Tags",
      },
      seoAudit: {
        title: "Run SEO Audit",
        message: "Schedule a comprehensive SEO audit for your store",
        actionLabel: "Launch Audit",
      },
    },
    priority: {
      high: "High",
      medium: "Medium",
      low: "Low",
    },
    view: "View",
    markCompleted: "Mark as Completed",
    completed: "Completed",
    dueBefore: "Due before",
    emptyDescription: "No notifications to show",
  },

  edgeFunctions: {
    errors: {
      unauthorized: "Unauthorized access",
      invalidRequest: "Invalid request format",
      missingParams: "Missing required parameters",
      resourceNotFound: "Resource not found",
      rateLimitExceeded: "Rate limit exceeded. Please try again later",
      serverError: "Server error. Please try again",
      invalidCredentials: "Invalid credentials",
      insufficientPermissions: "Insufficient permissions",
      quotaExceeded: "Quota exceeded for your current plan",
      invalidShopifyToken: "Invalid Shopify access token",
      shopifyConnectionError: "Failed to connect to Shopify",
      aiServiceError: "AI service temporarily unavailable",
      optimizationFailed: "Optimization failed. Please try again",
      syncFailed: "Synchronization failed",
      imageProcessingError: "Error processing image",
      invalidImageFormat: "Invalid image format",
      fileTooLarge: "File size exceeds limit",
      invalidEmail: "Invalid email address",
      emailSendFailed: "Failed to send email",
      paymentRequired: "Payment required to access this feature",
      subscriptionInactive: "Subscription is not active",
      trialExpired: "Trial period has expired",
      maintenanceMode: "Service temporarily unavailable for maintenance",
    },
    success: {
      optimizationComplete: "Optimization completed successfully",
      syncComplete: "Synchronization completed",
      dataUpdated: "Data updated successfully",
      emailSent: "Email sent successfully",
      subscriptionActivated: "Subscription activated",
      paymentProcessed: "Payment processed successfully",
    },
  },

  onboardingTour: {
    welcome: {
      title: "Welcome to NewAI! 🎉",
      description: "Let's take a quick tour of the key features",
      start: "Start Tour",
      skip: "Skip Tour",
    },
    steps: {
      dashboard: {
        title: "Dashboard",
        description: "Your central hub for SEO management and analytics",
      },
      products: {
        title: "Products",
        description: "Import and optimize your product catalog",
      },
      seo: {
        title: "SEO Optimization",
        description: "AI-powered SEO suggestions for your store",
      },
      blog: {
        title: "Blog & Content",
        description: "Create SEO-optimized articles with AI",
      },
      integration: {
        title: "Shopify Integration",
        description: "Connect your Shopify store to get started",
      },
    },
    navigation: {
      next: "Next",
      previous: "Previous",
      finish: "Finish Tour",
      skip: "Skip",
    },
    completion: {
      title: "You're All Set! 🚀",
      description: "Ready to optimize your store's SEO",
      getStarted: "Get Started",
    },
  },

  empty: {
    noResults: "No results found",
    noData: "No data available",
    noConnection: "No active connection",
    noCollection: "No collection found",
    noProduct: "No product found",
    noSync: "No recent sync",
    noCampaign: "No campaign",
    none: "None",
    noCollectionFound: "No collection found",
    noProductFound: "No product found",
    noCollectionText: "No collections were found in your Shopify store",
    noStoreSelected: "No store selected",
    noActiveStore: "No active store found",
    noStoreConnected: "No store connected. Connect a store to manage its metadata.",
  },

  campaigns: {
    errors: {
      enterName: "Please enter a campaign name",
      defineMainTopic: "Please define the main topic",
      selectType: "Please select a campaign type",
      selectCollection: "Please select at least one collection",
      selectProduct: "Please select at least one product",
      noShopifyStore: "No Shopify store connected",
    },
    labels: {
      selectAudience: "Select your audience",
      selectCollections: "Select collections to display",
      selectProducts: "Select products to display",
      chooseArtStyle: "Choose the artistic style of your landing page",
    },
  },

  ads: {
    errors: {
      noShopifyStore: "No Shopify store connected",
      noCampaignType: "Please select a campaign type",
      noName: "Please give your campaign a name",
      noCollection: "Please select at least one collection",
      noProduct: "Please select at least one product",
      fillRequired: "Please fill all required fields",
    },
    empty: {
      noCampaign: "No campaign",
      noCollectionFound: "No collection found",
      noProductFound: "No product found",
    },
  },

  wizards: {
    blog: {
      title: "Create Blog Article",
      steps: {
        topic: "Topic",
        products: "Products",
        keywords: "Keywords",
        design: "Design",
        generate: "Generate",
      },
      descriptions: {
        topic: "Choose topic",
        products: "Select products",
        keywords: "Add keywords",
        design: "Customize appearance",
        generate: "Create article",
      },
      design: {
      visualStyle: {
        title: "Visual style",
        magazine: "Magazine",
        moderne: "Modern",
        minimaliste: "Minimalist",
        editorial: "Editorial",
        premium: "Premium",
        coloré: "Colorful",
        descriptions: {
          magazine: "Large typography, immersive images, multi-column grid",
          moderne: "Subtle gradients, soft shadows, sober palette",
          minimaliste: "White space, clean typography, no decoration",
          editorial: "Premium newspaper style, serif typography, quotes",
          premium: "Gold/black, elegant typography, refined details",
          coloré: "Vibrant palette, bold gradients, energetic",
        },
      },
      layout: {
        title: "Page layout",
        oneColumn: "1 Column",
        twoColumns: "2 Columns",
        hero: "Hero",
        fullWidth: "Full width",
        descriptions: {
          oneColumn: "Centered, mobile-first",
          twoColumns: "Sidebar + content",
          hero: "Full screen image + content",
          fullWidth: "Alternating sections",
        },
      },
      colorPalette: {
        title: "Color palette",
        custom: "Custom color",
        selected: "Selected",
        palettes: {
          moderne: "Modern",
          bleuPro: "Professional Blue",
          terreux: "Earthy",
          luxeOr: "Luxury Gold",
          vertFrais: "Fresh Green",
          vibrant: "Vibrant",
        },
      },
        typography: {
          title: "Typography",
          sansSerif: "Sans-Serif",
          serif: "Serif",
        },
        productDisplay: {
          title: "Product display",
          grid: "Grid",
          list: "List",
          carousel: "Carousel",
        },
        imageIntensity: {
          title: "Image intensity",
          high: "Lots of images",
          medium: "Moderate images",
          low: "Minimal images",
        },
        toc: {
          title: "Table of contents",
          description: "Include a clickable table of contents",
          enabled: "Enabled",
          disabled: "Disabled",
        },
        advanced: {
          title: "Advanced options",
        },
      },
      articleLanguage: "Article language",
      collection: "Collection",
      selectCollection: "Select a collection...",
      allCollections: "All collections",
      noCollectionFound: "No collection found.",
      products: "product(s)",
      noProductFound: "No product found",
      productSelection: "Product selection",
      searchPlaceholder: "Search by title...",
      selectAtLeast: "Select at least one product to continue",
      selected: "selected",
      keywords: "Keywords",
      keywordManagement: "Keyword management",
      keywordDescription: "Add relevant keywords to improve your article's SEO",
      keywordPlaceholder: "Enter a keyword...",
      add: "Add",
      articleOptions: "Article options",
      articleLength: "Article length",
      short: "Short",
      words: "words",
      medium: "Medium",
      long: "Long",
      generating: "Generating...",
      generateArticle: "Generate Article",
      articleGenerated: "✅ Article generated successfully!",
      generationError: "Error during generation",
      loadingError: "Error loading collections",
      productsLoadingError: "Error loading products",
      trialLimitReached: "Trial limit reached. Activate your subscription to continue.",
      monthlyLimitReached: "Monthly article limit reached. Upgrade to a higher plan.",
      publishToShopify: "Publish to Shopify",
      syncComplete: "Synchronization complete!",
      articleSynced: "1 article successfully synchronized on Shopify",
      publishError: "Error during publication",
      syncError: "Error during synchronization",
      skipPublish: "Skip",
      articlePreview: "Article preview",
      seoTitle: "SEO Title",
      seoDescription: "SEO Description",
      content: "Content",
      trialUsage: "Trial usage",
      articlesUsed: "articles used",
      limitReached: "⚠️ Trial limit reached",
      languages: {
        french: "French",
        english: "English",
        spanish: "Spanish",
        german: "German",
        italian: "Italian",
      }
    },
    campaign: {
      title: "New Campaign",
      step: "Step",
      of: "of",
      back: "Back",
      next: "Next",
      create: "Create campaign",
      creating: "Creating...",
      basicInfo: "Basic information",
      basicInfoDescription: "Let's start by naming your campaign",
      campaignName: "Campaign name",
      campaignNamePlaceholder: "Ex: Spring Furniture Blog Campaign 2025",
      descriptionOptional: "Description (optional)",
      descriptionPlaceholder: "Describe the objective of this campaign...",
      topicKeywords: "Topic and Keywords",
      topicKeywordsDescription: "Define the theme and SEO keywords",
      mainTopic: "Main topic",
      mainTopicPlaceholder: "Ex: Scandinavian furniture, Modern decor...",
      mainTopicDescription: "The general theme of articles to generate",
      seoKeywords: "SEO Keywords",
      keywordPlaceholder: "Enter a keyword...",
      keywordDescription: "Add keywords relevant to your campaign for better SEO optimization",
      targetAudience: "Target Audience",
      targetAudienceDescription: "Who are your articles for?",
      selectAudience: "Select your audience",
      audiences: {
        professionals: "Professionals",
        individuals: "Individuals",
        designers: "Designers & Architects",
        youngCouples: "Young couples",
        families: "Families",
        all: "All audiences",
      },
      planning: "Planning",
      planningDescription: "Configure publication rhythm",
      frequency: "Generation frequency",
      frequencies: {
        daily: "Daily",
        weekly: "Weekly",
        biweekly: "Every 2 weeks",
        monthly: "Monthly",
      },
      startDate: "Start date",
      autoPublish: "Automatic publication",
      autoPublishDescription: "Publish articles as soon as they're generated",
      createdSuccess: "Campaign created successfully!",
      creationError: "Error creating campaign",
      limitReached: "Campaign limit reached",
      limitDescription: "Upgrade to a paid plan to create more campaigns.",
      monthlyLimitDescription: "Monthly limit reached. Contact support or wait for next month.",
      enterName: "Please enter a campaign name",
      defineMainTopic: "Please define the main topic",
    },
    ads: {
      title: "New Advertising Campaign",
      campaignName: "Campaign name",
      campaignNamePlaceholder: "Ex: Element Collection Gallery",
      campaignType: "Campaign type",
      types: {
        product: "Product",
        productDescription: "Artistic gallery to showcase your products",
        collection: "Collection",
        collectionDescription: "Immersive experience for a complete collection",
        store: "Store",
        storeDescription: "Artistic presentation of your store universe",
      },
      storeSummary: "Store summary",
      storeSummaryDescription: "Generate a summary of your store",
      generateSummary: "Generate AI summary",
      generating: "Generating...",
      summaryGenerated: "Summary generated successfully",
      summaryError: "Error generating summary",
      selectCollections: "Select collections",
      selectCollectionsDescription: "Choose the collections to highlight",
      collectionSearch: "Search collections...",
      noCollection: "No collection",
      selectProducts: "Select products",
      selectProductsDescription: "Choose products to feature in the campaign",
      productSearch: "Search products...",
      noProduct: "No product",
      campaignContent: "Campaign content",
      campaignContentDescription: "Define texts and messages",
      ctaText: "Call-to-action text",
      ctaPlaceholder: "Ex: Discover our collection",
      headline: "Main headline",
      headlinePlaceholder: "Ex: Unique furniture designs",
      subheadline: "Subheadline",
      subheadlinePlaceholder: "Ex: Transform your interior space",
      highlights: "Highlights",
      highlightPlaceholder: "Ex: Free delivery",
      addHighlight: "Add",
      designStyle: "Design style",
      designStyleDescription: "Choose the visual style of your landing page",
      styles: {
        artistic: "Artistic",
        artisticDescription: "Elegant and creative design",
        minimal: "Minimal",
        minimalDescription: "Clean and modern",
        bold: "Bold",
        boldDescription: "Strong and impactful",
      },
      creatingLandingPage: "Creating your artistic landing page...",
      creatingShopifyPage: "Creating Shopify page...",
      campaignCreated: "Campaign created successfully!",
      landingPageCreated: "Artistic landing page generated",
      shopifyPageCreated: "Shopify page created successfully!",
      viewOnShopify: "View on Shopify",
      landingPageError: "Landing page created, but error creating Shopify page",
      view: "View",
      creationError: "Error creating campaign",
      selectCampaignType: "Please select a campaign type",
      enterCampaignName: "Please give your campaign a name",
      selectOneCollection: "Please select at least one collection",
      selectOneProduct: "Please select at least one product",
      fillAllFields: "Please fill all required fields",
      noShopifyStore: "No Shopify store connected",
      loadingCollections: "Error loading collections",
      loadingProducts: "Error loading products",
    },
    shopify: {
      title: "Connect a Shopify Store",
      configTitle: "Access configuration",
      step1: "1",
      step2: "2",
      commercialName: "Commercial name",
      commercialNamePlaceholder: "My Store...",
      commercialNameDescription: "The name that will appear in the interface",
      shopifyCode: "Shopify technical code",
      shopifyCodePlaceholder: "qbxv98-9w",
      shopifyCodeDescription: "Find it in the URL: admin.shopify.com/store/",
      nextStep: "Next step",
      modify: "Modify",
      back: "Back",
      chooseMethod: "Choose your connection method:",
      oauth: "OAuth (Recommended)",
      apiKeys: "API Keys",
      oauthQuick: "Quick connection in 1 click ⚡",
      oauthDescription: "No need to manually create API keys. Shopify will handle authentication securely.",
      connectWithOAuth: "Connect with Shopify OAuth",
      redirecting: "Redirecting...",
      apiKey: "API Key",
      apiKeyPlaceholder: "Your Shopify API Key",
      adminToken: "Admin API Access Token",
      adminTokenPlaceholder: "shpat_...",
      connectStore: "Connect store",
      connecting: "Connecting...",
      commercialNameRequired: "Commercial name is required",
      shopifyCodeRequired: "Shopify code is required",
      fillAllFields: "Please fill all fields",
      storeLimit: "Store limit reached",
      storeLimitDescription: "You have reached the maximum. Upgrade to a higher plan.",
      mustBeConnected: "You must be logged in",
      invalidCredentials: "Invalid credentials. Check your API keys.",
      storeAlreadyConnected: "This store is already connected",
      storeConnectedSuccess: "Store successfully connected! 🎉",
      authUrlError: "Authentication URL not received",
      oauthError: "Error during OAuth connection",
      manualConnectionError: "Error during manual connection",
    },
    browser: {
      requestTitle: "Stay Updated with Notifications",
      requestDescription: "Enable notifications to get instant alerts about SEO opportunities, updates, and important tasks.",
      benefit1: "Get notified of SEO opportunities instantly",
      benefit2: "Never miss important updates",
      benefit3: "Receive reminders for pending tasks",
      allow: "Enable Notifications",
      later: "Maybe Later",
      enabled: "Notifications enabled successfully!",
      denied: "Notifications were blocked. You can enable them later in settings."
    }
  },

  chatSettings: {
    settingsSaved: "Settings saved",
    commercialWelcome: "Enable Commercial Widget",
    saveError: "Error while saving",
  },
  shopifyConnection: {
    connectingInProgress: "Connecting...",
    pendingConnection: "Shopify connection pending",
    connecting: "Connecting to Shopify...",
    redirecting: "Redirecting to installation page...",
    connectionNotFound: "Shopify connection not found",
  },
  usageAudit: {
    products: "Products",
    stores: "Stores",
    optimizations: "Optimizations",
    articles: "Articles",
  },

};

export type Translations = typeof translations;
