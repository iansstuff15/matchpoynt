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
  fee: Json | null
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

type ClubAnnouncementRow = {
  id: string
  club_id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
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
  handle: string | null
  social_links: Json
  join_approval: string
  welcome_message: string | null
  welcome_links: Json
  description: string | null
  avatar_path: string | null
  cover_path: string | null
  avatar_position: Json | null
  cover_position: Json | null
  theme: Json | null
  saved_themes: Json
  payment_qrs: Json
  fee: Json | null
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
  role: string
  created_at: string
}

type ClubFeedbackFormRow = {
  club_id: string
  title: string
  intro: string
  enabled: boolean
  questions: Json
  updated_at: string
}

type ClubFeedbackResponseRow = {
  id: string
  club_id: string
  session_id: string
  user_id: string
  member_name: string
  answers: Json
  created_at: string
}

type FriendshipRow = {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  created_at: string
  accepted_at: string | null
}

type ClubInviteRow = {
  id: string
  club_id: string
  member_id: string
  email: string | null
  user_id: string | null
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
  fee: Json | null
  cover_path: string | null
  sign_up: string
  max_players: number | null
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
  break_since: string | null
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

type InvoiceRow = {
  id: string
  session_id: string
  player_id: string
  name: string
  games: number
  amount: number
  currency: string
  paid_at: string | null
  created_at: string
  payments: Json
}

type BillerRow = {
  id: string
  club_id: string
  name: string
  contact: string | null
  notes: string | null
  created_at: string
}

type ExpenseRow = {
  id: string
  club_id: string
  biller_id: string | null
  session_id: string | null
  description: string
  amount: number
  currency: string
  spent_on: string
  notes: string | null
  created_at: string
}

type ClubInvoiceRow = {
  id: string
  club_id: string
  title: string
  notes: string | null
  currency: string
  issued_on: string
  amount: number
  split: string
  created_at: string
}

type ClubInvoicePayerRow = {
  id: string
  invoice_id: string
  member_id: string | null
  name: string
  amount: number
  position: number
  paid_at: string | null
  payments: Json
}

type JoinRequestRow = {
  id: string
  club_id: string
  user_id: string
  name: string
  tiers: Json
  avatar_path: string | null
  status: string
  created_at: string
  decided_at: string | null
}

type SessionRequestRow = {
  id: string
  club_id: string
  member_id: string
  plan_id: string | null
  session_id: string | null
  status: string
  created_at: string
  decided_at: string | null
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  username: string | null
  email: string | null
  avatar_path: string | null
  avatar_position: Json | null
  social_links: Json
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
      club_billers: Table<BillerRow, 'id' | 'club_id' | 'name'>
      club_expenses: Table<ExpenseRow, 'id' | 'club_id' | 'description' | 'amount' | 'currency' | 'spent_on'>
      club_invoices: Table<ClubInvoiceRow, 'id' | 'club_id' | 'title' | 'currency' | 'issued_on' | 'amount' | 'split'>
      club_invoice_payers: Table<ClubInvoicePayerRow, 'id' | 'invoice_id' | 'name' | 'amount' | 'position'>
      club_join_requests: Table<JoinRequestRow, 'id' | 'club_id' | 'user_id' | 'name'>
      session_join_requests: Table<SessionRequestRow, 'id' | 'club_id' | 'member_id'>
      session_invoices: Table<InvoiceRow, 'id' | 'session_id' | 'player_id' | 'name' | 'games' | 'amount' | 'currency'>
      matches: Table<MatchRow, 'id' | 'session_id' | 'sport_id' | 'court_label' | 'side_a' | 'side_b' | 'started_at'>
      profiles: Table<ProfileRow, 'id'>
      player_sports: Table<PlayerSportRow, 'sport_id' | 'tier_id'>
      clubs: Table<ClubRow, 'id' | 'name'>
      club_members: Table<ClubMemberRow, 'id' | 'club_id' | 'name'>
      club_member_sports: Table<ClubMemberSportRow, 'member_id' | 'sport_id' | 'tier_id'>
      club_invites: Table<ClubInviteRow, 'id' | 'club_id' | 'member_id' | 'token'>
      club_badges: Table<ClubBadgeRow, 'id' | 'club_id' | 'name' | 'scope' | 'conditions'>
      planned_sessions: Table<PlannedSessionRow, 'id' | 'club_id' | 'sport_id' | 'title' | 'scoring' | 'rules' | 'matchmaking'>
      club_feedback_forms: Table<ClubFeedbackFormRow, 'club_id' | 'title'>
      club_announcements: Table<ClubAnnouncementRow, 'id' | 'club_id' | 'title'>
      club_feedback_responses: Table<ClubFeedbackResponseRow, 'id' | 'club_id' | 'session_id' | 'user_id' | 'member_name' | 'answers'>
      friendships: Table<FriendshipRow, 'id' | 'addressee_id'>
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
        Args: { p_session_id: string; p_expected_version: number; p_invoices?: Json }
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
      create_club_invoice: { Args: { p_invoice: Json; p_payers: Json }; Returns: undefined }
      club_handle_taken: { Args: { p_handle: string; p_club_id: string | null }; Returns: boolean }
      username_taken: { Args: { p_username: string; p_user_id: string | null }; Returns: boolean }
      profile_card: { Args: { p_user_id: string }; Returns: Json }
      account_for_username: { Args: { p_username: string }; Returns: string | null }
      public_session_club: { Args: { p_slug: string }; Returns: Json }
      player_ended_session: { Args: { p_session_id: string }; Returns: Json }
      my_club_history: { Args: Record<string, never>; Returns: Json }
      search_people: { Args: { p_query: string; p_club_id: string | null }; Returns: Json }
      club_member_cards: { Args: { p_club_id: string }; Returns: Json }
      club_directory: { Args: { p_query: string; p_offset: number; p_limit: number }; Returns: Json }
      my_member_clubs: { Args: Record<string, never>; Returns: Json }
      club_player_page: { Args: { p_handle: string }; Returns: Json }
      club_join_card: { Args: { p_handle: string }; Returns: Json }
      request_join_club: { Args: { p_club_id: string }; Returns: string }
      request_join_session: { Args: { p_club_id: string; p_plan_id: string | null; p_session_id: string | null }; Returns: undefined }
      my_club_invites: { Args: Record<string, never>; Returns: Json }
      respond_club_invite: { Args: { p_invite_id: string; p_accept: boolean }; Returns: string }
      club_team: { Args: { p_club_id: string }; Returns: Json }
      accept_friend_request: { Args: { p_id: string }; Returns: undefined }
      my_friends: { Args: Record<string, never>; Returns: Json }
      person_profile: { Args: { p_username: string }; Returns: Json }
      set_player_break: { Args: { p_session_id: string; p_on: boolean }; Returns: undefined }
      sign_up_for_plan: { Args: { p_club_id: string; p_plan_id: string; p_going: boolean }; Returns: undefined }
      plan_attendees: { Args: { p_club_id: string; p_plan_id: string }; Returns: Json }
      my_upcoming_plans: { Args: { p_hours: number }; Returns: Json }
      club_announcements_for: { Args: { p_club_id: string; p_limit: number }; Returns: Json }
      club_feedback_prompts: { Args: { p_club_id: string; p_window_days: number }; Returns: Json }
      submit_club_feedback: { Args: { p_club_id: string; p_session_id: string; p_answers: Json; p_window_days: number }; Returns: undefined }
      player_live_sessions: { Args: Record<string, never>; Returns: Json }
      player_live_session: { Args: { p_session_id: string }; Returns: Json }
      player_check_in: { Args: { p_session_id: string }; Returns: string }
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
