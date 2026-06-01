/**
 * Hand-maintained Database types mirroring /supabase/migrations.
 *
 * Keep in sync with the SQL. (You can later regenerate this with the Supabase
 * CLI `supabase gen types typescript`, but hand-writing keeps v1 dependency-
 * free.)
 */

export type ArtistStatus = "active" | "prerelease";
export type TxType = "buy" | "sell";
export type FriendStatus = "pending" | "accepted";

export type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  coin_balance: number;
  created_at: string;
};

export type Artist = {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  genre: string | null;
  base_price: number;
  k_coefficient: number;
  shares_outstanding: number;
  latest_monthly_listeners: number | null;
  status: ArtistStatus;
  created_at: string;
};

export type Holding = {
  id: string;
  user_id: string;
  artist_id: string;
  shares: number;
  avg_cost: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  artist_id: string;
  type: TxType;
  shares: number;
  price_per_share: number;
  gross: number;
  fee: number;
  created_at: string;
};

export type PriceHistory = {
  id: string;
  artist_id: string;
  price: number;
  captured_at: string;
};

export type ListenerSnapshot = {
  id: string;
  artist_id: string;
  monthly_listeners: number;
  captured_at: string;
};

export type Settlement = {
  id: string;
  run_at: string;
  notes: string | null;
};

export type SettlementResult = {
  id: string;
  settlement_id: string;
  artist_id: string;
  prev_listeners: number | null;
  new_listeners: number;
  growth_pct: number | null;
  base_price_before: number;
  base_price_after: number;
};

export type PortfolioSnapshot = {
  id: string;
  user_id: string;
  total_value: number;
  captured_at: string;
};

export type Friendship = {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendStatus;
  created_at: string;
};

/** Shape one table so it satisfies supabase-js's GenericTable contract. */
type Tbl<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

/** Minimal Database shape so the typed Supabase client has table awareness. */
export type Database = {
  public: {
    Tables: {
      profiles: Tbl<Profile>;
      artists: Tbl<Artist>;
      holdings: Tbl<Holding>;
      transactions: Tbl<Transaction>;
      price_history: Tbl<PriceHistory>;
      listener_snapshots: Tbl<ListenerSnapshot>;
      settlements: Tbl<Settlement>;
      settlement_results: Tbl<SettlementResult>;
      portfolio_snapshots: Tbl<PortfolioSnapshot>;
      friendships: Tbl<Friendship>;
    };
    Views: Record<string, never>;
    Functions: {
      apply_trade: {
        Args: {
          p_user: string;
          p_artist: string;
          p_type: TxType;
          p_shares: number;
          p_price_per_share: number;
          p_gross: number;
          p_fee: number;
          p_total: number;
          p_expected_s: number;
          p_new_s: number;
          p_spot_after: number;
        };
        Returns: number;
      };
      run_settlement: {
        Args: { p_notes: string | null; p_entries: unknown };
        Returns: string;
      };
    };
    Enums: {
      artist_status: ArtistStatus;
      tx_type: TxType;
      friend_status: FriendStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
