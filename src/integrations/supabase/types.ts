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
      alerts: {
        Row: {
          ai_analysis: string | null
          content_snippet: string | null
          content_url: string | null
          country: string | null
          created_at: string
          detected_at: string
          id: string
          keyword_triggered: string
          platform: string
          severity: string
          source: string
          status: string
          target_name: string | null
        }
        Insert: {
          ai_analysis?: string | null
          content_snippet?: string | null
          content_url?: string | null
          country?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          keyword_triggered: string
          platform: string
          severity?: string
          source?: string
          status?: string
          target_name?: string | null
        }
        Update: {
          ai_analysis?: string | null
          content_snippet?: string | null
          content_url?: string | null
          country?: string | null
          created_at?: string
          detected_at?: string
          id?: string
          keyword_triggered?: string
          platform?: string
          severity?: string
          source?: string
          status?: string
          target_name?: string | null
        }
        Relationships: []
      }
      institutional_directory: {
        Row: {
          category: string
          country: string
          created_at: string
          email_encrypted: string | null
          full_name: string
          id: string
          influence_level: string
          institution: string | null
          notes: string | null
          official_title: string
          phone_encrypted: string | null
          region_jurisdiction: string | null
        }
        Insert: {
          category: string
          country: string
          created_at?: string
          email_encrypted?: string | null
          full_name: string
          id?: string
          influence_level?: string
          institution?: string | null
          notes?: string | null
          official_title: string
          phone_encrypted?: string | null
          region_jurisdiction?: string | null
        }
        Update: {
          category?: string
          country?: string
          created_at?: string
          email_encrypted?: string | null
          full_name?: string
          id?: string
          influence_level?: string
          institution?: string | null
          notes?: string | null
          official_title?: string
          phone_encrypted?: string | null
          region_jurisdiction?: string | null
        }
        Relationships: []
      }
      intelligence_targets: {
        Row: {
          alias: string
          country: string
          created_at: string
          created_by: string | null
          full_name: string | null
          id: string
          location: string | null
          metadata: Json
          mobile_money: string | null
          notes: string | null
          phone: string | null
          primary_platform: string | null
          status: string
          threat_level: string
        }
        Insert: {
          alias: string
          country?: string
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          mobile_money?: string | null
          notes?: string | null
          phone?: string | null
          primary_platform?: string | null
          status?: string
          threat_level?: string
        }
        Update: {
          alias?: string
          country?: string
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          mobile_money?: string | null
          notes?: string | null
          phone?: string | null
          primary_platform?: string | null
          status?: string
          threat_level?: string
        }
        Relationships: []
      }
      legal_cases: {
        Row: {
          authority: string
          bailiff_name: string | null
          case_ref: string
          case_type: string
          country: string
          created_at: string
          id: string
          next_hearing: string | null
          status: string
          summary: string | null
          target_id: string | null
          warrant_type: string | null
        }
        Insert: {
          authority: string
          bailiff_name?: string | null
          case_ref: string
          case_type?: string
          country: string
          created_at?: string
          id?: string
          next_hearing?: string | null
          status?: string
          summary?: string | null
          target_id?: string | null
          warrant_type?: string | null
        }
        Update: {
          authority?: string
          bailiff_name?: string | null
          case_ref?: string
          case_type?: string
          country?: string
          created_at?: string
          id?: string
          next_hearing?: string | null
          status?: string
          summary?: string | null
          target_id?: string | null
          warrant_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_cases_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "intelligence_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbying_engagements: {
        Row: {
          contact_id: string | null
          country: string
          created_at: string
          engagement_type: string
          id: string
          outcome: string | null
          scheduled_for: string | null
          stage: string
          title: string
        }
        Insert: {
          contact_id?: string | null
          country: string
          created_at?: string
          engagement_type?: string
          id?: string
          outcome?: string | null
          scheduled_for?: string | null
          stage?: string
          title: string
        }
        Update: {
          contact_id?: string | null
          country?: string
          created_at?: string
          engagement_type?: string
          id?: string
          outcome?: string | null
          scheduled_for?: string | null
          stage?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lobbying_engagements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "institutional_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      publication_scans: {
        Row: {
          author_handle: string | null
          created_at: string
          created_by: string | null
          defamatory_excerpts: Json
          extracted_info: Json
          id: string
          network: string
          post_url: string
          primary_analysis: string | null
          primary_model: string | null
          raw_content: string | null
          secondary_analysis: string | null
          secondary_model: string | null
          severity: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          author_handle?: string | null
          created_at?: string
          created_by?: string | null
          defamatory_excerpts?: Json
          extracted_info?: Json
          id?: string
          network: string
          post_url: string
          primary_analysis?: string | null
          primary_model?: string | null
          raw_content?: string | null
          secondary_analysis?: string | null
          secondary_model?: string | null
          severity?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          author_handle?: string | null
          created_at?: string
          created_by?: string | null
          defamatory_excerpts?: Json
          extracted_info?: Json
          id?: string
          network?: string
          post_url?: string
          primary_analysis?: string | null
          primary_model?: string | null
          raw_content?: string | null
          secondary_analysis?: string | null
          secondary_model?: string | null
          severity?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_signals: {
        Row: {
          author_handle: string | null
          content: string
          content_url: string | null
          country: string | null
          detected_at: string
          id: string
          keyword: string
          platform: string
          reach: number
          sentiment: string
          threat_level: string
          velocity: number
        }
        Insert: {
          author_handle?: string | null
          content: string
          content_url?: string | null
          country?: string | null
          detected_at?: string
          id?: string
          keyword: string
          platform: string
          reach?: number
          sentiment?: string
          threat_level?: string
          velocity?: number
        }
        Update: {
          author_handle?: string | null
          content?: string
          content_url?: string | null
          country?: string | null
          detected_at?: string
          id?: string
          keyword?: string
          platform?: string
          reach?: number
          sentiment?: string
          threat_level?: string
          velocity?: number
        }
        Relationships: []
      }
      takedown_actions: {
        Row: {
          content_url: string
          created_at: string
          evidence_hash: string | null
          id: string
          legal_dossier_url: string | null
          notes: string | null
          notice_type: string
          platform: string
          status: string
          target_id: string | null
        }
        Insert: {
          content_url: string
          created_at?: string
          evidence_hash?: string | null
          id?: string
          legal_dossier_url?: string | null
          notes?: string | null
          notice_type?: string
          platform: string
          status?: string
          target_id?: string | null
        }
        Update: {
          content_url?: string
          created_at?: string
          evidence_hash?: string | null
          id?: string
          legal_dossier_url?: string | null
          notes?: string | null
          notice_type?: string
          platform?: string
          status?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takedown_actions_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "intelligence_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      target_relations: {
        Row: {
          created_at: string
          id: string
          relation_type: string
          source_id: string
          target_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          relation_type?: string
          source_id: string
          target_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          relation_type?: string
          source_id?: string
          target_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "target_relations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intelligence_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_relations_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "intelligence_targets"
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "analyst"
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
      app_role: ["admin", "analyst"],
    },
  },
} as const
