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
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          target_roles: string[] | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_roles?: string[] | null
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_roles?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      bids: {
        Row: {
          amount: number
          created_at: string | null
          freelancer_id: string
          id: string
          project_id: string
          proposal: string | null
          status: Database["public"]["Enums"]["bid_status"]
          timeline: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          freelancer_id: string
          id?: string
          project_id: string
          proposal?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          timeline: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          freelancer_id?: string
          id?: string
          project_id?: string
          proposal?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          timeline?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_invites: {
        Row: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          receiver_email: string
          receiver_id: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          receiver_email: string
          receiver_id?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          receiver_email?: string
          receiver_id?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      consultancy_availability: {
        Row: {
          consultant_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          consultant_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          consultant_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      consultancy_bookings: {
        Row: {
          client_id: string
          consultant_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          notes: string | null
          report_url: string | null
          session_date: string
          status: string | null
        }
        Insert: {
          client_id: string
          consultant_id: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          notes?: string | null
          report_url?: string | null
          session_date: string
          status?: string | null
        }
        Update: {
          client_id?: string
          consultant_id?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          report_url?: string | null
          session_date?: string
          status?: string | null
        }
        Relationships: []
      }
      consultancy_documents: {
        Row: {
          booking_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploader_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploader_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultancy_documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "consultancy_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      consultancy_payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          payment_method: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultancy_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "consultancy_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_profiles: {
        Row: {
          availability_notes: string | null
          bio_long: string | null
          certifications: string[] | null
          company_name: string | null
          consultation_slots: Json | null
          created_at: string
          hourly_rate: number
          id: string
          is_company: boolean
          mentor_mode_enabled: boolean | null
          specialization: string[] | null
          updated_at: string
          user_id: string
          years_experience: number
        }
        Insert: {
          availability_notes?: string | null
          bio_long?: string | null
          certifications?: string[] | null
          company_name?: string | null
          consultation_slots?: Json | null
          created_at?: string
          hourly_rate?: number
          id?: string
          is_company?: boolean
          mentor_mode_enabled?: boolean | null
          specialization?: string[] | null
          updated_at?: string
          user_id: string
          years_experience?: number
        }
        Update: {
          availability_notes?: string | null
          bio_long?: string | null
          certifications?: string[] | null
          company_name?: string | null
          consultation_slots?: Json | null
          created_at?: string
          hourly_rate?: number
          id?: string
          is_company?: boolean
          mentor_mode_enabled?: boolean | null
          specialization?: string[] | null
          updated_at?: string
          user_id?: string
          years_experience?: number
        }
        Relationships: []
      }
      consultant_reports: {
        Row: {
          booking_id: string | null
          consultant_id: string
          content: string
          created_at: string
          file_url: string | null
          id: string
          project_id: string | null
          rating: number | null
          shared_with: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          consultant_id: string
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          shared_with?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          consultant_id?: string
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          shared_with?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultant_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "consultancy_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultant_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation: {
        Row: {
          action_taken: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          moderator_notes: string | null
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          action_taken?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          moderator_notes?: string | null
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          action_taken?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          moderator_notes?: string | null
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          against_user: string | null
          created_at: string
          description: string
          dispute_type: string
          id: string
          project_id: string | null
          raised_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          against_user?: string | null
          created_at?: string
          description: string
          dispute_type: string
          id?: string
          project_id?: string | null
          raised_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          against_user?: string | null
          created_at?: string
          description?: string
          dispute_type?: string
          id?: string
          project_id?: string | null
          raised_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          project_id: string
          uploader_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          project_id: string
          uploader_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          project_id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id_1: string
          user_id_2: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: []
      }
      mentorship_requests: {
        Row: {
          created_at: string
          id: string
          idea_id: string | null
          mentee_id: string
          mentor_id: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id?: string | null
          mentee_id: string
          mentor_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string | null
          mentee_id?: string
          mentor_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          id: string
          project_id: string
          title: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id: string
          title: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          full_name: string | null
          github: string | null
          hourly_rate: number | null
          id: string
          linkedin: string | null
          location: string | null
          phone: string | null
          position: string | null
          skills: string[] | null
          trust_level: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          github?: string | null
          hourly_rate?: number | null
          id?: string
          linkedin?: string | null
          location?: string | null
          phone?: string | null
          position?: string | null
          skills?: string[] | null
          trust_level?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          full_name?: string | null
          github?: string | null
          hourly_rate?: number | null
          id?: string
          linkedin?: string | null
          location?: string | null
          phone?: string | null
          position?: string | null
          skills?: string[] | null
          trust_level?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number
          client_id: string
          created_at: string | null
          deadline: string | null
          description: string
          id: string
          skills_required: string[] | null
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          budget: number
          client_id: string
          created_at?: string | null
          deadline?: string | null
          description: string
          id?: string
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: number
          client_id?: string
          created_at?: string | null
          deadline?: string | null
          description?: string
          id?: string
          skills_required?: string[] | null
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      skill_analytics: {
        Row: {
          avg_rating: number | null
          created_at: string
          id: string
          last_used_at: string | null
          proficiency_level: number
          projects_completed: number
          skill: string
          total_earnings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          proficiency_level?: number
          projects_completed?: number
          skill: string
          total_earnings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          proficiency_level?: number
          projects_completed?: number
          skill?: string
          total_earnings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      whiteboard_objects: {
        Row: {
          created_at: string
          created_by: string
          id: string
          object_data: Json
          object_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          object_data: Json
          object_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          object_data?: Json
          object_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_objects_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboard_sessions: {
        Row: {
          created_at: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      is_project_collaborator: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client" | "freelancer" | "consultant"
      bid_status: "pending" | "accepted" | "rejected" | "withdrawn"
      project_status: "open" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "client", "freelancer", "consultant"],
      bid_status: ["pending", "accepted", "rejected", "withdrawn"],
      project_status: ["open", "in_progress", "completed", "cancelled"],
    },
  },
} as const
