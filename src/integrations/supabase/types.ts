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
      api_key_permissions: {
        Row: {
          api_key_id: string
          created_at: string | null
          id: string
          permission: string
          resource: string
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          id?: string
          permission: string
          resource: string
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          id?: string
          permission?: string
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_permissions_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_weddings: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          id: string
          wedding_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          wedding_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          id?: string
          wedding_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_weddings_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_key_weddings_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string | null
          api_key_hash: string | null
          api_key_preview: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
        }
        Insert: {
          api_key?: string | null
          api_key_hash?: string | null
          api_key_preview?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
        }
        Update: {
          api_key?: string | null
          api_key_hash?: string | null
          api_key_preview?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
        }
        Relationships: []
      }
      famiglie: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          wedding_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          wedding_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "famiglie_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      gruppi: {
        Row: {
          colore: string
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
          wedding_id: string
        }
        Insert: {
          colore: string
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          wedding_id: string
        }
        Update: {
          colore?: string
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gruppi_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      invitati: {
        Row: {
          cellulare: string | null
          cognome: string
          created_at: string | null
          email: string | null
          famiglia_id: string | null
          gruppo_id: string | null
          id: string
          is_capo_famiglia: boolean | null
          nome: string
          posto_numero: number | null
          preferenze_alimentari: string[] | null
          rsvp_status: string | null
          rsvp_updated_at: string | null
          rsvp_uuid: string | null
          tavolo_id: string | null
          tipo_ospite: string
          wedding_id: string
          whatsapp_date_created: string | null
          whatsapp_date_sent: string | null
          whatsapp_date_updated: string | null
          whatsapp_message_body: string | null
          whatsapp_message_currency: string | null
          whatsapp_message_from: string | null
          whatsapp_message_price: number | null
          whatsapp_message_sid: string | null
          whatsapp_message_status: string | null
          whatsapp_rsvp_inviato: boolean | null
          whatsapp_rsvp_inviato_at: string | null
        }
        Insert: {
          cellulare?: string | null
          cognome: string
          created_at?: string | null
          email?: string | null
          famiglia_id?: string | null
          gruppo_id?: string | null
          id?: string
          is_capo_famiglia?: boolean | null
          nome: string
          posto_numero?: number | null
          preferenze_alimentari?: string[] | null
          rsvp_status?: string | null
          rsvp_updated_at?: string | null
          rsvp_uuid?: string | null
          tavolo_id?: string | null
          tipo_ospite: string
          wedding_id: string
          whatsapp_date_created?: string | null
          whatsapp_date_sent?: string | null
          whatsapp_date_updated?: string | null
          whatsapp_message_body?: string | null
          whatsapp_message_currency?: string | null
          whatsapp_message_from?: string | null
          whatsapp_message_price?: number | null
          whatsapp_message_sid?: string | null
          whatsapp_message_status?: string | null
          whatsapp_rsvp_inviato?: boolean | null
          whatsapp_rsvp_inviato_at?: string | null
        }
        Update: {
          cellulare?: string | null
          cognome?: string
          created_at?: string | null
          email?: string | null
          famiglia_id?: string | null
          gruppo_id?: string | null
          id?: string
          is_capo_famiglia?: boolean | null
          nome?: string
          posto_numero?: number | null
          preferenze_alimentari?: string[] | null
          rsvp_status?: string | null
          rsvp_updated_at?: string | null
          rsvp_uuid?: string | null
          tavolo_id?: string | null
          tipo_ospite?: string
          wedding_id?: string
          whatsapp_date_created?: string | null
          whatsapp_date_sent?: string | null
          whatsapp_date_updated?: string | null
          whatsapp_message_body?: string | null
          whatsapp_message_currency?: string | null
          whatsapp_message_from?: string | null
          whatsapp_message_price?: number | null
          whatsapp_message_sid?: string | null
          whatsapp_message_status?: string | null
          whatsapp_rsvp_inviato?: boolean | null
          whatsapp_rsvp_inviato_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitati_famiglia_id_fkey"
            columns: ["famiglia_id"]
            isOneToOne: false
            referencedRelation: "famiglie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitati_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitati_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "tavoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitati_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      preferenze_alimentari_custom: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          wedding_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          wedding_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferenze_alimentari_custom_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      tavoli: {
        Row: {
          capienza: number
          created_at: string | null
          id: string
          nome: string
          posizione_x: number | null
          posizione_y: number | null
          rotazione: number | null
          tipo: string
          wedding_id: string
        }
        Insert: {
          capienza: number
          created_at?: string | null
          id?: string
          nome: string
          posizione_x?: number | null
          posizione_y?: number | null
          rotazione?: number | null
          tipo: string
          wedding_id: string
        }
        Update: {
          capienza?: number
          created_at?: string | null
          id?: string
          nome?: string
          posizione_x?: number | null
          posizione_y?: number | null
          rotazione?: number | null
          tipo?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tavoli_wedding"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wedding_spouses: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_spouses_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          ceremony_location: string
          couple_name: string
          created_at: string | null
          enable_multi_rsvp: boolean
          id: string
          password: string | null
          reception_location: string | null
          service_cost: number
          updated_at: string | null
          webhook_url: string | null
          wedding_date: string
        }
        Insert: {
          ceremony_location: string
          couple_name: string
          created_at?: string | null
          enable_multi_rsvp?: boolean
          id?: string
          password?: string | null
          reception_location?: string | null
          service_cost: number
          updated_at?: string | null
          webhook_url?: string | null
          wedding_date: string
        }
        Update: {
          ceremony_location?: string
          couple_name?: string
          created_at?: string | null
          enable_multi_rsvp?: boolean
          id?: string
          password?: string | null
          reception_location?: string | null
          service_cost?: number
          updated_at?: string | null
          webhook_url?: string | null
          wedding_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_tavolo_position: {
        Args: {
          _password_attempt: string
          _posizione_x: number
          _posizione_y: number
          _rotazione?: number
          _tavolo_id: string
          _wedding_id: string
        }
        Returns: boolean
      }
      verify_wedding_password: {
        Args: { _password_attempt: string; _wedding_id: string }
        Returns: {
          couple_name: string
          verified: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "sposi"
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
      app_role: ["admin", "sposi"],
    },
  },
} as const
