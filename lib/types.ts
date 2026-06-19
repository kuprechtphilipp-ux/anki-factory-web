// Wird gefeuert, wenn Kurse/Themen angelegt, umbenannt oder gelöscht werden,
// damit Sidebar und Hauptbereich synchron bleiben.
export const KURSE_UPDATED_EVENT = 'kurse-updated'

// Wird gefeuert, wenn der Hauptbereich den User zum "Thema anlegen"-Eingabefeld
// des angegebenen Kurses in der Sidebar führen will (öffnet ggf. die Sidebar
// auf Mobile, klappt den Kurs auf und zeigt das Eingabefeld).
export const FOCUS_NEW_THEMA_EVENT = 'focus-new-thema'
export interface FocusNewThemaDetail {
  kursId: number
}

export type KartTyp = 'basic' | 'cloze'
export type KartStatus = 'neu' | 'reviewed' | 'exportiert' | 'verworfen'
// FSRS states: 0=New, 1=Learning, 2=Review, 3=Relearning
export type FsrsState = 0 | 1 | 2 | 3

export type Plan = 'basic' | 'basic_plus' | 'premium' | 'ultra'

export interface Kurs {
  id: number
  name: string
  user_id: string | null
  notiz_kontext: string | null
  created_at: string
}

export type Lernfenster = 'gestresst' | 'normal' | 'entspannt'

export const LERNFENSTER_OPTIONS: { value: Lernfenster; label: string }[] = [
  { value: 'gestresst', label: 'Sehr gestresst' },
  { value: 'normal', label: 'Normal' },
  { value: 'entspannt', label: 'Entspannt' },
]

export interface Profile {
  id: string
  email: string | null
  plan: Plan
  base_plan: Plan
  plan_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_cancel_at: string | null
  credits_total: number
  credits_used: number
  credits_reset_at: string
  is_admin: boolean
  is_blocked: boolean
  onboarding_completed: boolean
  fachbereich: string | null
  lernziel: string | null
  lernfenster: Lernfenster | null
  created_at: string
}

export interface CramoLernkontext {
  themaName?: string
  kursName?: string
  karteFrage?: string
  karteAntwort?: string
  karteKontext?: string
}

export interface InviteCode {
  id: number
  code: string
  plan: Exclude<Plan, 'basic'>
  credits: number
  duration_months: number | null
  used_by: string | null
  used_at: string | null
  created_at: string
  created_by: string | null
}

export interface Thema {
  id: number
  kurs_id: number
  name: string
  created_at: string
}

export interface KursAltklausur {
  id: number
  kurs_id: number
  dateiname: string
  created_at: string
}

export interface Karte {
  id: number
  guid: string
  thema_id: number
  frage: string
  antwort: string
  kontext: string | null
  slide_nr: number | null
  tags: string[]
  typ: KartTyp
  cloze_text: string | null
  image_b64: string | null
  status: KartStatus
  fsrs_due: string
  fsrs_stability: number
  fsrs_difficulty: number
  fsrs_elapsed_days: number
  fsrs_scheduled_days: number
  fsrs_reps: number
  fsrs_lapses: number
  fsrs_state: FsrsState
  fsrs_last_review: string | null
  created_at: string
}

export interface GenerierProfil {
  id: number
  bevorzugter_detailgrad: string
  bevorzugte_kartenmenge: number
  bevorzugter_kartentyp: string
  feedback_count: number
  notizen: string[]
  last_updated: string
}

export interface DeckFeedback {
  id?: number
  thema_id?: number | null
  rating?: number | null
  detailgrad_feedback?: string | null
  kartenmenge_feedback?: string | null
  kartentyp_feedback?: string | null
  freitext?: string | null
  karten_count?: number | null
  lod_used?: string | null
  created_at?: string
}

export interface PrescanBatch {
  von: number
  bis: number
  label: string
  karten: number
  schluesselkonzepte: string[]
}

export interface PrescanStrategie {
  kern_konzepte: string[]
  lernreihenfolge: string
  was_weglassen: string
}

export interface PrescanResult {
  thema: string
  fachtyp: 'definitionen' | 'konzepte' | 'formeln'
  fachtyp_label: string
  seitenanzahl: number
  textdichte: 'gering' | 'mittel' | 'hoch'
  komplexitaet: 'gering' | 'mittel' | 'hoch'
  sprache: string
  strategie?: PrescanStrategie
  empfehlung: {
    kartenmenge: number
    cloze_anteil: number
    kartentyp_begruendung: string
    begruendung: string
  }
  batches: PrescanBatch[]
  hatProfil: boolean
}

