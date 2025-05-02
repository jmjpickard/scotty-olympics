// Generated types for Supabase database
// This is a placeholder - in a real setup, you'd generate this from Supabase
// using their CLI with: supabase gen types typescript --project-id <your-project-id>

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          order: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          order?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          order?: number | null;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          user_id: string | null;
          name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      scores: {
        Row: {
          id: string;
          participant_id: string;
          event_id: string;
          rank: number;
          points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          event_id: string;
          rank: number;
          points: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          event_id?: string;
          rank?: number;
          points?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
