export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      ai_content_cache: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"];
          category: Database["public"]["Enums"]["game_category"];
          created_at: string;
          difficulty: number;
          id: string;
          payload: Json;
          topic: string;
        };
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"];
          category: Database["public"]["Enums"]["game_category"];
          created_at?: string;
          difficulty?: number;
          id?: string;
          payload: Json;
          topic: string;
        };
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"];
          category?: Database["public"]["Enums"]["game_category"];
          created_at?: string;
          difficulty?: number;
          id?: string;
          payload?: Json;
          topic?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          gemini_api_key: string | null;
          gemini_model: string | null;
          id: number;
          image_api_key: string | null;
          image_api_provider: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          gemini_api_key?: string | null;
          gemini_model?: string | null;
          id?: number;
          image_api_key?: string | null;
          image_api_provider?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          gemini_api_key?: string | null;
          gemini_model?: string | null;
          id?: number;
          image_api_key?: string | null;
          image_api_provider?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      badges_earned: {
        Row: {
          badge_key: string;
          child_id: string;
          earned_at: string;
          id: string;
        };
        Insert: {
          badge_key: string;
          child_id: string;
          earned_at?: string;
          id?: string;
        };
        Update: {
          badge_key?: string;
          child_id?: string;
          earned_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badges_earned_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      child_progress: {
        Row: {
          child_id: string;
          current_streak: number;
          last_active_date: string | null;
          level: number;
          longest_streak: number;
          streak_freeze_available: boolean;
          total_games_played: number;
          updated_at: string;
          xp: number;
        };
        Insert: {
          child_id: string;
          current_streak?: number;
          last_active_date?: string | null;
          level?: number;
          longest_streak?: number;
          streak_freeze_available?: boolean;
          total_games_played?: number;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          child_id?: string;
          current_streak?: number;
          last_active_date?: string | null;
          level?: number;
          longest_streak?: number;
          streak_freeze_available?: boolean;
          total_games_played?: number;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "child_progress_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: true;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      children: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"];
          allowed_hour_end: number;
          allowed_hour_start: number;
          avatar: string;
          created_at: string;
          daily_limit_min: number;
          fav_topics: string[];
          gender: string | null;
          id: string;
          islamic_content: boolean;
          language_mode: string;
          mascot: string;
          name: string;
          parent_id: string;
          theme: string;
          updated_at: string;
        };
        Insert: {
          age_group: Database["public"]["Enums"]["age_group"];
          allowed_hour_end?: number;
          allowed_hour_start?: number;
          avatar?: string;
          created_at?: string;
          daily_limit_min?: number;
          fav_topics?: string[];
          gender?: string | null;
          id?: string;
          islamic_content?: boolean;
          language_mode?: string;
          mascot?: string;
          name: string;
          parent_id: string;
          theme?: string;
          updated_at?: string;
        };
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"];
          allowed_hour_end?: number;
          allowed_hour_start?: number;
          avatar?: string;
          created_at?: string;
          daily_limit_min?: number;
          fav_topics?: string[];
          gender?: string | null;
          id?: string;
          islamic_content?: boolean;
          language_mode?: string;
          mascot?: string;
          name?: string;
          parent_id?: string;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_challenges: {
        Row: {
          category: Database["public"]["Enums"]["game_category"];
          challenge_key: string;
          child_id: string;
          completed: boolean;
          completed_at: string | null;
          date: string;
          id: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["game_category"];
          challenge_key: string;
          child_id: string;
          completed?: boolean;
          completed_at?: string | null;
          date?: string;
          id?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["game_category"];
          challenge_key?: string;
          child_id?: string;
          completed?: boolean;
          completed_at?: string | null;
          date?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_challenges_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sessions: {
        Row: {
          category: Database["public"]["Enums"]["game_category"];
          child_id: string;
          correct: number;
          difficulty: number;
          duration_sec: number;
          id: string;
          played_at: string;
          stars: number;
          topic: string;
          total: number;
          xp_earned: number;
        };
        Insert: {
          category: Database["public"]["Enums"]["game_category"];
          child_id: string;
          correct?: number;
          difficulty?: number;
          duration_sec?: number;
          id?: string;
          played_at?: string;
          stars?: number;
          topic: string;
          total?: number;
          xp_earned?: number;
        };
        Update: {
          category?: Database["public"]["Enums"]["game_category"];
          child_id?: string;
          correct?: number;
          difficulty?: number;
          duration_sec?: number;
          id?: string;
          played_at?: string;
          stars?: number;
          topic?: string;
          total?: number;
          xp_earned?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_sessions_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      pro_waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          source: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          source?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          source?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          pin_hash: string | null;
          plan: Database["public"]["Enums"]["subscription_plan"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          pin_hash?: string | null;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          pin_hash?: string | null;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          updated_at?: string;
        };
        Relationships: [];
      };
      screen_time_logs: {
        Row: {
          child_id: string;
          created_at: string;
          date: string;
          duration_sec: number;
          id: string;
        };
        Insert: {
          child_id: string;
          created_at?: string;
          date?: string;
          duration_sec?: number;
          id?: string;
        };
        Update: {
          child_id?: string;
          created_at?: string;
          date?: string;
          duration_sec?: number;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "screen_time_logs_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      age_group: "toddler" | "kindergarten" | "elementary_low" | "elementary_high";
      app_role: "user" | "admin";
      game_category: "math" | "reading" | "science" | "creative" | "english" | "music" | "islamic";
      subscription_plan: "free" | "pro" | "pro_yearly";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      age_group: ["toddler", "kindergarten", "elementary_low", "elementary_high"],
      app_role: ["user", "admin"],
      game_category: ["math", "reading", "science", "creative", "english", "music", "islamic"],
      subscription_plan: ["free", "pro", "pro_yearly"],
    },
  },
} as const;
