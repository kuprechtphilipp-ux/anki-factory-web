import type { Plan } from '@/lib/types'

export const PLAN_ORDER: Plan[] = ['basic', 'basic_plus', 'premium', 'ultra']

export const PLAN_CREDITS: Record<Plan, number> = {
  basic: 50,
  basic_plus: 100,
  premium: 300,
  ultra: 500,
}
