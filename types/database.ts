export type ChoreStatus =
  | "unassigned"
  | "bidding_open"
  | "assigned"
  | "pending_approval"
  | "completed";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  created_at: string;
};

export type Chore = {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  base_points: number;
  status: ChoreStatus;
  assigned_to: string | null;
  final_points: number | null;
  created_at: string;
};

export type Bid = {
  id: string;
  chore_id: string;
  player_id: string;
  bid_amount: number;
  created_at: string;
};

export type ChoreWithBid = Chore & {
  bids: Array<Pick<Bid, "bid_amount" | "player_id">>;
};

export type ActiveChore = Chore & {
  profiles: Pick<Profile, "display_name" | "avatar_url"> | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          total_points?: number;
          created_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      chores: {
        Row: Chore;
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          frequency: string;
          base_points: number;
          status?: ChoreStatus;
          assigned_to?: string | null;
          final_points?: number | null;
          created_at?: string;
        };
        Update: Partial<Omit<Chore, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "chores_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bids: {
        Row: Bid;
        Insert: {
          id?: string;
          chore_id: string;
          player_id: string;
          bid_amount: number;
          created_at?: string;
        };
        Update: Partial<Omit<Bid, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "bids_chore_id_fkey";
            columns: ["chore_id"];
            isOneToOne: false;
            referencedRelation: "chores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      close_chore_bidding: {
        Args: { chore_uuid: string };
        Returns: Chore;
      };
      approve_chore: {
        Args: { chore_uuid: string };
        Returns: Chore;
      };
    };
  };
};
