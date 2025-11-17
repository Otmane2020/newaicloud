export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          body: string
          created_at: string | null
          direction: string | null
          error_message: string | null
          folder: string | null
          from_email: string
          html_body: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          opened_at: string | null
          replied_at: string | null
          response_time_seconds: number | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
          to_email: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          direction?: string | null
          error_message?: string | null
          folder?: string | null
          from_email: string
          html_body?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          opened_at?: string | null
          replied_at?: string | null
          response_time_seconds?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
          to_email: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          direction?: string | null
          error_message?: string | null
          folder?: string | null
          from_email?: string
          html_body?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          opened_at?: string | null
          replied_at?: string | null
          response_time_seconds?: number | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
          to_email?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ads_campaign_collections: {
        Row: {
          campaign_id: string
          collection_id: string
          created_at: string
          display_order: number | null
          id: string
        }
        Insert: {
          campaign_id: string
          collection_id: string
          created_at?: string
          display_order?: number | null
          id?: string
        }
        Update: {
          campaign_id?: string
          collection_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_campaign_collections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaign_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "shopify_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_campaign_products: {
        Row: {
          campaign_id: string
          created_at: string
          display_order: number | null
          id: string
          product_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          product_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_campaign_products_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_campaign_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_campaigns: {
        Row: {
          campaign_type: string
          collections_count: number | null
          created_at: string
          cta_text: string | null
          design_style: string | null
          headline: string | null
          highlights: Json | null
          id: string
          landing_page_html: string | null
          landing_page_url: string | null
          name: string
          products_count: number | null
          shopify_page_id: string | null
          shopify_page_url: string | null
          status: string
          store_summary: string | null
          subheadline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_type: string
          collections_count?: number | null
          created_at?: string
          cta_text?: string | null
          design_style?: string | null
          headline?: string | null
          highlights?: Json | null
          id?: string
          landing_page_html?: string | null
          landing_page_url?: string | null
          name: string
          products_count?: number | null
          shopify_page_id?: string | null
          shopify_page_url?: string | null
          status?: string
          store_summary?: string | null
          subheadline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_type?: string
          collections_count?: number | null
          created_at?: string
          cta_text?: string | null
          design_style?: string | null
          headline?: string | null
          highlights?: Json | null
          id?: string
          landing_page_html?: string | null
          landing_page_url?: string | null
          name?: string
          products_count?: number | null
          shopify_page_id?: string | null
          shopify_page_url?: string | null
          status?: string
          store_summary?: string | null
          subheadline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          is_completed: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string
          sent_browser: boolean | null
          sent_email: boolean | null
          template_code: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_completed?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string
          sent_browser?: boolean | null
          sent_email?: boolean | null
          template_code?: string | null
          title: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          is_completed?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string
          sent_browser?: boolean | null
          sent_email?: boolean | null
          template_code?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      article_image_history: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          article_id: string
          created_at: string
          id: string
          is_current: boolean | null
          optimization_type: string
          optimized_url: string
          original_url: string | null
          quality_score: number | null
          resolution: string | null
          restored_at: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          article_id: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          optimization_type: string
          optimized_url: string
          original_url?: string | null
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          article_id?: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          optimization_type?: string
          optimized_url?: string
          original_url?: string | null
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_image_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          alt_auto_enabled: boolean | null
          alt_auto_frequency: string | null
          alt_auto_schedule_hour: number | null
          created_at: string
          id: string
          seo_auto_enabled: boolean | null
          seo_auto_frequency: string | null
          seo_auto_schedule_hour: number | null
          sync_after_optimization: boolean | null
          sync_auto_enabled: boolean | null
          tag_auto_enabled: boolean | null
          tag_auto_frequency: string | null
          tag_auto_schedule_hour: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_auto_enabled?: boolean | null
          alt_auto_frequency?: string | null
          alt_auto_schedule_hour?: number | null
          created_at?: string
          id?: string
          seo_auto_enabled?: boolean | null
          seo_auto_frequency?: string | null
          seo_auto_schedule_hour?: number | null
          sync_after_optimization?: boolean | null
          sync_auto_enabled?: boolean | null
          tag_auto_enabled?: boolean | null
          tag_auto_frequency?: string | null
          tag_auto_schedule_hour?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_auto_enabled?: boolean | null
          alt_auto_frequency?: string | null
          alt_auto_schedule_hour?: number | null
          created_at?: string
          id?: string
          seo_auto_enabled?: boolean | null
          seo_auto_frequency?: string | null
          seo_auto_schedule_hour?: number | null
          sync_after_optimization?: boolean | null
          sync_auto_enabled?: boolean | null
          tag_auto_enabled?: boolean | null
          tag_auto_frequency?: string | null
          tag_auto_schedule_hour?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          campaign_id: string | null
          collection_id: string | null
          content: string
          created_at: string
          featured_image: string | null
          id: string
          keywords: string[] | null
          last_optimization_at: string | null
          last_synced_at: string | null
          meta_description: string | null
          optimization_count: number | null
          published_at: string | null
          shopify_article_id: number | null
          shopify_blog_id: string | null
          source: string | null
          status: string | null
          store_id: string | null
          title: string
          updated_at: string
          user_id: string
          vision_analyzed: boolean | null
          vision_attributes: Json | null
          vision_confidence: number | null
        }
        Insert: {
          campaign_id?: string | null
          collection_id?: string | null
          content: string
          created_at?: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          last_optimization_at?: string | null
          last_synced_at?: string | null
          meta_description?: string | null
          optimization_count?: number | null
          published_at?: string | null
          shopify_article_id?: number | null
          shopify_blog_id?: string | null
          source?: string | null
          status?: string | null
          store_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
        }
        Update: {
          campaign_id?: string | null
          collection_id?: string | null
          content?: string
          created_at?: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          last_optimization_at?: string | null
          last_synced_at?: string | null
          meta_description?: string | null
          optimization_count?: number | null
          published_at?: string | null
          shopify_article_id?: number | null
          shopify_blog_id?: string | null
          source?: string | null
          status?: string | null
          store_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "blog_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "shopify_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_campaigns: {
        Row: {
          articles_generated: number | null
          auto_post: boolean | null
          created_at: string
          frequency: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          last_generation_date: string | null
          last_run_at: string | null
          name: string
          next_execution_at: string | null
          next_run_at: string | null
          store_id: string | null
          target_audience: string | null
          topic_niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          articles_generated?: number | null
          auto_post?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          last_generation_date?: string | null
          last_run_at?: string | null
          name: string
          next_execution_at?: string | null
          next_run_at?: string | null
          store_id?: string | null
          target_audience?: string | null
          topic_niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          articles_generated?: number | null
          auto_post?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          last_generation_date?: string | null
          last_run_at?: string | null
          name?: string
          next_execution_at?: string | null
          next_run_at?: string | null
          store_id?: string | null
          target_audience?: string | null
          topic_niche?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_netlinking: {
        Row: {
          anchor_text: string
          article_id: string | null
          broken_since: string | null
          click_count: number | null
          created_at: string | null
          error_message: string | null
          http_status_code: number | null
          id: string
          is_broken: boolean | null
          last_checked_at: string | null
          link_type: string | null
          seo_score: number | null
          store_id: string | null
          target_type: string | null
          target_url: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anchor_text: string
          article_id?: string | null
          broken_since?: string | null
          click_count?: number | null
          created_at?: string | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          is_broken?: boolean | null
          last_checked_at?: string | null
          link_type?: string | null
          seo_score?: number | null
          store_id?: string | null
          target_type?: string | null
          target_url: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anchor_text?: string
          article_id?: string | null
          broken_since?: string | null
          click_count?: number | null
          created_at?: string | null
          error_message?: string | null
          http_status_code?: number | null
          id?: string
          is_broken?: boolean | null
          last_checked_at?: string | null
          link_type?: string | null
          seo_score?: number | null
          store_id?: string | null
          target_type?: string | null
          target_url?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_netlinking_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_netlinking_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_opportunities: {
        Row: {
          article_id: string | null
          article_title: string
          cache_expires_at: string | null
          created_at: string
          difficulty: string | null
          estimated_word_count: number | null
          generated_at: string | null
          id: string
          intro_excerpt: string | null
          is_cached: boolean | null
          language: string | null
          last_refreshed_at: string | null
          meta_description: string | null
          primary_keywords: string[] | null
          product_ids: string[] | null
          secondary_keywords: string[] | null
          seo_opportunity_score: number | null
          status: string | null
          store_id: string | null
          structure: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          article_title: string
          cache_expires_at?: string | null
          created_at?: string
          difficulty?: string | null
          estimated_word_count?: number | null
          generated_at?: string | null
          id?: string
          intro_excerpt?: string | null
          is_cached?: boolean | null
          language?: string | null
          last_refreshed_at?: string | null
          meta_description?: string | null
          primary_keywords?: string[] | null
          product_ids?: string[] | null
          secondary_keywords?: string[] | null
          seo_opportunity_score?: number | null
          status?: string | null
          store_id?: string | null
          structure?: Json | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          article_title?: string
          cache_expires_at?: string | null
          created_at?: string
          difficulty?: string | null
          estimated_word_count?: number | null
          generated_at?: string | null
          id?: string
          intro_excerpt?: string | null
          is_cached?: boolean | null
          language?: string | null
          last_refreshed_at?: string | null
          meta_description?: string | null
          primary_keywords?: string[] | null
          product_ids?: string[] | null
          secondary_keywords?: string[] | null
          seo_opportunity_score?: number | null
          status?: string | null
          store_id?: string | null
          structure?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_opportunities_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_opportunities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          priority: number | null
          question: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          question: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          question?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          products: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          products?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          products?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_order_tracking: {
        Row: {
          carrier: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_name: string | null
          estimated_delivery: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          raw_data: Json | null
          shopify_order_id: number
          store_id: string | null
          total_price: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          estimated_delivery?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          raw_data?: Json | null
          shopify_order_id: number
          store_id?: string | null
          total_price?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_name?: string | null
          estimated_delivery?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          raw_data?: Json | null
          shopify_order_id?: number
          store_id?: string | null
          total_price?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_order_tracking_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          last_message: string | null
          message_count: number | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          message_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          message_count?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          assistant_name: string | null
          assistant_style: string | null
          created_at: string | null
          custom_instructions: string | null
          default_language: string | null
          embed_button_text: string | null
          embed_enabled: boolean | null
          embed_position: string | null
          embed_primary_color: string | null
          embed_welcome_message: string | null
          id: string
          response_length: string | null
          save_history: boolean | null
          tone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assistant_name?: string | null
          assistant_style?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          default_language?: string | null
          embed_button_text?: string | null
          embed_enabled?: boolean | null
          embed_position?: string | null
          embed_primary_color?: string | null
          embed_welcome_message?: string | null
          id?: string
          response_length?: string | null
          save_history?: boolean | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assistant_name?: string | null
          assistant_style?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          default_language?: string | null
          embed_button_text?: string | null
          embed_enabled?: boolean | null
          embed_position?: string | null
          embed_primary_color?: string | null
          embed_welcome_message?: string | null
          id?: string
          response_length?: string | null
          save_history?: boolean | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      collection_image_history: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          collection_id: string
          created_at: string
          id: string
          is_current: boolean | null
          optimization_type: string
          optimized_url: string
          original_url: string | null
          quality_score: number | null
          resolution: string | null
          restored_at: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          collection_id: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          optimization_type: string
          optimized_url: string
          original_url?: string | null
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          collection_id?: string
          created_at?: string
          id?: string
          is_current?: boolean | null
          optimization_type?: string
          optimized_url?: string
          original_url?: string | null
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_image_history_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "shopify_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      content_images: {
        Row: {
          alt_text: string | null
          content_id: string
          content_type: string
          created_at: string
          height: number | null
          id: string
          last_optimization_at: string | null
          optimization_count: number | null
          position: number | null
          shopify_image_id: number | null
          src: string
          store_id: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          content_id: string
          content_type: string
          created_at?: string
          height?: number | null
          id?: string
          last_optimization_at?: string | null
          optimization_count?: number | null
          position?: number | null
          shopify_image_id?: number | null
          src: string
          store_id?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          height?: number | null
          id?: string
          last_optimization_at?: string | null
          optimization_count?: number | null
          position?: number | null
          shopify_image_id?: number | null
          src?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      decora_home_backup_metadata: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          operation_date: string
          operation_status: string | null
          operation_type: string
          products_backed_up: number | null
          products_deleted: number | null
          store_id: string
          store_name: string | null
          variants_backed_up: number | null
          variants_deleted: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_date?: string
          operation_status?: string | null
          operation_type: string
          products_backed_up?: number | null
          products_deleted?: number | null
          store_id: string
          store_name?: string | null
          variants_backed_up?: number | null
          variants_deleted?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          operation_date?: string
          operation_status?: string | null
          operation_type?: string
          products_backed_up?: number | null
          products_deleted?: number | null
          store_id?: string
          store_name?: string | null
          variants_backed_up?: number | null
          variants_deleted?: number | null
        }
        Relationships: []
      }
      decora_home_backup_products: {
        Row: {
          adult: boolean | null
          age_group: string | null
          backup_date: string
          backup_id: string
          backup_reason: string | null
          body_html: string | null
          brand: string | null
          collection_ids: string[] | null
          color: string | null
          condition: string | null
          cost: number | null
          created_at: string | null
          currency: string | null
          energy_efficiency_class: string | null
          gender: string | null
          google_category: string | null
          google_category_id: number | null
          gtin: string | null
          handle: string | null
          has_landing_page: boolean | null
          is_bundle: boolean | null
          item_group_id: string | null
          landing_page_html: string | null
          landing_page_mobile_html: string | null
          last_landing_generation_at: string | null
          last_optimization_at: string | null
          last_synced_at: string | null
          margin_percentage: number | null
          material: string | null
          max_energy_efficiency_class: string | null
          min_energy_efficiency_class: string | null
          mpn: string | null
          multipack: number | null
          optimization_count: number | null
          optimized_at: string | null
          original_product_id: string
          pattern: string | null
          product_type: string | null
          published_at: string | null
          seller_id: string | null
          seo_description: string | null
          seo_title: string | null
          shipping_cost: number | null
          shopify_id: number | null
          shopping_last_optimized_at: string | null
          shopping_optimization_score: number | null
          shopping_optimized: boolean | null
          size: string | null
          size_system: string | null
          size_type: string | null
          status: string | null
          store_id: string | null
          store_name: string | null
          tags: string | null
          template_suffix: string | null
          title: string | null
          updated_at: string | null
          vendor: string | null
          vision_analyzed: boolean | null
          vision_attributes: Json | null
          vision_confidence: number | null
        }
        Insert: {
          adult?: boolean | null
          age_group?: string | null
          backup_date?: string
          backup_id?: string
          backup_reason?: string | null
          body_html?: string | null
          brand?: string | null
          collection_ids?: string[] | null
          color?: string | null
          condition?: string | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          energy_efficiency_class?: string | null
          gender?: string | null
          google_category?: string | null
          google_category_id?: number | null
          gtin?: string | null
          handle?: string | null
          has_landing_page?: boolean | null
          is_bundle?: boolean | null
          item_group_id?: string | null
          landing_page_html?: string | null
          landing_page_mobile_html?: string | null
          last_landing_generation_at?: string | null
          last_optimization_at?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          material?: string | null
          max_energy_efficiency_class?: string | null
          min_energy_efficiency_class?: string | null
          mpn?: string | null
          multipack?: number | null
          optimization_count?: number | null
          optimized_at?: string | null
          original_product_id: string
          pattern?: string | null
          product_type?: string | null
          published_at?: string | null
          seller_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_cost?: number | null
          shopify_id?: number | null
          shopping_last_optimized_at?: string | null
          shopping_optimization_score?: number | null
          shopping_optimized?: boolean | null
          size?: string | null
          size_system?: string | null
          size_type?: string | null
          status?: string | null
          store_id?: string | null
          store_name?: string | null
          tags?: string | null
          template_suffix?: string | null
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
        }
        Update: {
          adult?: boolean | null
          age_group?: string | null
          backup_date?: string
          backup_id?: string
          backup_reason?: string | null
          body_html?: string | null
          brand?: string | null
          collection_ids?: string[] | null
          color?: string | null
          condition?: string | null
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          energy_efficiency_class?: string | null
          gender?: string | null
          google_category?: string | null
          google_category_id?: number | null
          gtin?: string | null
          handle?: string | null
          has_landing_page?: boolean | null
          is_bundle?: boolean | null
          item_group_id?: string | null
          landing_page_html?: string | null
          landing_page_mobile_html?: string | null
          last_landing_generation_at?: string | null
          last_optimization_at?: string | null
          last_synced_at?: string | null
          margin_percentage?: number | null
          material?: string | null
          max_energy_efficiency_class?: string | null
          min_energy_efficiency_class?: string | null
          mpn?: string | null
          multipack?: number | null
          optimization_count?: number | null
          optimized_at?: string | null
          original_product_id?: string
          pattern?: string | null
          product_type?: string | null
          published_at?: string | null
          seller_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shipping_cost?: number | null
          shopify_id?: number | null
          shopping_last_optimized_at?: string | null
          shopping_optimization_score?: number | null
          shopping_optimized?: boolean | null
          size?: string | null
          size_system?: string | null
          size_type?: string | null
          status?: string | null
          store_id?: string | null
          store_name?: string | null
          tags?: string | null
          template_suffix?: string | null
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
        }
        Relationships: []
      }
      decora_home_backup_variants: {
        Row: {
          backup_date: string
          backup_id: string
          barcode: string | null
          compare_at_price: number | null
          created_at: string | null
          fulfillment_service: string | null
          grams: number | null
          image_id: number | null
          inventory_management: string | null
          inventory_policy: string | null
          inventory_quantity: number | null
          old_inventory_quantity: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          original_product_id: string
          original_variant_id: string
          position: number | null
          price: number | null
          requires_shipping: boolean | null
          shopify_variant_id: number | null
          sku: string | null
          taxable: boolean | null
          title: string | null
          updated_at: string | null
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          backup_date?: string
          backup_id?: string
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          fulfillment_service?: string | null
          grams?: number | null
          image_id?: number | null
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number | null
          old_inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          original_product_id: string
          original_variant_id: string
          position?: number | null
          price?: number | null
          requires_shipping?: boolean | null
          shopify_variant_id?: number | null
          sku?: string | null
          taxable?: boolean | null
          title?: string | null
          updated_at?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          backup_date?: string
          backup_id?: string
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          fulfillment_service?: string | null
          grams?: number | null
          image_id?: number | null
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number | null
          old_inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          original_product_id?: string
          original_variant_id?: string
          position?: number | null
          price?: number | null
          requires_shipping?: boolean | null
          shopify_variant_id?: number | null
          sku?: string | null
          taxable?: boolean | null
          title?: string | null
          updated_at?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          html_body: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
      google_ads_campaigns: {
        Row: {
          advertising_channel_type: string | null
          campaign_id: string
          clicks: number | null
          cost_micros: number | null
          created_at: string | null
          currency: string | null
          id: string
          impressions: number | null
          last_sync_at: string | null
          name: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advertising_channel_type?: string | null
          campaign_id: string
          clicks?: number | null
          cost_micros?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          impressions?: number | null
          last_sync_at?: string | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advertising_channel_type?: string | null
          campaign_id?: string
          clicks?: number | null
          cost_micros?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          impressions?: number | null
          last_sync_at?: string | null
          name?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_merchant_feeds: {
        Row: {
          created_at: string
          feed_url: string
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          product_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_url: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          product_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_url?: string
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          product_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_merchant_sync_settings: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          sync_errors_count: number | null
          sync_frequency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          sync_errors_count?: number | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          sync_errors_count?: number | null
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_product_taxonomy: {
        Row: {
          created_at: string | null
          depth: number
          full_path: string
          id: number
          level1: string | null
          level2: string | null
          level3: string | null
          level4: string | null
          level5: string | null
        }
        Insert: {
          created_at?: string | null
          depth: number
          full_path: string
          id: number
          level1?: string | null
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
        }
        Update: {
          created_at?: string | null
          depth?: number
          full_path?: string
          id?: number
          level1?: string | null
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
        }
        Relationships: []
      }
      google_search_console_data: {
        Row: {
          clicks: number | null
          created_at: string
          ctr: number | null
          date: string
          domain: string
          id: string
          impressions: number | null
          position: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          domain: string
          id?: string
          impressions?: number | null
          position?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          domain?: string
          id?: string
          impressions?: number | null
          position?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_search_console_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      gsc_alerts: {
        Row: {
          alert_type: string
          change_percentage: number
          created_at: string
          current_value: number
          detection_date: string
          domain: string
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          metadata: Json | null
          metric_name: string
          previous_value: number
          resolved_at: string | null
          severity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          change_percentage: number
          created_at?: string
          current_value: number
          detection_date?: string
          domain: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          metric_name: string
          previous_value: number
          resolved_at?: string | null
          severity: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          change_percentage?: number
          created_at?: string
          current_value?: number
          detection_date?: string
          domain?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          metric_name?: string
          previous_value?: number
          resolved_at?: string | null
          severity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gsc_data_cache: {
        Row: {
          cache_type: string
          cached_at: string
          data: Json
          date_range: string
          domain: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          cache_type: string
          cached_at?: string
          data: Json
          date_range: string
          domain: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cache_type?: string
          cached_at?: string
          data?: Json
          date_range?: string
          domain?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      gsc_indexing_requests: {
        Row: {
          article_id: string | null
          error_message: string | null
          id: string
          requested_at: string
          response_data: Json | null
          status: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          error_message?: string | null
          id?: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          error_message?: string | null
          id?: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_indexing_requests_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_keyword_history: {
        Row: {
          clicks: number
          created_at: string
          ctr: number
          date: string
          id: string
          impressions: number
          position: number
          tracking_id: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number
          date: string
          id?: string
          impressions?: number
          position: number
          tracking_id: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: string
          impressions?: number
          position?: number
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gsc_keyword_history_tracking_id_fkey"
            columns: ["tracking_id"]
            isOneToOne: false
            referencedRelation: "gsc_keyword_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      gsc_keyword_tracking: {
        Row: {
          created_at: string
          current_position: number
          domain: string
          id: string
          initial_position: number
          keyword: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_position: number
          domain: string
          id?: string
          initial_position: number
          keyword: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_position?: number
          domain?: string
          id?: string
          initial_position?: number
          keyword?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gsc_sync_config: {
        Row: {
          alert_thresholds: Json | null
          auto_sync_enabled: boolean | null
          created_at: string
          id: string
          last_sync_at: string | null
          next_sync_at: string | null
          notification_enabled: boolean | null
          sync_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_thresholds?: Json | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          notification_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_thresholds?: Json | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          notification_enabled?: boolean | null
          sync_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homepage_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          position: number | null
          src: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          position?: number | null
          src: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          position?: number | null
          src?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_seo: {
        Row: {
          created_at: string
          id: string
          last_audit: Json | null
          seo_description: string | null
          seo_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_audit?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_audit?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_page: number | null
          error_message: string | null
          id: string
          products_processed: number | null
          started_at: string | null
          status: string
          store_id: string | null
          total_pages: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_page?: number | null
          error_message?: string | null
          id?: string
          products_processed?: number | null
          started_at?: string | null
          status?: string
          store_id?: string | null
          total_pages?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_page?: number | null
          error_message?: string | null
          id?: string
          products_processed?: number | null
          started_at?: string | null
          status?: string
          store_id?: string | null
          total_pages?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_history: {
        Row: {
          created_at: string
          id: string
          is_current: boolean | null
          landing_page_html: string
          product_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean | null
          landing_page_html: string
          product_id: string
          user_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean | null
          landing_page_html?: string
          product_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_feed_settings: {
        Row: {
          auto_sync_enabled: boolean | null
          auto_update_enabled: boolean | null
          created_at: string | null
          default_brand: string | null
          default_condition: string | null
          default_currency: string | null
          excluded_collections: string[] | null
          feed_domain: string | null
          filter_mode: string | null
          generate_gtin_enabled: boolean | null
          gtin_country_code: string | null
          id: string
          included_collections: string[] | null
          last_feed_generated_at: string | null
          last_shopify_sync_at: string | null
          store_name: string
          sync_frequency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          auto_update_enabled?: boolean | null
          created_at?: string | null
          default_brand?: string | null
          default_condition?: string | null
          default_currency?: string | null
          excluded_collections?: string[] | null
          feed_domain?: string | null
          filter_mode?: string | null
          generate_gtin_enabled?: boolean | null
          gtin_country_code?: string | null
          id?: string
          included_collections?: string[] | null
          last_feed_generated_at?: string | null
          last_shopify_sync_at?: string | null
          store_name: string
          sync_frequency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean | null
          auto_update_enabled?: boolean | null
          created_at?: string | null
          default_brand?: string | null
          default_condition?: string | null
          default_currency?: string | null
          excluded_collections?: string[] | null
          feed_domain?: string | null
          filter_mode?: string | null
          generate_gtin_enabled?: boolean | null
          gtin_country_code?: string | null
          id?: string
          included_collections?: string[] | null
          last_feed_generated_at?: string | null
          last_shopify_sync_at?: string | null
          store_name?: string
          sync_frequency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          daily_digest: boolean | null
          digest_hour: number | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notify_blog: boolean | null
          notify_collections: boolean | null
          notify_homepage: boolean | null
          notify_images: boolean | null
          notify_products: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_digest?: boolean | null
          digest_hour?: number | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notify_blog?: boolean | null
          notify_collections?: boolean | null
          notify_homepage?: boolean | null
          notify_images?: boolean | null
          notify_products?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_digest?: boolean | null
          digest_hour?: number | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notify_blog?: boolean | null
          notify_collections?: boolean | null
          notify_homepage?: boolean | null
          notify_images?: boolean | null
          notify_products?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_label_en: string | null
          action_label_fr: string | null
          action_url: string | null
          category: string
          code: string
          created_at: string | null
          email_body_en: string | null
          email_body_fr: string | null
          email_subject_en: string | null
          email_subject_fr: string | null
          id: string
          is_active: boolean | null
          message_en: string
          message_fr: string
          name: string
          priority: string
          send_browser: boolean | null
          send_email: boolean | null
          send_in_app: boolean | null
          title_en: string
          title_fr: string
          updated_at: string | null
        }
        Insert: {
          action_label_en?: string | null
          action_label_fr?: string | null
          action_url?: string | null
          category: string
          code: string
          created_at?: string | null
          email_body_en?: string | null
          email_body_fr?: string | null
          email_subject_en?: string | null
          email_subject_fr?: string | null
          id?: string
          is_active?: boolean | null
          message_en: string
          message_fr: string
          name: string
          priority?: string
          send_browser?: boolean | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          title_en: string
          title_fr: string
          updated_at?: string | null
        }
        Update: {
          action_label_en?: string | null
          action_label_fr?: string | null
          action_url?: string | null
          category?: string
          code?: string
          created_at?: string | null
          email_body_en?: string | null
          email_body_fr?: string | null
          email_subject_en?: string | null
          email_subject_fr?: string | null
          id?: string
          is_active?: boolean | null
          message_en?: string
          message_fr?: string
          name?: string
          priority?: string
          send_browser?: boolean | null
          send_email?: boolean | null
          send_in_app?: boolean | null
          title_en?: string
          title_fr?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_pre_auth: boolean | null
          shop_name: string
          state_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_pre_auth?: boolean | null
          shop_name: string
          state_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_pre_auth?: boolean | null
          shop_name?: string
          state_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          created_at: string | null
          duration_ms: number
          function_name: string
          id: string
          metadata: Json | null
          operation: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          function_name: string
          id?: string
          metadata?: Json | null
          operation: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          function_name?: string
          id?: string
          metadata?: Json | null
          operation?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_change_history: {
        Row: {
          change_type: string
          changed_at: string | null
          created_at: string | null
          from_plan: string
          id: string
          proration_amount: number | null
          stripe_subscription_id: string | null
          to_plan: string
          user_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string | null
          created_at?: string | null
          from_plan: string
          id?: string
          proration_amount?: number | null
          stripe_subscription_id?: string | null
          to_plan: string
          user_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string | null
          created_at?: string | null
          from_plan?: string
          id?: string
          proration_amount?: number | null
          stripe_subscription_id?: string | null
          to_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_transitions: {
        Row: {
          allows_proration: boolean | null
          from_plan: string
          max_changes_per_month: number | null
          requires_payment: boolean | null
          to_plan: string
        }
        Insert: {
          allows_proration?: boolean | null
          from_plan: string
          max_changes_per_month?: number | null
          requires_payment?: boolean | null
          to_plan: string
        }
        Update: {
          allows_proration?: boolean | null
          from_plan?: string
          max_changes_per_month?: number | null
          requires_payment?: boolean | null
          to_plan?: string
        }
        Relationships: []
      }
      product_image_history: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          created_at: string | null
          file_size_kb: number | null
          id: string
          image_id: string
          is_current: boolean | null
          is_downloaded: boolean | null
          optimization_type: string
          optimized_url: string
          original_url: string
          product_id: string
          quality_score: number | null
          resolution: string | null
          restored_at: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          created_at?: string | null
          file_size_kb?: number | null
          id?: string
          image_id: string
          is_current?: boolean | null
          is_downloaded?: boolean | null
          optimization_type: string
          optimized_url: string
          original_url: string
          product_id: string
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id: string
          version_number?: number
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          created_at?: string | null
          file_size_kb?: number | null
          id?: string
          image_id?: string
          is_current?: boolean | null
          is_downloaded?: boolean | null
          optimization_type?: string
          optimized_url?: string
          original_url?: string
          product_id?: string
          quality_score?: number | null
          resolution?: string | null
          restored_at?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_image_history_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          height: number | null
          id: string
          last_optimization_at: string | null
          last_synced_at: string | null
          optimization_count: number | null
          position: number | null
          product_id: string
          shopify_image_id: number | null
          src: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          last_optimization_at?: string | null
          last_synced_at?: string | null
          optimization_count?: number | null
          position?: number | null
          product_id: string
          shopify_image_id?: number | null
          src: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          height?: number | null
          id?: string
          last_optimization_at?: string | null
          last_synced_at?: string | null
          optimization_count?: number | null
          position?: number | null
          product_id?: string
          shopify_image_id?: number | null
          src?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_landing_pages: {
        Row: {
          config: Json | null
          created_at: string
          html_content: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          product_id: string
          seller_id: string
          shopify_page_id: string | null
          shopify_page_url: string | null
          updated_at: string
          version: number
        }
        Insert: {
          config?: Json | null
          created_at?: string
          html_content: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          product_id: string
          seller_id: string
          shopify_page_id?: string | null
          shopify_page_url?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          config?: Json | null
          created_at?: string
          html_content?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          product_id?: string
          seller_id?: string
          shopify_page_id?: string | null
          shopify_page_url?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_landing_pages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          ai_color: string | null
          ai_design_elements: string | null
          ai_enrichment_status: string | null
          ai_finish: string | null
          ai_material: string | null
          ai_pattern: string | null
          ai_product_name: string | null
          ai_shape: string | null
          ai_texture: string | null
          ai_vision_analysis: string | null
          ai_vision_confidence: number | null
          ai_vision_model: string | null
          ai_vision_timestamp: string | null
          barcode: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          currency: string | null
          id: string
          image_url: string | null
          inventory_quantity: number | null
          option1: string | null
          option2: string | null
          option3: string | null
          price: number | null
          product_id: string
          raw_data: Json | null
          shopify_variant_id: number | null
          sku: string | null
          title: string | null
          updated_at: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          ai_color?: string | null
          ai_design_elements?: string | null
          ai_enrichment_status?: string | null
          ai_finish?: string | null
          ai_material?: string | null
          ai_pattern?: string | null
          ai_product_name?: string | null
          ai_shape?: string | null
          ai_texture?: string | null
          ai_vision_analysis?: string | null
          ai_vision_confidence?: number | null
          ai_vision_model?: string | null
          ai_vision_timestamp?: string | null
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price?: number | null
          product_id: string
          raw_data?: Json | null
          shopify_variant_id?: number | null
          sku?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          ai_color?: string | null
          ai_design_elements?: string | null
          ai_enrichment_status?: string | null
          ai_finish?: string | null
          ai_material?: string | null
          ai_pattern?: string | null
          ai_product_name?: string | null
          ai_shape?: string | null
          ai_texture?: string | null
          ai_vision_analysis?: string | null
          ai_vision_confidence?: number | null
          ai_vision_model?: string | null
          ai_vision_timestamp?: string | null
          barcode?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price?: number | null
          product_id?: string
          raw_data?: Json | null
          shopify_variant_id?: number | null
          sku?: string | null
          title?: string | null
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          gtin: string | null
          id: string
          product_type: string | null
          seo_optimized: boolean | null
          shopify_product_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          gtin?: string | null
          id?: string
          product_type?: string | null
          seo_optimized?: boolean | null
          shopify_product_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          gtin?: string | null
          id?: string
          product_type?: string | null
          seo_optimized?: boolean | null
          shopify_product_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number | null
          current_plan_id: string | null
          device_fingerprint: string | null
          email: string
          full_name: string | null
          google_ads_customer_id: string | null
          google_ads_email: string | null
          google_ads_oauth_token: string | null
          google_ads_refresh_token: string | null
          google_ads_token_expires_at: string | null
          google_console_email: string | null
          google_merchant_account_id: string | null
          google_merchant_email: string | null
          google_merchant_oauth_token: string | null
          google_merchant_refresh_token: string | null
          google_merchant_token_expires_at: string | null
          google_oauth_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          onboarding_completed: boolean | null
          preferred_language: string | null
          signup_ip: unknown
          stripe_customer_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number | null
          current_plan_id?: string | null
          device_fingerprint?: string | null
          email: string
          full_name?: string | null
          google_ads_customer_id?: string | null
          google_ads_email?: string | null
          google_ads_oauth_token?: string | null
          google_ads_refresh_token?: string | null
          google_ads_token_expires_at?: string | null
          google_console_email?: string | null
          google_merchant_account_id?: string | null
          google_merchant_email?: string | null
          google_merchant_oauth_token?: string | null
          google_merchant_refresh_token?: string | null
          google_merchant_token_expires_at?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          onboarding_completed?: boolean | null
          preferred_language?: string | null
          signup_ip?: unknown
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number | null
          current_plan_id?: string | null
          device_fingerprint?: string | null
          email?: string
          full_name?: string | null
          google_ads_customer_id?: string | null
          google_ads_email?: string | null
          google_ads_oauth_token?: string | null
          google_ads_refresh_token?: string | null
          google_ads_token_expires_at?: string | null
          google_console_email?: string | null
          google_merchant_account_id?: string | null
          google_merchant_email?: string | null
          google_merchant_oauth_token?: string | null
          google_merchant_refresh_token?: string | null
          google_merchant_token_expires_at?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_language?: string | null
          signup_ip?: unknown
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          published: boolean | null
          published_at: string | null
          read_time: number | null
          slug: string
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          published_at?: string | null
          read_time?: number | null
          slug: string
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          published_at?: string | null
          read_time?: number | null
          slug?: string
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      public_blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          featured_image: string | null
          id: string
          keywords: string[]
          language: string
          meta_description: string
          meta_title: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author?: string
          category: string
          content: string
          created_at?: string
          excerpt: string
          featured_image?: string | null
          id?: string
          keywords?: string[]
          language?: string
          meta_description: string
          meta_title: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          featured_image?: string | null
          id?: string
          keywords?: string[]
          language?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string
          credits_earned: number | null
          id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          credits_earned?: number | null
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          credits_earned?: number | null
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      seo_audit_history: {
        Row: {
          analyzed_url: string | null
          breakdown: Json | null
          created_at: string | null
          elements: Json | null
          grade: string | null
          id: string
          issues: Json | null
          recommendations: Json | null
          score: number
          store_id: string | null
          strengths: Json | null
          updated_at: string | null
          user_id: string
          warnings: Json | null
        }
        Insert: {
          analyzed_url?: string | null
          breakdown?: Json | null
          created_at?: string | null
          elements?: Json | null
          grade?: string | null
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          score: number
          store_id?: string | null
          strengths?: Json | null
          updated_at?: string | null
          user_id: string
          warnings?: Json | null
        }
        Update: {
          analyzed_url?: string | null
          breakdown?: Json | null
          created_at?: string | null
          elements?: Json | null
          grade?: string | null
          id?: string
          issues?: Json | null
          recommendations?: Json | null
          score?: number
          store_id?: string | null
          strengths?: Json | null
          updated_at?: string | null
          user_id?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_reports: {
        Row: {
          articles_score: number | null
          audit_results: Json | null
          backlinks_count: number | null
          blog_score: number | null
          collections_score: number | null
          created_at: string | null
          domain_authority: number | null
          errors_404: Json | null
          global_score: number | null
          has_robots_txt: boolean | null
          has_sitemap: boolean | null
          heading_tags: Json | null
          homepage_data: Json | null
          homepage_score: number | null
          id: string
          image_alt_tags: Json | null
          images_score: number | null
          indexed_pages: number | null
          meta_descriptions: Json | null
          meta_titles: Json | null
          mobile_friendly: boolean | null
          page_authority: number | null
          page_speed: Json | null
          pages_score: number | null
          products_score: number | null
          recommendations: Json | null
          ssl_secure: boolean | null
          store_id: string | null
          tags_score: number | null
          technical_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          articles_score?: number | null
          audit_results?: Json | null
          backlinks_count?: number | null
          blog_score?: number | null
          collections_score?: number | null
          created_at?: string | null
          domain_authority?: number | null
          errors_404?: Json | null
          global_score?: number | null
          has_robots_txt?: boolean | null
          has_sitemap?: boolean | null
          heading_tags?: Json | null
          homepage_data?: Json | null
          homepage_score?: number | null
          id?: string
          image_alt_tags?: Json | null
          images_score?: number | null
          indexed_pages?: number | null
          meta_descriptions?: Json | null
          meta_titles?: Json | null
          mobile_friendly?: boolean | null
          page_authority?: number | null
          page_speed?: Json | null
          pages_score?: number | null
          products_score?: number | null
          recommendations?: Json | null
          ssl_secure?: boolean | null
          store_id?: string | null
          tags_score?: number | null
          technical_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          articles_score?: number | null
          audit_results?: Json | null
          backlinks_count?: number | null
          blog_score?: number | null
          collections_score?: number | null
          created_at?: string | null
          domain_authority?: number | null
          errors_404?: Json | null
          global_score?: number | null
          has_robots_txt?: boolean | null
          has_sitemap?: boolean | null
          heading_tags?: Json | null
          homepage_data?: Json | null
          homepage_score?: number | null
          id?: string
          image_alt_tags?: Json | null
          images_score?: number | null
          indexed_pages?: number | null
          meta_descriptions?: Json | null
          meta_titles?: Json | null
          mobile_friendly?: boolean | null
          page_authority?: number | null
          page_speed?: Json | null
          pages_score?: number | null
          products_score?: number | null
          recommendations?: Json | null
          ssl_secure?: boolean | null
          store_id?: string | null
          tags_score?: number | null
          technical_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_challenges: {
        Row: {
          category: string
          challenge_type: string
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string
          difficulty: string
          expires_at: string | null
          id: string
          reward_points: number | null
          status: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          challenge_type: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description: string
          difficulty?: string
          expires_at?: string | null
          id?: string
          reward_points?: number | null
          status?: string
          target_value: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string
          difficulty?: string
          expires_at?: string | null
          id?: string
          reward_points?: number | null
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seo_tasks: {
        Row: {
          action_url: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          estimated_impact: number | null
          id: string
          priority: number | null
          status: string | null
          task_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_impact?: number | null
          id?: string
          priority?: number | null
          status?: string | null
          task_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          estimated_impact?: number | null
          id?: string
          priority?: number | null
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopify_collections: {
        Row: {
          body_html: string | null
          created_at: string
          handle: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          last_optimization_at: string | null
          optimization_count: number | null
          products_count: number | null
          seo_description: string | null
          seo_title: string | null
          shopify_collection_id: number | null
          shopify_image_id: string | null
          store_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          last_optimization_at?: string | null
          optimization_count?: number | null
          products_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_collection_id?: number | null
          shopify_image_id?: string | null
          store_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          last_optimization_at?: string | null
          optimization_count?: number | null
          products_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_collection_id?: number | null
          shopify_image_id?: string | null
          store_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_connections: {
        Row: {
          access_token: string
          api_key: string | null
          connected_at: string | null
          connection_type: string | null
          created_at: string
          encrypted_token: string | null
          id: string
          is_active: boolean | null
          is_encrypted: boolean | null
          last_sync_at: string | null
          public_domain: string | null
          store_address: string | null
          store_business_hours: string | null
          store_category: string | null
          store_description: string | null
          store_label: string | null
          store_language: string | null
          store_name: string | null
          store_phone: string | null
          store_url: string
          token_iv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          api_key?: string | null
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_sync_at?: string | null
          public_domain?: string | null
          store_address?: string | null
          store_business_hours?: string | null
          store_category?: string | null
          store_description?: string | null
          store_label?: string | null
          store_language?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_url: string
          token_iv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          api_key?: string | null
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_sync_at?: string | null
          public_domain?: string | null
          store_address?: string | null
          store_business_hours?: string | null
          store_category?: string | null
          store_description?: string | null
          store_label?: string | null
          store_language?: string | null
          store_name?: string | null
          store_phone?: string | null
          store_url?: string
          token_iv?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shopify_pages: {
        Row: {
          body_html: string | null
          created_at: string
          handle: string | null
          id: string
          last_optimization_at: string | null
          last_synced_at: string | null
          optimization_count: number | null
          optimized: boolean | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          shopify_page_id: number | null
          store_id: string | null
          template_suffix: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_html?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          last_optimization_at?: string | null
          last_synced_at?: string | null
          optimization_count?: number | null
          optimized?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_page_id?: number | null
          store_id?: string | null
          template_suffix?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_html?: string | null
          created_at?: string
          handle?: string | null
          id?: string
          last_optimization_at?: string | null
          last_synced_at?: string | null
          optimization_count?: number | null
          optimized?: boolean | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          shopify_page_id?: number | null
          store_id?: string | null
          template_suffix?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_pending_connections: {
        Row: {
          access_token: string
          commercial_name: string | null
          created_at: string | null
          expires_at: string
          id: string
          is_claimed: boolean | null
          pending_token: string
          scope: string | null
          shop_url: string
        }
        Insert: {
          access_token: string
          commercial_name?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_claimed?: boolean | null
          pending_token: string
          scope?: string | null
          shop_url: string
        }
        Update: {
          access_token?: string
          commercial_name?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_claimed?: boolean | null
          pending_token?: string
          scope?: string | null
          shop_url?: string
        }
        Relationships: []
      }
      shopify_products: {
        Row: {
          ai_assembly_required: boolean | null
          ai_background_style: string | null
          ai_care_instructions: string | null
          ai_color: string | null
          ai_condition_notes: string | null
          ai_craftsmanship_level: string | null
          ai_design_elements: string | null
          ai_finish: string | null
          ai_lighting_type: string | null
          ai_material: string | null
          ai_package_dimensions: string | null
          ai_pattern: string | null
          ai_presentation_quality: number | null
          ai_reasoning: string | null
          ai_shape: string | null
          ai_texture: string | null
          ai_vision_analysis: string | null
          ai_vision_confidence: number | null
          ai_vision_model: string | null
          ai_vision_timestamp: string | null
          ai_volume: number | null
          ai_volume_unit: string | null
          ai_weight: number | null
          ai_weight_unit: string | null
          body_html: string | null
          category: string | null
          characteristics: string | null
          chat_text: string | null
          collection_ids: string[] | null
          compare_at_price: number | null
          competitors: Json | null
          cost_price: number | null
          created_at: string
          currency: string | null
          description: string | null
          dimensions_source: string | null
          dimensions_text: string | null
          enrichment_error: string | null
          enrichment_status: string | null
          functionality: string | null
          google_age_group: string | null
          google_availability: string | null
          google_brand: string | null
          google_category: string | null
          google_category_confidence: number | null
          google_category_id: number | null
          google_condition: string | null
          google_custom_label_0: string | null
          google_custom_label_1: string | null
          google_custom_label_2: string | null
          google_custom_label_3: string | null
          google_custom_label_4: string | null
          google_custom_product: boolean | null
          google_gender: string | null
          google_gtin: string | null
          google_mpn: string | null
          google_product_category: string | null
          google_synced_at: string | null
          google_white_background: boolean | null
          handle: string | null
          height: number | null
          height_unit: string | null
          id: string
          image_url: string | null
          imported_at: string | null
          inventory_quantity: number | null
          landing_page: string | null
          landing_page_html: string | null
          last_enriched_at: string | null
          last_optimization_at: string | null
          last_pricing_analysis: string | null
          last_seo_sync_at: string | null
          last_synced_data: Json | null
          length: number | null
          length_unit: string | null
          market_price: number | null
          optimization_count: number | null
          optimization_history: Json | null
          optimized_description: string | null
          optimized_title: string | null
          other_dimensions: Json | null
          price: number | null
          product_type: string | null
          raw_data: Json | null
          room: string | null
          seller_id: string
          seo_description: string | null
          seo_sync_error: string | null
          seo_synced_to_shopify: boolean | null
          seo_title: string | null
          serp_data: Json | null
          serp_verified: boolean | null
          shipping_cost: number | null
          shop_name: string | null
          shopify_id: number | null
          smart_depth: number | null
          smart_depth_unit: string | null
          smart_diameter: number | null
          smart_diameter_unit: string | null
          smart_height: number | null
          smart_height_unit: string | null
          smart_length: number | null
          smart_length_unit: string | null
          smart_price: number | null
          smart_seat_height: number | null
          smart_seat_height_unit: string | null
          smart_weight: number | null
          smart_weight_unit: string | null
          smart_width: number | null
          smart_width_unit: string | null
          specs_confidence: number | null
          specs_source: string | null
          status: string | null
          store_id: string | null
          style: string | null
          sub_category: string | null
          tags: string | null
          title: string
          updated_at: string
          vendor: string | null
          vision_analyzed: boolean | null
          vision_attributes: Json | null
          vision_confidence: number | null
          vision_model: string | null
          vision_timestamp: string | null
          width: number | null
          width_unit: string | null
        }
        Insert: {
          ai_assembly_required?: boolean | null
          ai_background_style?: string | null
          ai_care_instructions?: string | null
          ai_color?: string | null
          ai_condition_notes?: string | null
          ai_craftsmanship_level?: string | null
          ai_design_elements?: string | null
          ai_finish?: string | null
          ai_lighting_type?: string | null
          ai_material?: string | null
          ai_package_dimensions?: string | null
          ai_pattern?: string | null
          ai_presentation_quality?: number | null
          ai_reasoning?: string | null
          ai_shape?: string | null
          ai_texture?: string | null
          ai_vision_analysis?: string | null
          ai_vision_confidence?: number | null
          ai_vision_model?: string | null
          ai_vision_timestamp?: string | null
          ai_volume?: number | null
          ai_volume_unit?: string | null
          ai_weight?: number | null
          ai_weight_unit?: string | null
          body_html?: string | null
          category?: string | null
          characteristics?: string | null
          chat_text?: string | null
          collection_ids?: string[] | null
          compare_at_price?: number | null
          competitors?: Json | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions_source?: string | null
          dimensions_text?: string | null
          enrichment_error?: string | null
          enrichment_status?: string | null
          functionality?: string | null
          google_age_group?: string | null
          google_availability?: string | null
          google_brand?: string | null
          google_category?: string | null
          google_category_confidence?: number | null
          google_category_id?: number | null
          google_condition?: string | null
          google_custom_label_0?: string | null
          google_custom_label_1?: string | null
          google_custom_label_2?: string | null
          google_custom_label_3?: string | null
          google_custom_label_4?: string | null
          google_custom_product?: boolean | null
          google_gender?: string | null
          google_gtin?: string | null
          google_mpn?: string | null
          google_product_category?: string | null
          google_synced_at?: string | null
          google_white_background?: boolean | null
          handle?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          image_url?: string | null
          imported_at?: string | null
          inventory_quantity?: number | null
          landing_page?: string | null
          landing_page_html?: string | null
          last_enriched_at?: string | null
          last_optimization_at?: string | null
          last_pricing_analysis?: string | null
          last_seo_sync_at?: string | null
          last_synced_data?: Json | null
          length?: number | null
          length_unit?: string | null
          market_price?: number | null
          optimization_count?: number | null
          optimization_history?: Json | null
          optimized_description?: string | null
          optimized_title?: string | null
          other_dimensions?: Json | null
          price?: number | null
          product_type?: string | null
          raw_data?: Json | null
          room?: string | null
          seller_id: string
          seo_description?: string | null
          seo_sync_error?: string | null
          seo_synced_to_shopify?: boolean | null
          seo_title?: string | null
          serp_data?: Json | null
          serp_verified?: boolean | null
          shipping_cost?: number | null
          shop_name?: string | null
          shopify_id?: number | null
          smart_depth?: number | null
          smart_depth_unit?: string | null
          smart_diameter?: number | null
          smart_diameter_unit?: string | null
          smart_height?: number | null
          smart_height_unit?: string | null
          smart_length?: number | null
          smart_length_unit?: string | null
          smart_price?: number | null
          smart_seat_height?: number | null
          smart_seat_height_unit?: string | null
          smart_weight?: number | null
          smart_weight_unit?: string | null
          smart_width?: number | null
          smart_width_unit?: string | null
          specs_confidence?: number | null
          specs_source?: string | null
          status?: string | null
          store_id?: string | null
          style?: string | null
          sub_category?: string | null
          tags?: string | null
          title: string
          updated_at?: string
          vendor?: string | null
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
          vision_model?: string | null
          vision_timestamp?: string | null
          width?: number | null
          width_unit?: string | null
        }
        Update: {
          ai_assembly_required?: boolean | null
          ai_background_style?: string | null
          ai_care_instructions?: string | null
          ai_color?: string | null
          ai_condition_notes?: string | null
          ai_craftsmanship_level?: string | null
          ai_design_elements?: string | null
          ai_finish?: string | null
          ai_lighting_type?: string | null
          ai_material?: string | null
          ai_package_dimensions?: string | null
          ai_pattern?: string | null
          ai_presentation_quality?: number | null
          ai_reasoning?: string | null
          ai_shape?: string | null
          ai_texture?: string | null
          ai_vision_analysis?: string | null
          ai_vision_confidence?: number | null
          ai_vision_model?: string | null
          ai_vision_timestamp?: string | null
          ai_volume?: number | null
          ai_volume_unit?: string | null
          ai_weight?: number | null
          ai_weight_unit?: string | null
          body_html?: string | null
          category?: string | null
          characteristics?: string | null
          chat_text?: string | null
          collection_ids?: string[] | null
          compare_at_price?: number | null
          competitors?: Json | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions_source?: string | null
          dimensions_text?: string | null
          enrichment_error?: string | null
          enrichment_status?: string | null
          functionality?: string | null
          google_age_group?: string | null
          google_availability?: string | null
          google_brand?: string | null
          google_category?: string | null
          google_category_confidence?: number | null
          google_category_id?: number | null
          google_condition?: string | null
          google_custom_label_0?: string | null
          google_custom_label_1?: string | null
          google_custom_label_2?: string | null
          google_custom_label_3?: string | null
          google_custom_label_4?: string | null
          google_custom_product?: boolean | null
          google_gender?: string | null
          google_gtin?: string | null
          google_mpn?: string | null
          google_product_category?: string | null
          google_synced_at?: string | null
          google_white_background?: boolean | null
          handle?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          image_url?: string | null
          imported_at?: string | null
          inventory_quantity?: number | null
          landing_page?: string | null
          landing_page_html?: string | null
          last_enriched_at?: string | null
          last_optimization_at?: string | null
          last_pricing_analysis?: string | null
          last_seo_sync_at?: string | null
          last_synced_data?: Json | null
          length?: number | null
          length_unit?: string | null
          market_price?: number | null
          optimization_count?: number | null
          optimization_history?: Json | null
          optimized_description?: string | null
          optimized_title?: string | null
          other_dimensions?: Json | null
          price?: number | null
          product_type?: string | null
          raw_data?: Json | null
          room?: string | null
          seller_id?: string
          seo_description?: string | null
          seo_sync_error?: string | null
          seo_synced_to_shopify?: boolean | null
          seo_title?: string | null
          serp_data?: Json | null
          serp_verified?: boolean | null
          shipping_cost?: number | null
          shop_name?: string | null
          shopify_id?: number | null
          smart_depth?: number | null
          smart_depth_unit?: string | null
          smart_diameter?: number | null
          smart_diameter_unit?: string | null
          smart_height?: number | null
          smart_height_unit?: string | null
          smart_length?: number | null
          smart_length_unit?: string | null
          smart_price?: number | null
          smart_seat_height?: number | null
          smart_seat_height_unit?: string | null
          smart_weight?: number | null
          smart_weight_unit?: string | null
          smart_width?: number | null
          smart_width_unit?: string | null
          specs_confidence?: number | null
          specs_source?: string | null
          status?: string | null
          store_id?: string | null
          style?: string | null
          sub_category?: string | null
          tags?: string | null
          title?: string
          updated_at?: string
          vendor?: string | null
          vision_analyzed?: boolean | null
          vision_attributes?: Json | null
          vision_confidence?: number | null
          vision_model?: string | null
          vision_timestamp?: string | null
          width?: number | null
          width_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sync_settings: {
        Row: {
          created_at: string
          export_after_optimization: boolean | null
          export_auto_enabled: boolean | null
          id: string
          import_frequency: string
          import_schedule_day: number | null
          import_schedule_hour: number | null
          import_types: string[] | null
          last_export_at: string | null
          last_import_at: string | null
          next_import_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          export_after_optimization?: boolean | null
          export_auto_enabled?: boolean | null
          id?: string
          import_frequency?: string
          import_schedule_day?: number | null
          import_schedule_hour?: number | null
          import_types?: string[] | null
          last_export_at?: string | null
          last_import_at?: string | null
          next_import_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          export_after_optimization?: boolean | null
          export_auto_enabled?: boolean | null
          id?: string
          import_frequency?: string
          import_schedule_day?: number | null
          import_schedule_hour?: number | null
          import_types?: string[] | null
          last_export_at?: string | null
          last_import_at?: string | null
          next_import_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          best_value: boolean | null
          created_at: string
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_articles_monthly: number
          max_campaigns: number
          max_chat_responses_monthly: number
          max_optimizations_monthly: number
          max_products: number
          max_shopify_requests_monthly: number | null
          max_shopify_stores: number
          name: string
          popular: boolean | null
          price_monthly: number
          price_monthly_eur: number | null
          price_yearly: number
          price_yearly_eur: number | null
          recommended: boolean | null
          stripe_price_id: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_monthly_eur: string | null
          stripe_price_id_yearly: string | null
          stripe_price_id_yearly_eur: string | null
          trial_days: number | null
          trial_max_articles: number | null
          trial_max_chat_responses: number | null
          trial_max_optimizations: number | null
          trial_max_products: number | null
          trial_max_shopify_requests: number | null
          updated_at: string
        }
        Insert: {
          best_value?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id: string
          is_active?: boolean | null
          max_articles_monthly?: number
          max_campaigns?: number
          max_chat_responses_monthly?: number
          max_optimizations_monthly?: number
          max_products?: number
          max_shopify_requests_monthly?: number | null
          max_shopify_stores?: number
          name: string
          popular?: boolean | null
          price_monthly: number
          price_monthly_eur?: number | null
          price_yearly: number
          price_yearly_eur?: number | null
          recommended?: boolean | null
          stripe_price_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_monthly_eur?: string | null
          stripe_price_id_yearly?: string | null
          stripe_price_id_yearly_eur?: string | null
          trial_days?: number | null
          trial_max_articles?: number | null
          trial_max_chat_responses?: number | null
          trial_max_optimizations?: number | null
          trial_max_products?: number | null
          trial_max_shopify_requests?: number | null
          updated_at?: string
        }
        Update: {
          best_value?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_articles_monthly?: number
          max_campaigns?: number
          max_chat_responses_monthly?: number
          max_optimizations_monthly?: number
          max_products?: number
          max_shopify_requests_monthly?: number | null
          max_shopify_stores?: number
          name?: string
          popular?: boolean | null
          price_monthly?: number
          price_monthly_eur?: number | null
          price_yearly?: number
          price_yearly_eur?: number | null
          recommended?: boolean | null
          stripe_price_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_monthly_eur?: string | null
          stripe_price_id_yearly?: string | null
          stripe_price_id_yearly_eur?: string | null
          trial_days?: number | null
          trial_max_articles?: number | null
          trial_max_chat_responses?: number | null
          trial_max_optimizations?: number | null
          trial_max_products?: number | null
          trial_max_shopify_requests?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_period: string
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          seller_id: string
          status: string
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_period?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          seller_id: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          seller_id?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_history: {
        Row: {
          completed_at: string | null
          content_types: string[]
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          items_synced: number | null
          started_at: string
          status: string
          store_id: string | null
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_types: string[]
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          items_synced?: number | null
          started_at?: string
          status: string
          store_id?: string | null
          sync_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_types?: string[]
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          items_synced?: number | null
          started_at?: string
          status?: string
          store_id?: string | null
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_history_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          images_processed: number | null
          operation_type: string
          products_added: number | null
          products_processed: number | null
          products_updated: number | null
          seller_id: string
          started_at: string
          status: string
          store_id: string | null
          store_name: string
          variants_processed: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          images_processed?: number | null
          operation_type?: string
          products_added?: number | null
          products_processed?: number | null
          products_updated?: number | null
          seller_id: string
          started_at?: string
          status?: string
          store_id?: string | null
          store_name: string
          variants_processed?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          images_processed?: number | null
          operation_type?: string
          products_added?: number | null
          products_processed?: number | null
          products_updated?: number | null
          seller_id?: string
          started_at?: string
          status?: string
          store_id?: string | null
          store_name?: string
          variants_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          ai_generated: boolean | null
          context: string | null
          created_at: string | null
          id: string
          key: string
          language: string
          reviewed: boolean | null
          updated_at: string | null
          value: string
        }
        Insert: {
          ai_generated?: boolean | null
          context?: string | null
          created_at?: string | null
          id?: string
          key: string
          language: string
          reviewed?: boolean | null
          updated_at?: string | null
          value: string
        }
        Update: {
          ai_generated?: boolean | null
          context?: string | null
          created_at?: string | null
          id?: string
          key?: string
          language?: string
          reviewed?: boolean | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      trial_history: {
        Row: {
          converted_to_paid: boolean | null
          created_at: string | null
          device_fingerprint: string | null
          email: string
          id: string
          signup_ip: unknown
          trial_ended_at: string | null
          trial_started_at: string | null
          user_id: string | null
        }
        Insert: {
          converted_to_paid?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          email: string
          id?: string
          signup_ip?: unknown
          trial_ended_at?: string | null
          trial_started_at?: string | null
          user_id?: string | null
        }
        Update: {
          converted_to_paid?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          email?: string
          id?: string
          signup_ip?: unknown
          trial_ended_at?: string | null
          trial_started_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          articles_count: number | null
          campaigns_count: number | null
          chat_responses_count: number | null
          created_at: string | null
          id: string
          month: string
          optimizations_count: number | null
          products_count: number | null
          seller_id: string
          shopify_requests_count: number | null
          shopify_stores_count: number
          updated_at: string | null
        }
        Insert: {
          articles_count?: number | null
          campaigns_count?: number | null
          chat_responses_count?: number | null
          created_at?: string | null
          id?: string
          month: string
          optimizations_count?: number | null
          products_count?: number | null
          seller_id: string
          shopify_requests_count?: number | null
          shopify_stores_count?: number
          updated_at?: string | null
        }
        Update: {
          articles_count?: number | null
          campaigns_count?: number | null
          chat_responses_count?: number | null
          created_at?: string | null
          id?: string
          month?: string
          optimizations_count?: number | null
          products_count?: number | null
          seller_id?: string
          shopify_requests_count?: number | null
          shopify_stores_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_tracking_history: {
        Row: {
          created_at: string
          delta: number
          field_name: string
          id: string
          metadata: Json | null
          month: string
          new_value: number
          old_value: number
          operation: string
          seller_id: string
          trigger_source: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          field_name: string
          id?: string
          metadata?: Json | null
          month: string
          new_value: number
          old_value: number
          operation: string
          seller_id: string
          trigger_source?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          field_name?: string
          id?: string
          metadata?: Json | null
          month?: string
          new_value?: number
          old_value?: number
          operation?: string
          seller_id?: string
          trigger_source?: string | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action_type: string
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          page: string
          store_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          page: string
          store_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          page?: string
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shopify_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vision_ai_cache: {
        Row: {
          analysis_result: string
          created_at: string | null
          id: string
          image_url: string
          updated_at: string | null
        }
        Insert: {
          analysis_result: string
          created_at?: string | null
          id?: string
          image_url: string
          updated_at?: string | null
        }
        Update: {
          analysis_result?: string
          created_at?: string | null
          id?: string
          image_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_execution: {
        Args: { p_frequency: string; p_last_execution: string }
        Returns: string
      }
      check_optimization_allowed: {
        Args: {
          p_force?: boolean
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: Json
      }
      check_trial_abuse: {
        Args: { p_email: string; p_ip: unknown }
        Returns: Json
      }
      cleanup_expired_gsc_cache: { Args: never; Returns: undefined }
      cleanup_old_vision_cache: { Args: never; Returns: undefined }
      cleanup_orphaned_data: {
        Args: never
        Returns: {
          cleanup_type: string
          details: Json
          items_cleaned: number
        }[]
      }
      cleanup_stuck_syncs: { Args: never; Returns: undefined }
      detect_usage_anomalies: {
        Args: { p_threshold?: number; p_user_id: string }
        Returns: {
          anomaly_type: string
          current_value: number
          description: string
          expected_value: number
          field_name: string
          severity: string
        }[]
      }
      generate_referral_code: { Args: { user_id: string }; Returns: string }
      get_next_article_image_version: {
        Args: { p_article_id: string }
        Returns: number
      }
      get_next_collection_image_version: {
        Args: { p_collection_id: string }
        Returns: number
      }
      get_next_image_version: { Args: { p_image_id: string }; Returns: number }
      get_next_version_number: {
        Args: { p_product_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { p_field: string; p_increment?: number; p_seller_id: string }
        Returns: undefined
      }
      make_user_admin: { Args: { user_email: string }; Returns: Json }
      recalculate_shopify_stores_count: {
        Args: { p_user_id?: string }
        Returns: {
          fixed: boolean
          new_count: number
          old_count: number
          user_id: string
        }[]
      }
      reset_monthly_usage_counters: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
