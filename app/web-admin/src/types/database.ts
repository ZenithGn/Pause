export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Initial Supabase Database TypeScript definitions matching supabase/migrations/.
 * Regenerate against a live local Supabase instance via: npm run gen:types
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          phone: string | null;
          max_drawers: number;
          role: "user" | "admin";
          is_premium: boolean;
          is_locked: boolean;
          locked_at: string | null;
          locked_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          max_drawers?: number;
          role?: "user" | "admin";
          is_premium?: boolean;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          max_drawers?: number;
          role?: "user" | "admin";
          is_premium?: boolean;
          is_locked?: boolean;
          locked_at?: string | null;
          locked_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drawers: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          cover_photo_url: string | null;
          storage_used_bytes: number;
          storage_limit_bytes: number;
          is_purchased: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          cover_photo_url?: string | null;
          storage_used_bytes?: number;
          storage_limit_bytes?: number;
          is_purchased?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          cover_photo_url?: string | null;
          storage_used_bytes?: number;
          storage_limit_bytes?: number;
          is_purchased?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          drawer_id: string;
          uploaded_by: string;
          original_url: string;
          thumbnail_url: string | null;
          file_size_bytes: number;
          mime_type: string;
          width: number | null;
          height: number | null;
          taken_at: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          drawer_id: string;
          uploaded_by: string;
          original_url: string;
          thumbnail_url?: string | null;
          file_size_bytes: number;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          taken_at?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          drawer_id?: string;
          uploaded_by?: string;
          original_url?: string;
          thumbnail_url?: string | null;
          file_size_bytes?: number;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          taken_at?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      drawer_shares: {
        Row: {
          id: string;
          drawer_id: string;
          owner_id: string;
          shared_with_id: string;
          permission: "view" | "edit";
          status: "pending" | "accepted" | "rejected";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          drawer_id: string;
          owner_id: string;
          shared_with_id: string;
          permission: "view" | "edit";
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          drawer_id?: string;
          owner_id?: string;
          shared_with_id?: string;
          permission?: "view" | "edit";
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      photobooth_templates: {
        Row: {
          id: string;
          name: string;
          category: string;
          preview_url: string;
          slot_count: number;
          is_premium: boolean;
          is_active: boolean;
          layout_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          preview_url: string;
          slot_count: number;
          is_premium?: boolean;
          is_active?: boolean;
          layout_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          preview_url?: string;
          slot_count?: number;
          is_premium?: boolean;
          is_active?: boolean;
          layout_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photobooth_items: {
        Row: {
          id: string;
          user_id: string;
          template_id: string;
          preview_url: string | null;
          status: "draft" | "completed" | "ordered";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id: string;
          preview_url?: string | null;
          status?: "draft" | "completed" | "ordered";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string;
          preview_url?: string | null;
          status?: "draft" | "completed" | "ordered";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photobooth_photos: {
        Row: {
          id: string;
          photobooth_item_id: string;
          photo_id: string;
          slot_index: number;
        };
        Insert: {
          id?: string;
          photobooth_item_id: string;
          photo_id: string;
          slot_index: number;
        };
        Update: {
          id?: string;
          photobooth_item_id?: string;
          photo_id?: string;
          slot_index?: number;
        };
        Relationships: [];
      };
      membership_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_vnd: number;
          duration_type: "monthly" | "yearly";
          extra_drawers: number;
          extra_storage_bytes: number;
          access_premium_templates: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_vnd: number;
          duration_type: "monthly" | "yearly";
          extra_drawers?: number;
          extra_storage_bytes?: number;
          access_premium_templates?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price_vnd?: number;
          duration_type?: "monthly" | "yearly";
          extra_drawers?: number;
          extra_storage_bytes?: number;
          access_premium_templates?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          started_at: string;
          expires_at: string;
          status: "active" | "expired" | "cancelled";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          started_at?: string;
          expires_at: string;
          status?: "active" | "expired" | "cancelled";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          started_at?: string;
          expires_at?: string;
          status?: "active" | "expired" | "cancelled";
          created_at?: string;
        };
        Relationships: [];
      };
      print_orders: {
        Row: {
          id: string;
          user_id: string;
          photobooth_item_id: string;
          quantity: number;
          unit_price_vnd: number;
          total_price_vnd: number;
          shipping_name: string;
          shipping_phone: string;
          shipping_address: string;
          note: string | null;
          cover_type: "soft" | "hard";
          paper_type: "standard" | "premium";
          status:
            | "pending"
            | "processing"
            | "printing"
            | "shipping"
            | "completed"
            | "cancelled";
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photobooth_item_id: string;
          quantity?: number;
          unit_price_vnd: number;
          total_price_vnd: number;
          shipping_name: string;
          shipping_phone: string;
          shipping_address: string;
          note?: string | null;
          cover_type?: "soft" | "hard";
          paper_type?: "standard" | "premium";
          status?:
            | "pending"
            | "processing"
            | "printing"
            | "shipping"
            | "completed"
            | "cancelled";
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          photobooth_item_id?: string;
          quantity?: number;
          unit_price_vnd?: number;
          total_price_vnd?: number;
          shipping_name?: string;
          shipping_phone?: string;
          shipping_address?: string;
          note?: string | null;
          cover_type?: "soft" | "hard";
          paper_type?: "standard" | "premium";
          status?:
            | "pending"
            | "processing"
            | "printing"
            | "shipping"
            | "completed"
            | "cancelled";
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      print_order_status_history: {
        Row: {
          id: string;
          order_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          membership_id: string | null;
          drawer_id: string | null;
          type: "print_order" | "membership" | "drawer_purchase";
          amount_vnd: number;
          payment_method: string | null;
          payment_gateway_ref: string | null;
          order_code: number | null;
          status: "pending" | "success" | "failed" | "refunded";
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          membership_id?: string | null;
          drawer_id?: string | null;
          type: "print_order" | "membership" | "drawer_purchase";
          amount_vnd: number;
          payment_method?: string | null;
          payment_gateway_ref?: string | null;
          order_code?: number | null;
          status?: "pending" | "success" | "failed" | "refunded";
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          membership_id?: string | null;
          drawer_id?: string | null;
          type?: "print_order" | "membership" | "drawer_purchase";
          amount_vnd?: number;
          payment_method?: string | null;
          payment_gateway_ref?: string | null;
          order_code?: number | null;
          status?: "pending" | "success" | "failed" | "refunded";
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "drawer_share" | "print_order" | "membership" | "system";
          title: string;
          body: string | null;
          data: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "drawer_share" | "print_order" | "membership" | "system";
          title: string;
          body?: string | null;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "drawer_share" | "print_order" | "membership" | "system";
          title?: string;
          body?: string | null;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_users: {
        Args: {
          p_search?: string | null;
          p_tier?: string | null;
          p_status?: string | null;
          p_role?: string | null;
          p_sort?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: string;
          tier: string;
          is_locked: boolean;
          drawer_count: number;
          created_at: string;
          last_sign_in_at: string | null;
          total_count: number;
        }[];
      };
      admin_get_user_detail: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      admin_set_user_lock: {
        Args: {
          p_user_id: string;
          p_locked: boolean;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      admin_list_templates: {
        Args: {
          p_search?: string | null;
          p_category?: string | null;
          p_is_premium?: boolean | null;
          p_is_active?: boolean | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          name: string;
          category: string;
          preview_url: string;
          slot_count: number;
          is_premium: boolean;
          is_active: boolean;
          usage_count: number;
          updated_at: string;
          total_count: number;
        }[];
      };
      admin_upsert_template: {
        Args: {
          p_id?: string | null;
          p_name?: string;
          p_category?: string;
          p_preview_url?: string;
          p_is_premium?: boolean;
          p_is_active?: boolean;
          p_layout_config?: Json;
        };
        Returns: Json;
      };
      admin_set_template_active: {
        Args: {
          p_id: string;
          p_active: boolean;
        };
        Returns: undefined;
      };
      admin_delete_template: {
        Args: {
          p_id: string;
        };
        Returns: undefined;
      };
      admin_list_orders: {
        Args: {
          p_status?: string | null;
          p_search?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_sort?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          short_code: string;
          user_id: string;
          customer_name: string;
          shipping_phone: string;
          template_name: string;
          preview_url: string | null;
          quantity: number;
          total_price_vnd: number;
          status: string;
          payment_status: string | null;
          payment_method: string | null;
          created_at: string;
          total_count: number;
        }[];
      };
      admin_order_status_counts: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
        };
        Returns: {
          status: string;
          count: number;
        }[];
      };
      admin_get_order_detail: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      admin_update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      admin_update_order_notes: {
        Args: {
          p_order_id: string;
          p_admin_notes: string;
        };
        Returns: undefined;
      };
      admin_list_membership_plans: {
        Args: {
          p_include_inactive?: boolean;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          price_vnd: number;
          duration_type: string;
          extra_drawers: number;
          extra_storage_bytes: number;
          access_premium_templates: boolean;
          is_active: boolean;
          created_at: string;
          subscriber_count: number;
          active_subscriber_count: number;
        }[];
      };
      admin_upsert_membership_plan: {
        Args: {
          p_id?: string | null;
          p_name?: string;
          p_description?: string | null;
          p_price_vnd?: number;
          p_duration_type?: string;
          p_extra_drawers?: number;
          p_extra_storage_bytes?: number;
          p_access_premium_templates?: boolean;
          p_is_active?: boolean;
        };
        Returns: Json;
      };
      admin_delete_membership_plan: {
        Args: {
          p_id: string;
        };
        Returns: undefined;
      };
      admin_list_memberships: {
        Args: {
          p_status?: string | null;
          p_plan_id?: string | null;
          p_expiring_within_days?: number | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          display_name: string;
          email: string | null;
          plan_name: string;
          started_at: string;
          expires_at: string;
          days_left: number;
          status: string;
          total_count: number;
        }[];
      };
      admin_list_transactions: {
        Args: {
          p_type?: string | null;
          p_status?: string | null;
          p_search?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          display_name: string;
          type: string;
          amount_vnd: number;
          payment_method: string | null;
          payment_gateway_ref: string | null;
          order_code: number | null;
          status: string;
          order_id: string | null;
          metadata: Json | null;
          created_at: string;
          total_count: number;
        }[];
      };
      admin_dashboard_stats: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
        };
        Returns: Json;
      };
      admin_revenue_series: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
          p_granularity?: string;
        };
        Returns: {
          bucket: string;
          print_revenue_vnd: number;
          membership_revenue_vnd: number;
          order_count: number;
        }[];
      };
      admin_top_templates: {
        Args: {
          p_from?: string | null;
          p_to?: string | null;
          p_limit?: number;
        };
        Returns: {
          template_id: string;
          name: string;
          preview_url: string;
          order_count: number;
          revenue_vnd: number;
        }[];
      };
      admin_membership_distribution: {
        Args: Record<string, never>;
        Returns: {
          plan_name: string;
          active_count: number;
        }[];
      };
      expire_stale_pending_payments: {
        Args: {
          p_timeout_minutes?: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