export interface QuizFrage {
  frage: string
  optionen: string[]
  richtig: number
  erklaerung: string
  karte_id: number
}

export interface AktivitaetTag {
  date: string
  studied: boolean
}

export interface KursThemaStats {
  name: string
  id: number
  due: number
  total: number
  neu: number
  retention: number
  mature: number
  gelernt: number
  last_drill: number | null
  last_quiz: number | null
  last_schriftlich: number | null
}

export interface KursStatistik {
  kurs_id: number
  due_heute: number
  due_7_tage: number[]
  total_karten: number
  avg_retention: number
  themen: KursThemaStats[]
}

export interface ThemaBreakdownRow {
  kurs_name: string
  thema_name: string
  thema_id: number
  due: number
  neu: number
  total: number
  retention: number
  last_drill: number | null
  last_quiz: number | null
  last_schriftlich: number | null
}

export interface SessionTrendPoint {
  score_pct: number
  created_at: string
}

export interface StatsData {
  streak: number
  bestStreak: number
  totalReviews: number
  todayReviews: number
  retentionRate: number
  heatmap: { date: string; count: number }[]
  totalCards: number
  dueNow: number
  weekTotal: number
  avgCardsPerDay: number
  themenBreakdown: ThemaBreakdownRow[]
  forecast30: number[]
  performanceTrends: {
    drill: SessionTrendPoint[]
    quiz: SessionTrendPoint[]
    schriftlich: SessionTrendPoint[]
  }
  fsrsVerteilung: { new: number; learning: number; review: number; relearning: number }
  typVerteilung: { basic: number; cloze: number }
}

export type Database = {
  public: {
    Tables: {
      kurs: {
        Row: Kurs
        Insert: {
          id?: number
          name: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: {
          id: string
          email?: string | null
          plan?: Plan
          base_plan?: Plan
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_cancel_at?: string | null
          credits_total?: number
          credits_used?: number
          credits_reset_at?: string
          is_admin?: boolean
          is_blocked?: boolean
          onboarding_completed?: boolean
          fachbereich?: string | null
          lernziel?: string | null
          lernfenster?: Lernfenster | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          plan?: Plan
          base_plan?: Plan
          plan_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_cancel_at?: string | null
          credits_total?: number
          credits_used?: number
          credits_reset_at?: string
          is_admin?: boolean
          is_blocked?: boolean
          onboarding_completed?: boolean
          fachbereich?: string | null
          lernziel?: string | null
          lernfenster?: Lernfenster | null
          created_at?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: InviteCode
        Insert: {
          id?: number
          code: string
          plan: Exclude<Plan, 'basic'>
          credits: number
          duration_months?: number | null
          used_by?: string | null
          used_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: number
          code?: string
          plan?: Exclude<Plan, 'basic'>
          credits?: number
          duration_months?: number | null
          used_by?: string | null
          used_at?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      thema: {
        Row: Thema
        Insert: {
          id?: number
          kurs_id: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          kurs_id?: number
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      karte: {
        Row: Karte
        Insert: {
          id?: number
          guid?: string
          thema_id: number
          frage?: string
          antwort?: string
          kontext?: string | null
          slide_nr?: number | null
          tags?: string[]
          typ?: KartTyp
          cloze_text?: string | null
          image_b64?: string | null
          status?: KartStatus
          fsrs_due?: string
          fsrs_stability?: number
          fsrs_difficulty?: number
          fsrs_elapsed_days?: number
          fsrs_scheduled_days?: number
          fsrs_reps?: number
          fsrs_lapses?: number
          fsrs_state?: FsrsState
          fsrs_last_review?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          guid?: string
          thema_id?: number
          frage?: string
          antwort?: string
          kontext?: string | null
          slide_nr?: number | null
          tags?: string[]
          typ?: KartTyp
          cloze_text?: string | null
          image_b64?: string | null
          status?: KartStatus
          fsrs_due?: string
          fsrs_stability?: number
          fsrs_difficulty?: number
          fsrs_elapsed_days?: number
          fsrs_scheduled_days?: number
          fsrs_reps?: number
          fsrs_lapses?: number
          fsrs_state?: FsrsState
          fsrs_last_review?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
