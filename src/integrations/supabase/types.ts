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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          historical_tes: number
          id: string
          name: string
          order_count: number
          persona: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          historical_tes?: number
          id?: string
          name: string
          order_count?: number
          persona?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          historical_tes?: number
          id?: string
          name?: string
          order_count?: number
          persona?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          actual_minutes: number | null
          created_at: string
          customer_id: string | null
          delays: Json
          hex_id: number
          id: string
          order_id: string
          persona: string
          promise_minutes: number | null
          rider_id: string | null
          status: string
          tes_score: number | null
          updated_at: string
        }
        Insert: {
          actual_minutes?: number | null
          created_at?: string
          customer_id?: string | null
          delays?: Json
          hex_id: number
          id?: string
          order_id: string
          persona?: string
          promise_minutes?: number | null
          rider_id?: string | null
          status?: string
          tes_score?: number | null
          updated_at?: string
        }
        Update: {
          actual_minutes?: number | null
          created_at?: string
          customer_id?: string | null
          delays?: Json
          hex_id?: number
          id?: string
          order_id?: string
          persona?: string
          promise_minutes?: number | null
          rider_id?: string | null
          status?: string
          tes_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          archetype: string
          created_at: string
          hex_position: number
          id: string
          locality_awareness: number
          name: string
          orders_per_hex: Json
          rating: number
          rider_id: string
          speed_factor: number
          status: string
          updated_at: string
        }
        Insert: {
          archetype: string
          created_at?: string
          hex_position?: number
          id?: string
          locality_awareness?: number
          name: string
          orders_per_hex?: Json
          rating?: number
          rider_id: string
          speed_factor?: number
          status?: string
          updated_at?: string
        }
        Update: {
          archetype?: string
          created_at?: string
          hex_position?: number
          id?: string
          locality_awareness?: number
          name?: string
          orders_per_hex?: Json
          rating?: number
          rider_id?: string
          speed_factor?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_health: {
        Row: {
          id: string
          packer_congestion: number
          packing_sla: number
          picking_sla: number
          picking_variance: number
          store_name: string
          updated_at: string
        }
        Insert: {
          id?: string
          packer_congestion?: number
          packing_sla?: number
          picking_sla?: number
          picking_variance?: number
          store_name?: string
          updated_at?: string
        }
        Update: {
          id?: string
          packer_congestion?: number
          packing_sla?: number
          picking_sla?: number
          picking_variance?: number
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_locations: {
        Row: {
          created_at: string
          hex_id: number
          id: string
          lat: number
          lng: number
          name: string
        }
        Insert: {
          created_at?: string
          hex_id?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
        }
        Update: {
          created_at?: string
          hex_id?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
