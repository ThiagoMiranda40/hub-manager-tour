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
      artists: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      cast_members: {
        Row: {
          created_at: string
          id: string
          name: string
          person_id: string | null
          role: string
          show_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          person_id?: string | null
          role?: string
          show_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          person_id?: string | null
          role?: string
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cast_members_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      cast_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          reimbursable: boolean
          required: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          reimbursable?: boolean
          required?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          reimbursable?: boolean
          required?: boolean
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          amount: number | null
          cast_member_id: string
          created_at: string
          doc_type: string
          file_name: string | null
          file_path: string
          id: string
          is_reimbursement: boolean
          is_reimbursed: boolean
          note: string | null
          reimbursed_at: string | null
          show_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cast_member_id: string
          created_at?: string
          doc_type: string
          file_name?: string | null
          file_path: string
          id?: string
          is_reimbursement?: boolean
          is_reimbursed?: boolean
          note?: string | null
          reimbursed_at?: string | null
          show_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cast_member_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string | null
          file_path?: string
          id?: string
          is_reimbursement?: boolean
          is_reimbursed?: boolean
          note?: string | null
          reimbursed_at?: string | null
          show_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_cast_member_id_fkey"
            columns: ["cast_member_id"]
            isOneToOne: false
            referencedRelation: "cast_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_id: string | null
          city: string
          created_at: string
          id: string
          public_token: string
          rider_public_token: string
          show_date: string
          tour_id: string | null
          user_id: string
          venue: string | null
        }
        Insert: {
          artist_id?: string | null
          city: string
          created_at?: string
          id?: string
          public_token?: string
          rider_public_token?: string
          show_date: string
          tour_id?: string | null
          user_id: string
          venue?: string | null
        }
        Update: {
          artist_id?: string | null
          city?: string
          created_at?: string
          id?: string
          public_token?: string
          rider_public_token?: string
          show_date?: string
          tour_id?: string | null
          user_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shows_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          default_role_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          pix_key: string | null
          pix_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_role_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_role_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      person_artists: {
        Row: {
          artist_id: string | null
          created_at: string
          id: string
          is_general_crew: boolean
          person_id: string
          user_id: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          id?: string
          is_general_crew?: boolean
          person_id: string
          user_id: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          id?: string
          is_general_crew?: boolean
          person_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_artists_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      show_requirements: {
        Row: {
          cast_member_id: string
          created_at: string
          deadline_date: string | null
          document_type_id: string
          id: string
          required: boolean
          show_id: string
          user_id: string
        }
        Insert: {
          cast_member_id: string
          created_at?: string
          deadline_date?: string | null
          document_type_id: string
          id?: string
          required?: boolean
          show_id: string
          user_id: string
        }
        Update: {
          cast_member_id?: string
          created_at?: string
          deadline_date?: string | null
          document_type_id?: string
          id?: string
          required?: boolean
          show_id?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_rider_template_items: {
        Row: {
          artist_id: string
          category: string
          created_at: string
          id: string
          is_mandatory: boolean
          item_name: string
          position: number
          quantity: number
          specification: string | null
          user_id: string
        }
        Insert: {
          artist_id: string
          category: string
          created_at?: string
          id?: string
          is_mandatory?: boolean
          item_name: string
          position?: number
          quantity?: number
          specification?: string | null
          user_id: string
        }
        Update: {
          artist_id?: string
          category?: string
          created_at?: string
          id?: string
          is_mandatory?: boolean
          item_name?: string
          position?: number
          quantity?: number
          specification?: string | null
          user_id?: string
        }
        Relationships: []
      }
      show_rider_items: {
        Row: {
          category: string
          confirmed_by_venue_at: string | null
          created_at: string
          exception_note: string | null
          id: string
          is_mandatory: boolean
          item_name: string
          physical_check: string
          physical_divergence_note: string | null
          position: number
          quantity: number
          show_id: string
          specification: string | null
          status: string
          template_item_id: string | null
          user_id: string
        }
        Insert: {
          category: string
          confirmed_by_venue_at?: string | null
          created_at?: string
          exception_note?: string | null
          id?: string
          is_mandatory?: boolean
          item_name: string
          physical_check?: string
          physical_divergence_note?: string | null
          position?: number
          quantity?: number
          show_id: string
          specification?: string | null
          status?: string
          template_item_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          confirmed_by_venue_at?: string | null
          created_at?: string
          exception_note?: string | null
          id?: string
          is_mandatory?: boolean
          item_name?: string
          physical_check?: string
          physical_divergence_note?: string | null
          position?: number
          quantity?: number
          show_id?: string
          specification?: string | null
          status?: string
          template_item_id?: string | null
          user_id?: string
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
