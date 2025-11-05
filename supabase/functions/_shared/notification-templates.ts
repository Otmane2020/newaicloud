/**
 * Notification Templates with Impact-Driven Messaging
 * These templates are designed to be motivating, urgent, and actionable
 */

export const notificationTemplates = {
  productsSeo: {
    low: {
      en: {
        title: "🎯 Quick SEO Win Available!",
        message: (count: number) => `${count} products ready for SEO optimization. 5 minutes of work could bring you +20% traffic!`
      },
      fr: {
        title: "🎯 Opportunité SEO Rapide !",
        message: (count: number) => `${count} produits prêts pour l'optimisation SEO. 5 minutes de travail = +20% de trafic potentiel !`
      }
    },
    medium: {
      en: {
        title: "⚡ SEO Boost Opportunity!",
        message: (count: number) => `${count} products missing SEO. Competitors are ranking higher - don't miss out!`
      },
      fr: {
        title: "⚡ Opportunité d'Amélioration SEO !",
        message: (count: number) => `${count} produits sans SEO. Vos concurrents sont mieux classés - ne manquez pas ça !`
      }
    },
    high: {
      en: {
        title: "🚨 SEO Alert: Action Required!",
        message: (count: number) => `URGENT: ${count} products invisible to Google! Fix now to avoid losing sales.`
      },
      fr: {
        title: "🚨 Alerte SEO : Action Requise !",
        message: (count: number) => `URGENT : ${count} produits invisibles sur Google ! Corrigez maintenant pour éviter de perdre des ventes.`
      }
    }
  },
  
  collectionsSeo: {
    high: {
      en: {
        title: "💰 Missing Revenue Opportunity!",
        message: (count: number) => `${count} collections have no SEO. Each optimized collection = 50-100 new visitors/month!`
      },
      fr: {
        title: "💰 Opportunité de Revenu Manquée !",
        message: (count: number) => `${count} collections sans SEO. Chaque collection optimisée = 50-100 nouveaux visiteurs/mois !`
      }
    }
  },
  
  imagesSeo: {
    medium: {
      en: {
        title: "📸 Image SEO Missing!",
        message: (count: number) => `${count} images without ALT text. Google can't see them = 0% image search traffic!`
      },
      fr: {
        title: "📸 SEO d'Image Manquant !",
        message: (count: number) => `${count} images sans texte ALT. Google ne peut pas les voir = 0% de trafic image !`
      }
    },
    high: {
      en: {
        title: "🔍 Huge SEO Gap Detected!",
        message: (count: number) => `${count} images invisible to search engines. Competitors stealing your image traffic!`
      },
      fr: {
        title: "🔍 Énorme Lacune SEO Détectée !",
        message: (count: number) => `${count} images invisibles aux moteurs de recherche. Vos concurrents volent votre trafic image !`
      }
    }
  },
  
  blogSeo: {
    medium: {
      en: {
        title: "✍️ Blog Optimization Needed!",
        message: (count: number) => `${count} articles need meta descriptions. Each optimized = 2x more clicks from Google!`
      },
      fr: {
        title: "✍️ Optimisation Blog Nécessaire !",
        message: (count: number) => `${count} articles nécessitent des méta-descriptions. Chacun optimisé = 2x plus de clics de Google !`
      }
    }
  },
  
  // Achievement notifications (gamification)
  achievements: {
    firstOptimization: {
      en: {
        title: "🎉 First Optimization Complete!",
        message: "Great start! You're now ahead of 80% of e-commerce stores. Keep going!"
      },
      fr: {
        title: "🎉 Première Optimisation Terminée !",
        message: "Excellent début ! Vous êtes maintenant devant 80% des boutiques e-commerce. Continuez !"
      }
    },
    tenProducts: {
      en: {
        title: "🔥 10 Products Optimized!",
        message: "You're on fire! Studies show this can increase your traffic by 15-25%."
      },
      fr: {
        title: "🔥 10 Produits Optimisés !",
        message: "Vous êtes en feu ! Les études montrent que cela peut augmenter votre trafic de 15-25%."
      }
    },
    perfectScore: {
      en: {
        title: "⭐ Perfect SEO Score!",
        message: "Incredible! You've reached 100/100 on this product. You're a SEO master!"
      },
      fr: {
        title: "⭐ Score SEO Parfait !",
        message: "Incroyable ! Vous avez atteint 100/100 sur ce produit. Vous êtes un maître du SEO !"
      }
    }
  },
  
  // Urgent notifications with deadlines
  urgent: {
    weeklyGoal: {
      en: {
        title: "⏰ Weekly Goal: Almost There!",
        message: (remaining: number) => `Only ${remaining} products left to optimize this week. You can do it!`
      },
      fr: {
        title: "⏰ Objectif Hebdomadaire : Presque !",
        message: (remaining: number) => `Plus que ${remaining} produits à optimiser cette semaine. Vous pouvez le faire !`
      }
    },
    competitorAlert: {
      en: {
        title: "🎯 Competitor Alert!",
        message: (count: number) => `Your competitor just optimized ${count} products. Don't fall behind!`
      },
      fr: {
        title: "🎯 Alerte Concurrent !",
        message: (count: number) => `Votre concurrent vient d'optimiser ${count} produits. Ne vous laissez pas distancer !`
      }
    }
  },
  
  // Contextual notifications
  contextual: {
    milestoneReached: {
      en: {
        title: "🎊 Milestone Reached!",
        message: (percent: number) => `${percent}% of your products are SEO-optimized! You're doing great!`
      },
      fr: {
        title: "🎊 Étape Franchie !",
        message: (percent: number) => `${percent}% de vos produits sont optimisés SEO ! Vous faites du bon travail !`
      }
    },
    trafficImpact: {
      en: {
        title: "📈 Traffic Impact Detected!",
        message: (visitors: number) => `Your SEO work brought +${visitors} visitors this week! Keep it up!`
      },
      fr: {
        title: "📈 Impact sur le Trafic Détecté !",
        message: (visitors: number) => `Votre travail SEO a amené +${visitors} visiteurs cette semaine ! Continuez !`
      }
    },
    topPerformer: {
      en: {
        title: "🏆 Top Performer!",
        message: "You're in the top 10% of SEO-optimized stores in your niche!"
      },
      fr: {
        title: "🏆 Top Performer !",
        message: "Vous êtes dans les 10% des boutiques les mieux optimisées SEO de votre niche !"
      }
    }
  }
};

