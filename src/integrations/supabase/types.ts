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
          content: string
          created_at: string
          id: string
          keywords: string[] | null
          meta_description: string | null
          published_at: string | null
          shopify_blog_id: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          shopify_blog_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          shopify_blog_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_campaigns: {
        Row: {
          auto_post: boolean | null
          created_at: string
          frequency: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_post?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_post?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_netlinking: {
        Row: {
          anchor_text: string
          article_id: string | null
          click_count: number | null
          created_at: string | null
          id: string
          link_type: string | null
          target_url: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anchor_text: string
          article_id?: string | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          link_type?: string | null
          target_url: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anchor_text?: string
          article_id?: string | null
          click_count?: number | null
          created_at?: string | null
          id?: string
          link_type?: string | null
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
        ]
      }
      blog_opportunities: {
        Row: {
          article_id: string | null
          article_title: string
          created_at: string
          difficulty: string | null
          estimated_word_count: number | null
          generated_at: string | null
          id: string
          intro_excerpt: string | null
          language: string | null
          meta_description: string | null
          primary_keywords: string[] | null
          product_ids: string[] | null
          secondary_keywords: string[] | null
          seo_opportunity_score: number | null
          status: string | null
          structure: Json | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          article_title: string
          created_at?: string
          difficulty?: string | null
          estimated_word_count?: number | null
          generated_at?: string | null
          id?: string
          intro_excerpt?: string | null
          language?: string | null
          meta_description?: string | null
          primary_keywords?: string[] | null
          product_ids?: string[] | null
          secondary_keywords?: string[] | null
          seo_opportunity_score?: number | null
          status?: string | null
          structure?: Json | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          article_title?: string
          created_at?: string
          difficulty?: string | null
          estimated_word_count?: number | null
          generated_at?: string | null
          id?: string
          intro_excerpt?: string | null
          language?: string | null
          meta_description?: string | null
          primary_keywords?: string[] | null
          product_ids?: string[] | null
          secondary_keywords?: string[] | null
          seo_opportunity_score?: number | null
          status?: string | null
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
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
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
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          shop_name: string
          state_token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          shop_name: string
          state_token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          shop_name?: string
          state_token?: string
          user_id?: string
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
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          height: number | null
          id: string
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
          current_plan_id: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          preferred_language: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_plan_id?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          preferred_language?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_plan_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_language?: string | null
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
      shopify_connections: {
        Row: {
          access_token: string
          created_at: string
          encrypted_token: string | null
          id: string
          is_active: boolean | null
          is_encrypted: boolean | null
          store_url: string
          token_iv: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
          store_url: string
          token_iv?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          encrypted_token?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
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
          last_synced_at: string | null
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
          last_synced_at?: string | null
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
          last_synced_at?: string | null
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
          category: string | null
          characteristics: string | null
          chat_text: string | null
          compare_at_price: number | null
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
          handle: string | null
          height: number | null
          height_unit: string | null
          id: string
          image_url: string | null
          imported_at: string | null
          inventory_quantity: number | null
          last_enriched_at: string | null
          last_seo_sync_at: string | null
          length: number | null
          length_unit: string | null
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
          smart_seat_height: number | null
          smart_seat_height_unit: string | null
          smart_weight: number | null
          smart_weight_unit: string | null
          smart_width: number | null
          smart_width_unit: string | null
          status: string | null
          store_id: string | null
          style: string | null
          sub_category: string | null
          tags: string | null
          title: string
          updated_at: string
          vendor: string | null
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
          category?: string | null
          characteristics?: string | null
          chat_text?: string | null
          compare_at_price?: number | null
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
          handle?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          image_url?: string | null
          imported_at?: string | null
          inventory_quantity?: number | null
          last_enriched_at?: string | null
          last_seo_sync_at?: string | null
          length?: number | null
          length_unit?: string | null
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
          smart_seat_height?: number | null
          smart_seat_height_unit?: string | null
          smart_weight?: number | null
          smart_weight_unit?: string | null
          smart_width?: number | null
          smart_width_unit?: string | null
          status?: string | null
          store_id?: string | null
          style?: string | null
          sub_category?: string | null
          tags?: string | null
          title: string
          updated_at?: string
          vendor?: string | null
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
          category?: string | null
          characteristics?: string | null
          chat_text?: string | null
          compare_at_price?: number | null
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
          handle?: string | null
          height?: number | null
          height_unit?: string | null
          id?: string
          image_url?: string | null
          imported_at?: string | null
          inventory_quantity?: number | null
          last_enriched_at?: string | null
          last_seo_sync_at?: string | null
          length?: number | null
          length_unit?: string | null
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
          smart_seat_height?: number | null
          smart_seat_height_unit?: string | null
          smart_weight?: number | null
          smart_weight_unit?: string | null
          smart_width?: number | null
          smart_width_unit?: string | null
          status?: string | null
          store_id?: string | null
          style?: string | null
          sub_category?: string | null
          tags?: string | null
          title?: string
          updated_at?: string
          vendor?: string | null
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
          price_yearly: number
          recommended: boolean | null
          stripe_price_id: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
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
          price_yearly: number
          recommended?: boolean | null
          stripe_price_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
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
          price_yearly?: number
          recommended?: boolean | null
          stripe_price_id?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
