// Mirrors server/src/db/schema.ts and the custom migrations in server/drizzle/.
// Replace with the generated file once the Supabase CLI is linked:  pnpm --filter @matchpoynt/server db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
}

type SessionRow = {
  id: string
  owner_id: string
  sport_id: string
  scoring: Json
  rules: Json
  matchmaking: string
  status: string
  version: number
  public_slug: string | null
  check_in_slug: string | null
  club_id: string | null
  title: string | null
  cover_path: string | null
  tournament: Json | null
  tournament_slug: string | null
  created_at: string
  updated_at: string
  ended_at: string | null
}

type ClubBadgeRow = {
  id: string
  club_id: string
  name: string
  description: string | null
  scope: string
  conditions: Json
  icon_path: string | null
  icon_source: string | null
  created_at: string
  updated_at: string
}

type ClubRow = {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_path: string | null
  cover_path: string | null
  avatar_position: Json | null
  cover_position: Json | null
  theme: Json | null
  created_at: string
  updated_at: string
}

type ClubMemberRow = {
  id: string
  club_id: string
  name: string
  contact: string | null
  email: string | null
  user_id: string | null
  created_at: string
}

type ClubInviteRow = {
  id: string
  club_id: string
  member_id: string
  email: string
  token: string
  status: string
  created_at: string
  accepted_at: string | null
}

type ClubMemberSportRow = {
  member_id: string
  sport_id: string
  tier_id: string
}

type PlannedSessionRow = {
  id: string
  club_id: string
  sport_id: string
  title: string
  scheduled_for: string | null
  scoring: Json
  rules: Json
  matchmaking: string
  courts: Json
  member_ids: string[]
  cover_path: string | null
  created_at: string
  updated_at: string
}

type CourtRow = {
  id: string
  session_id: string
  label: string
  position: number
  status: string
  lineup: Json
  tournament: boolean
}

type PlayerRow = {
  id: string
  session_id: string
  name: string
  tier_id: string
  games_played: number
  rotation: number
  queued_at: string
  status: string
  active: boolean
  checked_in_at: string | null
}

type MatchRow = {
  id: string
  session_id: string
  sport_id: string
  court_id: string | null
  court_label: string
  side_a: string[]
  side_b: string[]
  started_at: string
  finished_at: string | null
  games: Json
  winner: string | null
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  phone: string | null
  city: string | null
  role: string | null
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

type PlayerSportRow = {
  user_id: string
  sport_id: string
  tier_id: string
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      sessions: Table<SessionRow, 'id' | 'sport_id' | 'scoring' | 'rules' | 'matchmaking'>
      session_courts: Table<CourtRow, 'id' | 'session_id' | 'label' | 'position' | 'status'>
      session_players: Table<PlayerRow, 'id' | 'session_id' | 'name' | 'tier_id' | 'queued_at' | 'status'>
      matches: Table<MatchRow, 'id' | 'session_id' | 'sport_id' | 'court_label' | 'side_a' | 'side_b' | 'started_at'>
      profiles: Table<ProfileRow, 'id'>
      player_sports: Table<PlayerSportRow, 'sport_id' | 'tier_id'>
      clubs: Table<ClubRow, 'id' | 'name'>
      club_members: Table<ClubMemberRow, 'id' | 'club_id' | 'name'>
      club_member_sports: Table<ClubMemberSportRow, 'member_id' | 'sport_id' | 'tier_id'>
      club_invites: Table<ClubInviteRow, 'id' | 'club_id' | 'member_id' | 'email' | 'token'>
      club_badges: Table<ClubBadgeRow, 'id' | 'club_id' | 'name' | 'scope' | 'conditions'>
      planned_sessions: Table<PlannedSessionRow, 'id' | 'club_id' | 'sport_id' | 'title' | 'scoring' | 'rules' | 'matchmaking'>
    }
    Views: { [_ in never]: never }
    Functions: {
      save_session: {
        Args: { p_session: Json; p_courts: Json; p_players: Json; p_matches: Json; p_expected_version: number | null }
        Returns: number
      }
      restart_session: {
        Args: { p_session: Json; p_courts: Json; p_players: Json; p_matches: Json; p_expected_version: number }
        Returns: number
      }
      cancel_match: {
        Args: { p_session: Json; p_courts: Json; p_players: Json; p_matches: Json; p_expected_version: number; p_match_id: string }
        Returns: number
      }
      end_session: {
        Args: { p_session_id: string; p_expected_version: number }
        Returns: undefined
      }
      public_leaderboard: { Args: { p_slug: string }; Returns: Json }
      public_club_history: { Args: { p_slug: string }; Returns: Json }
      public_check_in_roster: { Args: { p_slug: string }; Returns: Json }
      public_check_in: { Args: { p_slug: string; p_player_id: string }; Returns: Json }
      public_tournament: { Args: { p_slug: string }; Returns: Json }
      save_profile: { Args: { p_profile: Json; p_sports: Json }; Returns: undefined }
      save_club_member: { Args: { p_member: Json; p_sports: Json }; Returns: undefined }
      club_invite: { Args: { p_token: string }; Returns: Json }
      accept_club_invite: { Args: { p_token: string }; Returns: string }
      start_planned_session: {
        Args: { p_plan_id: string; p_session: Json; p_courts: Json; p_players: Json; p_matches: Json }
        Returns: number
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
