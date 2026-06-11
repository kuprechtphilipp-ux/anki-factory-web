import type { Plan } from '@/lib/types'

export const PLAN_ORDER: Plan[] = ['basic', 'basic_plus', 'premium', 'ultra']

export const PLAN_CREDITS: Record<Plan, number> = {
  basic: 50,
  basic_plus: 100,
  premium: 300,
  ultra: 500,
}

export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  basic: 'Zum Ausprobieren',
  basic_plus: 'Für einen Kurs',
  premium: 'Für mehrere Kurse parallel',
  ultra: 'Für Power-User — nur auf Einladung',
}

export const PLAN_PRICES: Record<Plan, string> = {
  basic: 'Kostenlos',
  basic_plus: 'CHF 4.90 / Monat',
  premium: 'CHF 9.90 / Monat',
  ultra: 'Auf Anfrage',
}
