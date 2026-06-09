export type KartTyp = 'basic' | 'cloze'
export type KartStatus = 'neu' | 'reviewed' | 'exportiert' | 'verworfen'
// FSRS states: 0=New, 1=Learning, 2=Review, 3=Relearning
export type FsrsState = 0 | 1 | 2 | 3

export interface Kurs {
  id: number
  name: string
  created_at: string
}

export interface Thema {
  id: number
  kurs_id: number
  name: string
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

export interface PrescanResult {
  thema: string
  seitenanzahl: number
  textdichte: 'gering' | 'mittel' | 'hoch'
  komplexitaet: 'gering' | 'mittel' | 'hoch'
  sprache: string
  empfehlung: {
    lod: string
    kartenmenge: number
    begruendung: string
  }
  batches: PrescanBatch[]
  hatProfil: boolean
}

export type Database = {
  public: {
    Tables: {
      kurs: {
        Row: Kurs
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
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