/**
 * Get notification template based on count and priority
 */
export function getNotificationTemplate(
  type: 'products' | 'collections' | 'images' | 'blog',
  count: number,
  language: 'en' | 'fr' = 'fr'
): { title: string; message: string; priority: 'low' | 'medium' | 'high' } {
  let priority: 'low' | 'medium' | 'high' = 'medium';
  let template: any;
  
  switch (type) {
    case 'products':
      if (count <= 5) {
        priority = 'low';
        template = notificationTemplates.productsSeo.low[language];
      } else if (count <= 15) {
        priority = 'medium';
        template = notificationTemplates.productsSeo.medium[language];
      } else {
        priority = 'high';
        template = notificationTemplates.productsSeo.high[language];
      }
      break;
      
    case 'collections':
      priority = 'high';
      template = notificationTemplates.collectionsSeo.high[language];
      break;
      
    case 'images':
      if (count > 20) {
        priority = 'high';
        template = notificationTemplates.imagesSeo.high[language];
      } else {
        priority = 'medium';
        template = notificationTemplates.imagesSeo.medium[language];
      }
      break;
      
    case 'blog':
      priority = 'medium';
      template = notificationTemplates.blogSeo.medium[language];
      break;
  }
  
  return {
    title: template.title,
    message: typeof template.message === 'function' ? template.message(count) : template.message,
    priority
  };
}
