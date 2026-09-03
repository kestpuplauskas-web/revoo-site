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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          base_currency: Database["public"]["Enums"]["currency_code"]
          default_hourly_internal_cost: number
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          base_currency?: Database["public"]["Enums"]["currency_code"]
          default_hourly_internal_cost?: number
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["currency_code"]
          default_hourly_internal_cost?: number
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      client_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"] | null
          author_id: string | null
          body: string | null
          client_id: string
          created_at: string
          field: string | null
          id: string
          kind: Database["public"]["Enums"]["activity_kind"]
          new_value: string | null
          occurred_at: string
          old_value: string | null
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          author_id?: string | null
          body?: string | null
          client_id: string
          created_at?: string
          field?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"] | null
          author_id?: string | null
          body?: string | null
          client_id?: string
          created_at?: string
          field?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["activity_kind"]
          new_value?: string | null
          occurred_at?: string
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          client_id: string
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          monthly_subscription: number | null
          next_payment_date: string | null
          setup_fee: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          monthly_subscription?: number | null
          next_payment_date?: string | null
          setup_fee?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          monthly_subscription?: number | null
          next_payment_date?: string | null
          setup_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_to: string | null
          building_area_sqm: number | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          developer: string | null
          id: string
          name: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          property_type: string | null
          source_lead_id: string | null
          status: Database["public"]["Enums"]["client_status"]
          units_count: number | null
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          assigned_to?: string | null
          building_area_sqm?: number | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          developer?: string | null
          id?: string
          name: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          property_type?: string | null
          source_lead_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          units_count?: number | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          building_area_sqm?: number | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          developer?: string | null
          id?: string
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          property_type?: string | null
          source_lead_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          units_count?: number | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archived_at: string | null
          country: string | null
          created_at: string
          current_system: string | null
          email: string
          id: string
          lang: string
          name: string
          notes: string | null
          property_name: string
          property_type: string | null
          read_at: string | null
          source: string | null
          units: string | null
          user_agent: string | null
        }
        Insert: {
          archived_at?: string | null
          country?: string | null
          created_at?: string
          current_system?: string | null
          email: string
          id?: string
          lang?: string
          name: string
          notes?: string | null
          property_name: string
          property_type?: string | null
          read_at?: string | null
          source?: string | null
          units?: string | null
          user_agent?: string | null
        }
        Update: {
          archived_at?: string | null
          country?: string | null
          created_at?: string
          current_system?: string | null
          email?: string
          id?: string
          lang?: string
          name?: string
          notes?: string | null
          property_name?: string
          property_type?: string | null
          read_at?: string | null
          source?: string | null
          units?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          project_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          blocks: Json
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          excerpt: string
          h1: string
          id: string
          lang: string
          meta_description: string
          meta_title: string
          published_at: string
          reading_time: number
          slug: string
          status: string
          title: string
          translation_group: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt: string
          h1: string
          id?: string
          lang: string
          meta_description: string
          meta_title: string
          published_at?: string
          reading_time?: number
          slug: string
          status?: string
          title: string
          translation_group?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string
          h1?: string
          id?: string
          lang?: string
          meta_description?: string
          meta_title?: string
          published_at?: string
          reading_time?: number
          slug?: string
          status?: string
          title?: string
          translation_group?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          github_url: string | null
          id: string
          launch_date: string | null
          lovable_url: string | null
          notes: string | null
          project_name: string
          project_status: Database["public"]["Enums"]["project_status"]
          supabase_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          github_url?: string | null
          id?: string
          launch_date?: string | null
          lovable_url?: string | null
          notes?: string | null
          project_name: string
          project_status?: Database["public"]["Enums"]["project_status"]
          supabase_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          github_url?: string | null
          id?: string
          launch_date?: string | null
          lovable_url?: string | null
          notes?: string | null
          project_name?: string
          project_status?: Database["public"]["Enums"]["project_status"]
          supabase_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          client_id: string
          created_at: string
          description: string | null
          id: string
          internal_notes: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          project_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"]
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          project_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          category: Database["public"]["Enums"]["time_category"]
          client_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          entry_date: string
          hourly_internal_cost: number | null
          id: string
          project_id: string | null
          support_ticket_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["time_category"]
          client_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          entry_date: string
          hourly_internal_cost?: number | null
          id?: string
          project_id?: string | null
          support_ticket_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["time_category"]
          client_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          entry_date?: string
          hourly_internal_cost?: number | null
          id?: string
          project_id?: string | null
          support_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_support_ticket_id_fkey"
            columns: ["support_ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
    }
    Enums: {
      activity_kind: "manual" | "system"
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "demo"
        | "proposal"
        | "note"
        | "task"
      app_role: "admin"
      client_status:
        | "lead"
        | "negotiation"
        | "onboarding"
        | "active"
        | "paused"
        | "cancelled"
        | "contacted"
        | "awaiting_reply"
        | "replied"
        | "demo_scheduled"
        | "proposal_sent"
        | "won"
        | "lost"
      currency_code: "EUR" | "USD" | "GBP" | "PLN" | "ISK" | "OTHER"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_type: "setup" | "subscription" | "additional" | "refund"
      project_status:
        | "planning"
        | "development"
        | "onboarding"
        | "active"
        | "paused"
        | "cancelled"
      ticket_category:
        | "bug"
        | "question"
        | "feature_request"
        | "configuration"
        | "content"
        | "billing"
        | "technical"
        | "other"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "new"
        | "in_progress"
        | "waiting_for_client"
        | "resolved"
        | "closed"
      time_category:
        | "support"
        | "development"
        | "onboarding"
        | "maintenance"
        | "meeting"
        | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      activity_kind: ["manual", "system"],
      activity_type: [
        "call",
        "email",
        "meeting",
        "demo",
        "proposal",
        "note",
        "task",
      ],
      app_role: ["admin"],
      client_status: [
        "lead",
        "negotiation",
        "onboarding",
        "active",
        "paused",
        "cancelled",
        "contacted",
        "awaiting_reply",
        "replied",
        "demo_scheduled",
        "proposal_sent",
        "won",
        "lost",
      ],
      currency_code: ["EUR", "USD", "GBP", "PLN", "ISK", "OTHER"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      payment_type: ["setup", "subscription", "additional", "refund"],
      project_status: [
        "planning",
        "development",
        "onboarding",
        "active",
        "paused",
        "cancelled",
      ],
      ticket_category: [
        "bug",
        "question",
        "feature_request",
        "configuration",
        "content",
        "billing",
        "technical",
        "other",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "new",
        "in_progress",
        "waiting_for_client",
        "resolved",
        "closed",
      ],
      time_category: [
        "support",
        "development",
        "onboarding",
        "maintenance",
        "meeting",
        "other",
      ],
    },
  },
} as const
