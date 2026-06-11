import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/lib/types'

export const PLAN_ORDER: Plan[] = ['basic', 'basic_plus', 'premium', 'ultra']

export interface PlanConfigEntry {
  plan: Plan
  credits: number
  price_chf: number | null
  description: string
}

export type PlanConfig = Record<Plan, PlanConfigEntry>

// Defaults/Fallback, falls plan_config (DB) nicht geladen werden kann
export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  basic: { plan: 'basic', credits: 50, price_chf: null, description: 'Zum Ausprobieren' },
  basic_plus: { plan: 'basic_plus', credits: 300, price_chf: 4.90, description: 'Für einen Kurs' },
  premium: { plan: 'premium', credits: 600, price_chf: 9.90, description: 'Für mehrere Kurse parallel' },
  ultra: { plan: 'ultra', credits: 1100, price_chf: 16.90, description: 'Für Power-User — Zugang über Einladungscode' },
}

export function formatPlanPrice(priceChf: number | null): string {
  return priceChf === null ? 'Kostenlos' : `CHF ${priceChf.toFixed(2)} / Monat`
}

// Lädt die aktuelle Plan-Konfiguration aus plan_config, fällt bei Fehler/leerer
// Tabelle auf DEFAULT_PLAN_CONFIG zurück.
export async function getPlanConfig(supabase: SupabaseClient): Promise<PlanConfig> {
  const { data, error } = await supabase
    .from('plan_config')
    .select('plan, credits, price_chf, description')

  if (error || !data || data.length === 0) return DEFAULT_PLAN_CONFIG

  const config = { ...DEFAULT_PLAN_CONFIG }
  for (const row of data as PlanConfigEntry[]) {
    config[row.plan] = {
      plan: row.plan,
      credits: row.credits,
      price_chf: row.price_chf === null ? null : Number(row.price_chf),
      description: row.description,
    }
  }
  return config
}
